/**
 * GET /api/account/usage - 내 사용량 조회
 */

import type { RequestHandler } from './$types';
import { getDailyUsage, getHourlyUsage, getEndpointUsage, getUsageSummary } from '$lib/usage-tracker';
import { PLAN_LIMITS } from '$lib/plan-limits';
import { dbGet } from '$lib/db';
import type { PlanType } from '$lib/plan-limits';

export const GET: RequestHandler = async ({ locals, url }) => {
  const userId = locals.userId;
  if (!userId) {
    return Response.json({
      error: { code: 'AUTH_UNAUTHORIZED', message: '인증이 필요합니다.' }
    }, { status: 401 });
  }

  const today = new Date().toISOString().slice(0, 10);
  const from = url.searchParams.get('from') || today;
  const to = url.searchParams.get('to') || today;

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
