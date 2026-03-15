/**
 * POST /api/auth/refresh - Token Rotation
 * 기존 refreshToken → 새 accessToken + refreshToken
 */

import type { RequestHandler } from './$types';
import { createHash } from 'crypto';
import { dbGet, dbRun, auditLog } from '$lib/db';
import { signAccessToken, signRefreshToken, ACCESS_TOKEN_MAX_AGE } from '$lib/jwt';
import { verifyToken } from '$lib/jwt';
import type { PlanType, UserRole } from '$lib/plan-limits';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { refreshToken } = body;

    if (!refreshToken) {
      return Response.json({
        error: { code: 'VALIDATION_ERROR', message: 'refreshToken이 필요합니다.' }
      }, { status: 400 });
    }

    // JWT 유효성 검증
    const payload = await verifyToken(refreshToken);
    if (!payload) {
      return Response.json({
        error: { code: 'TOKEN_EXPIRED', message: '만료되거나 유효하지 않은 토큰입니다.' }
      }, { status: 401 });
    }

    // DB에서 해시 확인 (revoked 체크 포함)
    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');
    const stored = dbGet<any>(
      'SELECT id, user_id FROM refresh_tokens WHERE token_hash = ? AND expires_at > ? AND revoked = 0',
      tokenHash, Date.now()
    );

    if (!stored) {
      // Refresh token reuse detection: JWT는 유효하지만 DB에 없으면 토큰 도용 가능성
      // → 해당 사용자의 모든 refresh token 무효화 (보안 조치)
      if (payload.sub) {
        const userId = typeof payload.sub === 'number' ? payload.sub : Number(payload.sub);
        if (!isNaN(userId)) {
          dbRun('DELETE FROM refresh_tokens WHERE user_id = ?', userId);
          auditLog(userId, 'refresh_token_reuse_detected', { tokenHash: tokenHash.slice(0, 8) + '...' });
          console.warn(`[Security] Refresh token reuse detected for user ${userId}. All tokens revoked.`);
        }
      }
      return Response.json({
        error: { code: 'TOKEN_INVALID', message: '이미 사용되었거나 폐기된 토큰입니다.' }
      }, { status: 401 });
    }

    // 기존 토큰 삭제 (rotation + UNIQUE 충돌 방지)
    dbRun('DELETE FROM refresh_tokens WHERE user_id = ?', stored.user_id);

    // 사용자 최신 정보
    const user = dbGet<any>(
      'SELECT id, username, email, plan, role, status FROM users WHERE id = ?',
      stored.user_id
    );

    if (!user || user.status !== 'active') {
      return Response.json({
        error: { code: 'ACCOUNT_SUSPENDED', message: '계정이 활성 상태가 아닙니다.' }
      }, { status: 403 });
    }

    // 새 토큰 쌍 발급
    const newAccessToken = await signAccessToken({
      sub: user.id,
      username: user.username,
      email: user.email,
      plan: user.plan as PlanType,
      role: user.role as UserRole,
    });

    const newRefreshToken = await signRefreshToken(user.id);
    const newHash = createHash('sha256').update(newRefreshToken).digest('hex');
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;

    dbRun(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
      user.id, newHash, expiresAt
    );

    return Response.json({
      success: true,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: ACCESS_TOKEN_MAX_AGE,
    });

  } catch (e: any) {
    console.error('[Refresh Error]', e);
    return Response.json({
      error: { code: 'SYS_INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' }
    }, { status: 500 });
  }
};
