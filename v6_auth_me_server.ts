/**
 * GET /api/auth/me - 내 정보 + 사용량 + API 키 목록
 */

import type { RequestHandler } from './$types';
import { dbGet, dbAll } from '$lib/db';
import { getUsageSummary } from '$lib/usage-tracker';
import { PLAN_LIMITS } from '$lib/plan-limits';
import { getDailyCount } from '$lib/rate-limiter';

export const GET: RequestHandler = async ({ locals }) => {
  const userId = locals.userId;
  if (!userId) {
    return Response.json({
      error: { code: 'AUTH_UNAUTHORIZED', message: '인증이 필요합니다.' }
    }, { status: 401 });
  }

  const user = dbGet<any>(
    'SELECT id, username, email, company, plan, status, role, created_at FROM users WHERE id = ?',
    userId
  );

  if (!user) {
    return Response.json({
      error: { code: 'USER_NOT_FOUND', message: '사용자를 찾을 수 없습니다.' }
    }, { status: 404 });
  }

  // API 키 목록 (마스킹)
  const keys = dbAll<any>(
    'SELECT id, key_prefix, label, is_active, last_used_at, created_at FROM api_keys WHERE user_id = ? ORDER BY created_at DESC',
    userId
  );

  // IP 화이트리스트
  const ips = dbAll<any>(
    'SELECT id, ip_address, description, created_at FROM ip_whitelist WHERE user_id = ? ORDER BY created_at',
    userId
  );

  // 사용량
  const usage = getUsageSummary(userId);
  const limits = PLAN_LIMITS[user.plan as keyof typeof PLAN_LIMITS];
  const todayApiCalls = getDailyCount(userId);

  return Response.json({
    success: true,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      company: user.company,
      plan: user.plan,
      role: user.role,
      status: user.status,
      created_at: user.created_at,
    },
    api_keys: keys.map((k: any) => ({
      id: k.id,
      prefix: k.key_prefix + '...',
      label: k.label,
      active: !!k.is_active,
      last_used_at: k.last_used_at,
      created_at: k.created_at,
    })),
    ip_whitelist: ips,
    usage: {
      ...usage,
      today_api_calls: todayApiCalls,
    },
    limits: {
      rate_per_minute: limits.ratePerMinute,
      daily_limit: limits.dailyLimit,
      max_keys: limits.maxKeys,
      max_ips: limits.maxIps,
      ip_required: limits.ipRequired,
      features: {
        prematch: limits.prematch,
        inplay: limits.inplay,
        special: limits.special,
        match_detail: limits.matchDetail,
      },
    },
  });
};
