/**
 * GET /api/admin/usage - 사용량 리포트 (관리자 전용)
 */

import type { RequestHandler } from './$types';
import { dbAll } from '$lib/db';
import { safeInt, safeString, isValidDate } from '$lib/validator';

export const GET: RequestHandler = async ({ locals, url }) => {
  if (locals.role !== 'admin') {
    return Response.json({
      error: { code: 'ADMIN_REQUIRED', message: '관리자 권한이 필요합니다.' }
    }, { status: 403 });
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

  let where = 'WHERE ud.date >= ? AND ud.date <= ?';
  const params: any[] = [from, to];

  const userIdParam = url.searchParams.get('user_id');
  if (userIdParam) {
    const parsedUserId = safeInt(userIdParam, 0, 1);
    if (parsedUserId === 0) {
      return Response.json({
        error: { code: 'VALIDATION_ERROR', message: '올바른 사용자 ID가 필요합니다.' }
      }, { status: 400 });
    }
    where += ' AND ud.user_id = ?';
    params.push(parsedUserId);
  }

  const daily = dbAll<any>(`
    SELECT ud.user_id, u.username, u.plan, ud.date,
           ud.total_calls, ud.prematch, ud.inplay, ud.special
    FROM usage_daily ud
    JOIN users u ON ud.user_id = u.id
    ${where}
    ORDER BY ud.date DESC, ud.total_calls DESC
    LIMIT 500
  `, ...params);

  // 사용자별 합계
  const userTotals = dbAll<any>(`
    SELECT ud.user_id, u.username, u.plan,
           SUM(ud.total_calls) as total_calls,
           SUM(ud.prematch) as prematch,
           SUM(ud.inplay) as inplay,
           SUM(ud.special) as special
    FROM usage_daily ud
    JOIN users u ON ud.user_id = u.id
    ${where}
    GROUP BY ud.user_id
    ORDER BY total_calls DESC
  `, ...params);

  return Response.json({
    success: true,
    data: {
      period: { from, to },
      daily,
      user_totals: userTotals,
    },
  });
};
