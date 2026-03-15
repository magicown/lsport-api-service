/**
 * POST /api/auth/login - JWT 로그인
 * accessToken(15분) + refreshToken(7일) 발급
 */

import type { RequestHandler } from './$types';
import { compareSync } from 'bcryptjs';
import { createHash } from 'crypto';
import { dbGet, dbRun, auditLog } from '$lib/db';
import { signAccessToken, signRefreshToken, ACCESS_TOKEN_MAX_AGE } from '$lib/jwt';
import type { PlanType, UserRole } from '$lib/plan-limits';

// 로그인 시도 제한 (브루트포스 방지)
const LOGIN_ATTEMPTS = new Map<string, { count: number; firstAttempt: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15분

function checkLoginAttempts(key: string): { allowed: boolean; retryAfter?: number } {
  const record = LOGIN_ATTEMPTS.get(key);
  if (!record) return { allowed: true };

  const elapsed = Date.now() - record.firstAttempt;
  if (elapsed > LOCKOUT_MS) {
    LOGIN_ATTEMPTS.delete(key);
    return { allowed: true };
  }

  if (record.count >= MAX_ATTEMPTS) {
    return { allowed: false, retryAfter: Math.ceil((LOCKOUT_MS - elapsed) / 1000) };
  }
  return { allowed: true };
}

function recordFailedAttempt(key: string) {
  const record = LOGIN_ATTEMPTS.get(key);
  if (!record) {
    LOGIN_ATTEMPTS.set(key, { count: 1, firstAttempt: Date.now() });
  } else {
    record.count++;
  }
}

function clearLoginAttempts(key: string) {
  LOGIN_ATTEMPTS.delete(key);
}

// 5분마다 만료된 기록 정리
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of LOGIN_ATTEMPTS) {
    if (now - record.firstAttempt > LOCKOUT_MS) {
      LOGIN_ATTEMPTS.delete(key);
    }
  }
}, 5 * 60 * 1000);

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return Response.json({
        error: { code: 'VALIDATION_ERROR', message: '이메일과 비밀번호를 입력해주세요.' }
      }, { status: 400 });
    }

    // 브루트포스 체크 (IP+email 기반: 공유 IP 환경에서 타 사용자 영향 방지)
    const clientIp = request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
    const attemptKey = `login:${clientIp}:${email}`;
    const attemptCheck = checkLoginAttempts(attemptKey);
    if (!attemptCheck.allowed) {
      return Response.json({
        error: {
          code: 'TOO_MANY_ATTEMPTS',
          message: `로그인 시도 횟수를 초과했습니다. ${attemptCheck.retryAfter}초 후 다시 시도해주세요.`
        }
      }, { status: 429 });
    }

    // 사용자 조회 (이메일 또는 username)
    const user = dbGet<any>(
      'SELECT id, username, email, password_hash, company, plan, status, role FROM users WHERE email = ? OR username = ?',
      email, email
    );

    // 사용자 열거 공격 방지: 인증 실패 시 동일한 메시지 사용
    if (!user || !compareSync(password, user.password_hash)) {
      recordFailedAttempt(attemptKey);
      return Response.json({
        error: { code: 'INVALID_CREDENTIALS', message: '이메일 또는 비밀번호가 올바르지 않습니다.' }
      }, { status: 401 });
    }

    // 상태 체크 (비밀번호 통과 후에도 비활성 계정은 통일된 메시지)
    if (user.status !== 'active') {
      return Response.json({
        error: { code: 'ACCOUNT_INACTIVE', message: '계정이 활성 상태가 아닙니다. 관리자에게 문의해주세요.' }
      }, { status: 403 });
    }

    // JWT 발급
    const accessToken = await signAccessToken({
      sub: user.id,
      username: user.username,
      email: user.email,
      plan: user.plan as PlanType,
      role: user.role as UserRole,
    });

    const refreshToken = await signRefreshToken(user.id);

    // Refresh Token DB 저장 (해시)
    const refreshHash = createHash('sha256').update(refreshToken).digest('hex');
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;

    // 기존 refresh token 삭제 (UNIQUE 충돌 방지)
    dbRun('DELETE FROM refresh_tokens WHERE user_id = ?', user.id);

    dbRun(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
      user.id, refreshHash, expiresAt
    );

    // 로그인 성공 시 시도 기록 초기화
    clearLoginAttempts(attemptKey);
    auditLog(user.id, 'api_login', { method: 'jwt' }, clientIp);

    return Response.json({
      success: true,
      accessToken,
      refreshToken,
      expiresIn: ACCESS_TOKEN_MAX_AGE,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        plan: user.plan,
        role: user.role,
      }
    });

  } catch (e: any) {
    console.error('[Login Error]', e);
    return Response.json({
      error: { code: 'SYS_INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' }
    }, { status: 500 });
  }
};
