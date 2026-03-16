/**
 * GET /api/account/usage - 내 사용량 조회
 */

import type { RequestHandler } from './$types';
import { getDailyUsage, getHourlyUsage, getEndpointUsage, getUsageSummary } from '$lib/usage-tracker';
import { PLAN_LIMITS } from '$lib/plan-limits';
import { dbGet } from '$lib/db';
import type { PlanType } from '$lib/plan-limits';
import { safeString, isValidDate } from '$lib/validator';

export const GET: RequestHandler = async ({ locals, url }) => {
  const userId = locals.userId;
  if (!userId) {
    return Response.json({
      error: { code: 'AUTH_UNAUTHORIZED', message: '인증이 필요합니다.' }
    }, { status: 401 });
  }

  const today = new Date().toISOString().slice(0, 10);
  const from = safeString(url.searchParams.get('from'), 10) || today;
  const to = safeString(url.searchParams.get('to'), 10) || today;

  // 날짜 형식 검증
  if (!isValidDate(from) || !isValidDate(to)) {
    return Response.json({
      error: { code: 'VALIDATION_ERROR', message: 'from/to는 YYYY-MM-DD 형식이어야 합니다.' }
    }, { status: 400 });
  }
  if (from > to) {
    return Response.json({
      error: { code: 'VALIDATION_ERROR', message: 'from은 to보다 이전 날짜여야 합니다.' }
    }, { status: 400 });
  }

  const user = dbGet<any>('SELECT plan FROM users WHERE id = ?', userId);
  const limits = PLAN_LIMITS[user.plan as PlanType];

  const summary = getUsageSummary(userId);
  const daily = getDailyUsage(userId, from, to);
  const hourly = getHourlyUsage(userId, today);
  const endpoints = getEndpointUsage(userId, from, to);

  return Response.json({
    success: true,
    data: {
      summary,
      daily,
      hourly,
      endpoints,
      limits: {
        daily_limit: limits.dailyLimit,
        rate_per_minute: limits.ratePerMinute,
      },
    },
  });
};
