/**
 * 관리자 페이지 - 회원 관리
 */
import type { PageServerLoad, Actions } from './$types';
import { redirect, fail } from '@sveltejs/kit';
import { dbAll, dbGet, dbRun, auditLog } from '$lib/db';

export const load: PageServerLoad = async ({ locals, url }) => {
  if (!locals.user || locals.role !== 'admin') {
    throw redirect(303, '/login');
  }

  const status = url.searchParams.get('status') || '';
  const search = url.searchParams.get('search') || '';
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const limit = 20;

  let where = 'WHERE 1=1';
  const params: any[] = [];

  if (status) {
    where += ' AND status = ?';
    params.push(status);
  }
  if (search) {
    const s = search.replace(/[%_\\]/g, '\\$&');
    where += " AND (username LIKE ? ESCAPE '\\' OR email LIKE ? ESCAPE '\\' OR company LIKE ? ESCAPE '\\')";
    params.push(`%${s}%`, `%${s}%`, `%${s}%`);
  }

  const total = (dbGet<{cnt: number}>(`SELECT COUNT(*) as cnt FROM users ${where}`, ...params)?.cnt) || 0;
  const offset = (page - 1) * limit;
  const users = dbAll<any>(`
    SELECT id, username, email, company, plan, status, role, memo, created_at, approved_at
    FROM users ${where}
    ORDER BY
      CASE status WHEN 'pending' THEN 0 WHEN 'active' THEN 1 WHEN 'suspended' THEN 2 ELSE 3 END,
      created_at DESC
    LIMIT ? OFFSET ?
  `, ...params, limit, offset);

  const stats = {
    total:     dbGet<{c: number}>('SELECT COUNT(*) as c FROM users')?.c || 0,
    pending:   dbGet<{c: number}>("SELECT COUNT(*) as c FROM users WHERE status='pending'")?.c || 0,
    active:    dbGet<{c: number}>("SELECT COUNT(*) as c FROM users WHERE status='active'")?.c || 0,
    suspended: dbGet<{c: number}>("SELECT COUNT(*) as c FROM users WHERE status='suspended'")?.c || 0,
    rejected:  dbGet<{c: number}>("SELECT COUNT(*) as c FROM users WHERE status='rejected'")?.c || 0,
  };

  return {
    users,
    stats,
    pagination: { page, limit, total, total_pages: Math.ceil(total / limit) },
    filters: { status, search },
  };
};

export const actions: Actions = {
  updateUser: async ({ request, locals }) => {
    if (locals.role !== 'admin') return fail(403, { error: '권한 없음' });

    const data = await request.formData();
    const userId = parseInt(data.get('userId')?.toString() || '0', 10);
    const newStatus = data.get('status')?.toString() || '';
    const newPlan = data.get('plan')?.toString() || '';
    const memo = data.get('memo')?.toString();

    if (!userId) return fail(400, { error: '잘못된 요청' });

    const user = dbGet<any>('SELECT id, status, plan FROM users WHERE id = ?', userId);
    if (!user) return fail(404, { error: '사용자 없음' });

    const updates: string[] = [];
    const values: any[] = [];

    if (newStatus && ['pending', 'active', 'suspended', 'rejected'].includes(newStatus)) {
      updates.push('status = ?');
      values.push(newStatus);
      if (newStatus === 'active' && user.status !== 'active') {
        updates.push('approved_at = ?');
        values.push(Date.now());
      }
    }
    if (newPlan && ['free', 'standard', 'premium', 'enterprise'].includes(newPlan)) {
      updates.push('plan = ?');
      values.push(newPlan);
    }
    if (memo !== undefined) {
      updates.push('memo = ?');
      values.push(String(memo).slice(0, 500));
    }
    if (updates.length === 0) return fail(400, { error: '변경 없음' });

    updates.push('updated_at = ?');
    values.push(Date.now());
    values.push(userId);

    dbRun(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, ...values);
    auditLog(locals.userId!, 'admin_user_update', { userId, status: newStatus, plan: newPlan }, 'admin');

    return { success: true };
  },
};
