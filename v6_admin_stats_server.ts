/**
 * GET /api/admin/stats - 전체 통계 (관리자 전용)
 */

import type { RequestHandler } from './$types';
import { dbGet, dbAll } from '$lib/db';
import { getPrematch, getInplay } from '$lib/api-cache';
import { ALL_SPORTS } from '$lib/plan-limits';

export const GET: RequestHandler = async ({ locals }) => {
  if (locals.role !== 'admin') {
    return Response.json({
      error: { code: 'ADMIN_REQUIRED', message: '관리자 권한이 필요합니다.' }
    }, { status: 403 });
  }

  // 사용자 통계
  const userStats = dbAll<any>(`
    SELECT status, plan, COUNT(*) as count
    FROM users
    GROUP BY status, plan
  `);

  const totalUsers = dbGet<{ cnt: number }>('SELECT COUNT(*) as cnt FROM users')?.cnt || 0;
  const activeUsers = dbGet<{ cnt: number }>("SELECT COUNT(*) as cnt FROM users WHERE status = 'active'")?.cnt || 0;
  const pendingUsers = dbGet<{ cnt: number }>("SELECT COUNT(*) as cnt FROM users WHERE status = 'pending'")?.cnt || 0;

  // 플랜 분포
  const planDist = dbAll<any>("SELECT plan, COUNT(*) as count FROM users WHERE status = 'active' GROUP BY plan");

  // 오늘 API 호출
  const today = new Date().toISOString().slice(0, 10);
  const todayUsage = dbGet<any>(
    'SELECT SUM(total_calls) as total, SUM(prematch) as prematch, SUM(inplay) as inplay, SUM(special) as special FROM usage_daily WHERE date = ?',
    today
  );

  // Top 10 사용자
  const topUsers = dbAll<any>(`
    SELECT u.username, u.plan, ud.total_calls
    FROM usage_daily ud
    JOIN users u ON ud.user_id = u.id
    WHERE ud.date = ?
    ORDER BY ud.total_calls DESC
    LIMIT 10
  `, today);

  // API 키 통계
  const totalKeys = dbGet<{ cnt: number }>('SELECT COUNT(*) as cnt FROM api_keys WHERE is_active = 1')?.cnt || 0;

  // 데이터 상태
  let totalPrematch = 0, totalInplay = 0;
  for (const sport of ALL_SPORTS) {
    totalPrematch += getPrematch(sport).length;
    totalInplay += getInplay(sport).length;
  }

  // MRR 추정 (active 사용자 기준)
  const mrrRows = dbAll<any>("SELECT plan, COUNT(*) as count FROM users WHERE status = 'active' AND role = 'user' GROUP BY plan");
  const priceMap: Record<string, number> = { free: 0, standard: 49, premium: 149, enterprise: 499 };
  const mrr = mrrRows.reduce((sum: number, r: any) => sum + (priceMap[r.plan] || 0) * r.count, 0);

  return Response.json({
    success: true,
    data: {
      users: {
        total: totalUsers,
        active: activeUsers,
        pending: pendingUsers,
        by_status_plan: userStats,
        plan_distribution: planDist,
      },
      api: {
        total_active_keys: totalKeys,
        today_calls: {
          total: todayUsage?.total || 0,
          prematch: todayUsage?.prematch || 0,
          inplay: todayUsage?.inplay || 0,
          special: todayUsage?.special || 0,
        },
        top_users_today: topUsers,
      },
      data: {
        total_prematch: totalPrematch,
        total_inplay: totalInplay,
      },
      revenue: {
        estimated_mrr: mrr,
      },
    },
  });
};
