/**
 * GET /api/admin/users - 사용자 목록 (관리자 전용)
 */

import type { RequestHandler } from './$types';
import { dbAll, dbGet } from '$lib/db';

export const GET: RequestHandler = async ({ locals, url }) => {
  if (locals.role !== 'admin') {
    return Response.json({
      error: { code: 'ADMIN_REQUIRED', message: '관리자 권한이 필요합니다.' }
    }, { status: 403 });
  }

  const status = url.searchParams.get('status');
  const plan = url.searchParams.get('plan');
  const search = url.searchParams.get('search');
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)));

  let where = 'WHERE 1=1';
  const params: any[] = [];

  if (status) {
    where += ' AND u.status = ?';
    params.push(status);
  }
  if (plan) {
    where += ' AND u.plan = ?';
    params.push(plan);
  }
  if (search) {
    // LIKE 와일드카드 이스케이핑
    const escapedSearch = search.replace(/[%_\\]/g, '\\$&');
    where += " AND (u.username LIKE ? ESCAPE '\\' OR u.email LIKE ? ESCAPE '\\' OR u.company LIKE ? ESCAPE '\\')";
    params.push(`%${escapedSearch}%`, `%${escapedSearch}%`, `%${escapedSearch}%`);
  }

  const countRow = dbGet<{ cnt: number }>(`SELECT COUNT(*) as cnt FROM users u ${where}`, ...params);
  const total = countRow?.cnt || 0;

  const offset = (page - 1) * limit;
  const users = dbAll<any>(`
    SELECT u.id, u.username, u.email, u.company, u.plan, u.status, u.role, u.memo,
           u.approved_at, u.created_at, u.updated_at,
           (SELECT COUNT(*) FROM api_keys WHERE user_id = u.id AND is_active = 1) as active_keys,
           (SELECT COUNT(*) FROM ip_whitelist WHERE user_id = u.id) as ip_count
    FROM users u
    ${where}
    ORDER BY u.created_at DESC
    LIMIT ? OFFSET ?
  `, ...params, limit, offset);

  return Response.json({
    success: true,
    data: {
      users,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    },
  });
};
