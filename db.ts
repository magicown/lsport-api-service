/**
 * SQLite 데이터베이스 연결 및 스키마 초기화
 * WAL 모드, better-sqlite3 사용
 */

import Database from 'better-sqlite3';
import { hashSync } from 'bcryptjs';
import path from 'path';
import fs from 'fs';
import { createLogger } from '$lib/logger';

const log = createLogger('db');

const DB_DIR = process.env.DB_DIR || '/home/matchdata/data';
const DB_PATH = path.join(DB_DIR, process.env.DB_NAME || 'matchdata.db');

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
  // WAL 체크포인트 자동 실행 임계값 (기본 1000페이지 → 4000으로 조정)
  db.pragma('wal_autocheckpoint = 4000');

  initSchema();
  migrateSchema();
  seedAdmin();

  log.info('Database initialized', { path: DB_PATH });

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
      expires_at  INTEGER DEFAULT NULL,
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
    log.info('Migration: api_keys.key_full column added');
  }

  // api_keys.expires_at 컬럼 추가 (만료 기능)
  try {
    db.prepare("SELECT expires_at FROM api_keys LIMIT 1").get();
  } catch {
    db.exec("ALTER TABLE api_keys ADD COLUMN expires_at INTEGER DEFAULT NULL");
    log.info('Migration: api_keys.expires_at column added');
  }

  // key_full 평문 삭제 (보안: DB 유출 시 키 노출 방지)
  try {
    const keysWithFull = db.prepare("SELECT COUNT(*) as cnt FROM api_keys WHERE key_full != ''").get() as any;
    if (keysWithFull?.cnt > 0) {
      db.exec("UPDATE api_keys SET key_full = '' WHERE key_full != ''");
      log.warn('Migration: Cleared plaintext API keys from key_full column', { count: keysWithFull.cnt });
    }
  } catch {
    // 무시
  }
}

function seedAdmin() {
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  if (!existing) {
    const adminPassword = process.env.ADMIN_SEED_PASSWORD || 'CHANGE_ME_ON_FIRST_RUN';
    if (!process.env.ADMIN_SEED_PASSWORD) {
      log.warn('ADMIN_SEED_PASSWORD not set. Using default password for admin account.');
    }
    const hash = hashSync(adminPassword, 12);
    db.prepare(`
      INSERT INTO users (username, email, password_hash, company, plan, status, role)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('admin', 'admin@matchdata.net', hash, 'MatchData', 'enterprise', 'active', 'admin');
    log.info('Admin seed completed');
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
    try { cleanupOldData(); } catch (e) { log.error('Cleanup error', { error: String(e) }); }
  }, 10_000);
  // 6시간마다 반복
  setInterval(() => {
    try { cleanupOldData(); } catch (e) { log.error('Cleanup error', { error: String(e) }); }
  }, 6 * 60 * 60 * 1000);
  log.info('Data cleanup scheduler started (6h interval)');
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

  // 만료된 API 키 비활성화
  const expired = dbRun(
    'UPDATE api_keys SET is_active = 0 WHERE expires_at IS NOT NULL AND expires_at < ? AND is_active = 1',
    now
  );
  if (expired.changes > 0) {
    log.info('Expired API keys deactivated', { count: expired.changes });
  }
}
