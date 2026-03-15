/**
 * 인증 시스템 - SQLite 백엔드 (기존 함수 시그니처 완벽 유지)
 * 세션 관리, 중복 로그인 방지, 사용량 추적
 */

import { randomUUID } from 'crypto';
import { compareSync, hashSync } from 'bcryptjs';
import { dbGet, dbAll, dbRun, getDb, auditLog } from '$lib/db';
import { trackWebUsage, getWebUsageStats } from '$lib/usage-tracker';

const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24시간

// ── 인증 함수 (기존 시그니처 유지) ──

/**
 * 로그인 - 성공 시 세션 생성 및 기존 세션 무효화 (중복 로그인 방지)
 */
export function login(
  emailOrId: string,
  password: string,
  ip: string = '',
  userAgent: string = ''
): { success: boolean; sessionId?: string; error?: string; user?: { id: string; email: string; company: string; plan: string } } {
  // 이메일 또는 username으로 사용자 찾기
  const user = dbGet<any>(
    'SELECT id, username, email, password_hash, company, plan, status FROM users WHERE email = ? OR username = ?',
    emailOrId, emailOrId
  );

  // 사용자 열거 공격 방지: 동일한 에러 메시지 사용
  if (!user || !compareSync(password, user.password_hash)) {
    return { success: false, error: '이메일 또는 비밀번호가 올바르지 않습니다.' };
  }

  // 상태 체크 (통일된 메시지)
  if (user.status !== 'active') {
    return { success: false, error: '계정이 활성 상태가 아닙니다. 관리자에게 문의해주세요.' };
  }

  // 기존 세션 무효화 (중복 로그인 방지)
  dbRun('DELETE FROM sessions WHERE user_id = ?', user.id);

  // 새 세션 생성
  const sessionId = randomUUID();
  const now = Date.now();
  dbRun(
    'INSERT INTO sessions (id, user_id, ip, user_agent, created_at, last_access_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    sessionId, user.id, ip, userAgent, now, now, now + SESSION_EXPIRY_MS
  );

  auditLog(user.id, 'login', { ip, userAgent }, ip);

  return {
    success: true,
    sessionId,
    user: { id: user.username, email: user.email, company: user.company, plan: user.plan },
  };
}

/**
 * 세션 검증 - 유효한 세션인지 + 중복 로그인으로 무효화되지 않았는지 확인
 */
export function validateSession(sessionId: string): {
  valid: boolean;
  user?: { id: string; email: string; company: string; plan: string };
  kicked?: boolean;
  userId?: number;  // 내부용 숫자 ID
} {
  if (!sessionId) return { valid: false };

  const session = dbGet<any>(`
    SELECT s.id, s.user_id, s.expires_at, s.created_at,
           u.username, u.email, u.company, u.plan, u.status, u.role
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.id = ?
  `, sessionId);

  if (!session) return { valid: false };

  // 만료 체크
  if (Date.now() > session.expires_at) {
    dbRun('DELETE FROM sessions WHERE id = ?', sessionId);
    return { valid: false };
  }

  // 중복 로그인 체크: 같은 유저의 최신 세션인지
  const latestSession = dbGet<any>(
    'SELECT id FROM sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
    session.user_id
  );
  if (latestSession && latestSession.id !== sessionId) {
    dbRun('DELETE FROM sessions WHERE id = ?', sessionId);
    return { valid: false, kicked: true };
  }

  // last_access_at 갱신
  dbRun('UPDATE sessions SET last_access_at = ? WHERE id = ?', Date.now(), sessionId);

  return {
    valid: true,
    user: { id: session.username, email: session.email, company: session.company, plan: session.plan },
    role: session.role,
    userId: session.user_id,
  };
}

/**
 * 로그아웃
 */
export function logout(sessionId: string): void {
  const session = dbGet<any>('SELECT user_id FROM sessions WHERE id = ?', sessionId);
  if (session) {
    auditLog(session.user_id, 'logout', {});
  }
  dbRun('DELETE FROM sessions WHERE id = ?', sessionId);
}

// ── 사용량 추적 (usage-tracker.ts로 위임) ──

export function trackUsage(userId: string, type: 'prematch' | 'inplay' | 'special' | 'api', sport: string): void {
  // userId는 username(문자열) → 숫자 ID로 변환
  const user = dbGet<any>('SELECT id FROM users WHERE username = ?', userId);
  if (user) {
    trackWebUsage(user.id, type, sport);
  }
}

export function getUsageStats(userId: string) {
  const user = dbGet<any>('SELECT id FROM users WHERE username = ?', userId);
  if (!user) {
    return { daily: [], hourly: [], bySport: [], total: { prematch: 0, inplay: 0, special: 0, total: 0 } };
  }
  return getWebUsageStats(user.id);
}

/**
 * 사용자 등록 (웹 폼용, 기존 시그니처 유지)
 */
export function registerUser(data: {
  id: string;
  email: string;
  password: string;
  company: string;
  plan?: 'free' | 'standard' | 'premium';
}): { success: boolean; error?: string } {
  // 중복 체크
  const existingUser = dbGet('SELECT id FROM users WHERE username = ?', data.id);
  if (existingUser) {
    return { success: false, error: '이미 존재하는 ID입니다.' };
  }
  const existingEmail = dbGet('SELECT id FROM users WHERE email = ?', data.email);
  if (existingEmail) {
    return { success: false, error: '이미 등록된 이메일입니다.' };
  }

  const hash = hashSync(data.password, 12);
  dbRun(
    'INSERT INTO users (username, email, password_hash, company, plan, status) VALUES (?, ?, ?, ?, ?, ?)',
    data.id, data.email, hash, data.company || '', data.plan || 'free', 'pending'
  );

  return { success: true };
}
