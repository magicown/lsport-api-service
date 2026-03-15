/**
 * SQLite 데이터베이스 연결 및 스키마 초기화
 * WAL 모드, better-sqlite3 사용
 */

import Database from 'better-sqlite3';
import { hashSync } from 'bcryptjs';
import path from 'path';
import fs from 'fs';

const DB_DIR = '/home/matchdata/data';
const DB_PATH = path.join(DB_DIR, 'matchdata.db');

let db: Database.Database;

export function getDb(): Database.Database {
  if (db) return db;

  // 디렉토리 생성
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  db = new Database(DB_PATH);

  // PRAGMA 설정
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
  db.pragma('foreign_keys = ON');

  initSchema();
  migrateSchema();
  seedAdmin();

  return db;
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      username      TEXT NOT NULL UNIQUE,
      email         TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      company       TEXT NOT NULL DEFAULT '',
      plan          TEXT NOT NULL DEFAULT 'free'
        CHECK(plan IN ('free','standard','premium','enterprise')),
      status        TEXT NOT NULL DEFAULT 'pending'
        CHECK(status IN ('pending','active','suspended','rejected')),
      role          TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user','admin')),
      max_keys      INTEGER NOT NULL DEFAULT 2,
      memo          TEXT DEFAULT '',
      approved_at   INTEGER,
      created_at    INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
      updated_at    INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
    );

    CREATE TABLE IF NOT EXISTS api_keys (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      key_prefix  TEXT NOT NULL,
      key_hash    TEXT NOT NULL UNIQUE,
      key_full    TEXT NOT NULL DEFAULT '',
      label       TEXT NOT NULL DEFAULT 'Default',
      is_active   INTEGER NOT NULL DEFAULT 1,
      last_used_at INTEGER,
      created_at  INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
    );

    CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
    CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);

    CREATE TABLE IF NOT EXISTS sessions (
      id            TEXT PRIMARY KEY,
      user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      ip            TEXT DEFAULT '',
      user_agent    TEXT DEFAULT '',
      created_at    INTEGER NOT NULL,
      last_access_at INTEGER NOT NULL,
      expires_at    INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at INTEGER NOT NULL,
      revoked    INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
    );

    CREATE TABLE IF NOT EXISTS usage_records (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id   INTEGER NOT NULL,
      api_key_id INTEGER,
      endpoint  TEXT NOT NULL,
      sport     TEXT DEFAULT '',
      date      TEXT NOT NULL,
      hour      INTEGER NOT NULL,
      count     INTEGER NOT NULL DEFAULT 1,
      UNIQUE(user_id, api_key_id, endpoint, sport, date, hour)
    );

    CREATE INDEX IF NOT EXISTS idx_usage_user_date ON usage_records(user_id, date);

    CREATE TABLE IF NOT EXISTS usage_daily (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL,
      date        TEXT NOT NULL,
      total_calls INTEGER DEFAULT 0,
      prematch    INTEGER DEFAULT 0,
      inplay      INTEGER DEFAULT 0,
      special     INTEGER DEFAULT 0,
      UNIQUE(user_id, date)
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER,
      action     TEXT NOT NULL,
      detail     TEXT DEFAULT '',
      ip         TEXT DEFAULT '',
      created_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
    );

    CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id);

    CREATE TABLE IF NOT EXISTS ip_whitelist (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      ip_address  TEXT NOT NULL,
      description TEXT DEFAULT '',
      created_at  INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
    );

    CREATE INDEX IF NOT EXISTS idx_ip_whitelist_user ON ip_whitelist(user_id);
  `);
}

function migrateSchema() {
  // api_keys.key_full 컬럼 추가 (기존 DB 호환)
  try {
    db.prepare("SELECT key_full FROM api_keys LIMIT 1").get();
  } catch {
    db.exec("ALTER TABLE api_keys ADD COLUMN key_full TEXT NOT NULL DEFAULT ''");
    console.log('[DB] Migration: api_keys.key_full 컬럼 추가');
  }
}

function seedAdmin() {
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  if (!existing) {
    const adminPassword = process.env.ADMIN_SEED_PASSWORD || 'CHANGE_ME_ON_FIRST_RUN';
    if (!process.env.ADMIN_SEED_PASSWORD) {
      console.warn('[DB] ⚠️ ADMIN_SEED_PASSWORD 미설정. 기본 비밀번호로 admin 계정을 생성합니다. 운영 환경에서는 반드시 변경해주세요.');
    }
    const hash = hashSync(adminPassword, 12);
    db.prepare(`
      INSERT INTO users (username, email, password_hash, company, plan, status, role)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('admin', 'admin@matchdata.net', hash, 'MatchData', 'enterprise', 'active', 'admin');
    console.log('[DB] Admin seed 완료');
  }
}

// ── 쿼리 헬퍼 ──

export function dbGet<T = any>(sql: string, ...params: any[]): T | undefined {
  return getDb().prepare(sql).get(...params) as T | undefined;
}

export function dbAll<T = any>(sql: string, ...params: any[]): T[] {
  return getDb().prepare(sql).all(...params) as T[];
}

export function dbRun(sql: string, ...params: any[]) {
  return getDb().prepare(sql).run(...params);
}

// ── 감사 로그 ──
export function auditLog(userId: number | null, action: string, detail: any = '', ip: string = '') {
  const detailStr = typeof detail === 'string' ? detail : JSON.stringify(detail);
  dbRun(
    'INSERT INTO audit_log (user_id, action, detail, ip) VALUES (?, ?, ?, ?)',
    userId, action, detailStr, ip
  );
}

// ── 데이터 정리 (자동 스케줄: 6시간마다 + 시작 시 1회) ──
function startCleanupScheduler() {
  // 시작 후 10초 뒤 1회 실행
  setTimeout(() => {
    try { cleanupOldData(); } catch (e) { console.error('[DB] 정리 에러:', e); }
  }, 10_000);
  // 6시간마다 반복
  setInterval(() => {
    try { cleanupOldData(); } catch (e) { console.error('[DB] 정리 에러:', e); }
  }, 6 * 60 * 60 * 1000);
  console.log('[DB] 데이터 정리 스케줄러 시작 (6시간 간격)');
}
startCleanupScheduler();

export function cleanupOldData() {
  const now = Date.now();
  const sixtyDaysAgo = now - 60 * 24 * 60 * 60 * 1000;
  const ninetyDaysAgo = now - 90 * 24 * 60 * 60 * 1000;

  const sixtyDate = new Date(sixtyDaysAgo).toISOString().slice(0, 10);
  const ninetyDate = new Date(ninetyDaysAgo).toISOString().slice(0, 10);

  dbRun('DELETE FROM usage_records WHERE date < ?', sixtyDate);
  dbRun('DELETE FROM usage_daily WHERE date < ?', sixtyDate);
  dbRun('DELETE FROM audit_log WHERE created_at < ?', ninetyDaysAgo);

  // 만료된 세션/리프레시 토큰 정리
  dbRun('DELETE FROM sessions WHERE expires_at < ?', now);
  dbRun('DELETE FROM refresh_tokens WHERE expires_at < ? OR revoked = 1', now);
}
