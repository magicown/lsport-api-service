/**
 * GET/PATCH /api/admin/users/[id] - 사용자 상세 / 승인/정지/플랜 변경
 */

import type { RequestHandler } from './$types';
import { dbGet, dbRun, auditLog } from '$lib/db';

export const GET: RequestHandler = async ({ params, locals }) => {
  if (locals.role !== 'admin') {
    return Response.json({
      error: { code: 'ADMIN_REQUIRED', message: '관리자 권한이 필요합니다.' }
    }, { status: 403 });
  }

  const userId = parseInt(params.id, 10);
  if (isNaN(userId) || userId <= 0) {
    return Response.json({
      error: { code: 'VALIDATION_ERROR', message: '올바른 사용자 ID가 필요합니다.' }
    }, { status: 400 });
  }

  const user = dbGet<any>(`
    SELECT id, username, email, company, plan, status, role, memo,
           approved_at, created_at, updated_at
    FROM users WHERE id = ?
  `, userId);

  if (!user) {
    return Response.json({
      error: { code: 'USER_NOT_FOUND', message: '사용자를 찾을 수 없습니다.' }
    }, { status: 404 });
  }

  return Response.json({ success: true, user });
};

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
  if (locals.role !== 'admin') {
    return Response.json({
      error: { code: 'ADMIN_REQUIRED', message: '관리자 권한이 필요합니다.' }
    }, { status: 403 });
  }

  const userId = parseInt(params.id, 10);
  if (isNaN(userId) || userId <= 0) {
    return Response.json({
      error: { code: 'VALIDATION_ERROR', message: '올바른 사용자 ID가 필요합니다.' }
    }, { status: 400 });
  }

  const user = dbGet<any>('SELECT id, username, status, plan FROM users WHERE id = ?', userId);

  if (!user) {
    return Response.json({
      error: { code: 'USER_NOT_FOUND', message: '사용자를 찾을 수 없습니다.' }
    }, { status: 404 });
  }

  try {
    const body = await request.json();
    const updates: string[] = [];
    const values: any[] = [];
    const changes: any = {};

    if (body.status && ['pending', 'active', 'suspended', 'rejected'].includes(body.status)) {
      updates.push('status = ?');
      values.push(body.status);
      changes.status = { from: user.status, to: body.status };

      if (body.status === 'active' && user.status !== 'active') {
        updates.push('approved_at = ?');
        values.push(Date.now());
      }
    }

    if (body.plan && ['free', 'standard', 'premium', 'enterprise'].includes(body.plan)) {
      updates.push('plan = ?');
      values.push(body.plan);
      changes.plan = { from: user.plan, to: body.plan };
    }

    if (body.memo !== undefined) {
      updates.push('memo = ?');
      values.push(String(body.memo).slice(0, 500));
    }

    if (body.role && ['user', 'admin'].includes(body.role)) {
      // 관리자 자기 자신의 role 변경 방지
      if (userId === locals.userId && body.role !== 'admin') {
        return Response.json({
          error: { code: 'VALIDATION_ERROR', message: '자신의 관리자 권한은 변경할 수 없습니다.' }
        }, { status: 400 });
      }
      updates.push('role = ?');
      values.push(body.role);
      changes.role = body.role;
    }

    if (updates.length === 0) {
      return Response.json({
        error: { code: 'VALIDATION_ERROR', message: '변경할 항목이 없습니다.' }
      }, { status: 400 });
    }

    updates.push('updated_at = ?');
    values.push(Date.now());
    values.push(userId);

    dbRun(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, ...values);
    const clientIp = request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
    auditLog(locals.userId!, 'admin_user_update', { targetUserId: userId, changes }, clientIp);

    const updated = dbGet<any>(
      'SELECT id, username, email, company, plan, status, role, memo, approved_at, created_at, updated_at FROM users WHERE id = ?',
      userId
    );

    return Response.json({
      success: true,
      message: '사용자 정보가 업데이트되었습니다.',
      user: updated,
    });

  } catch (e: any) {
    return Response.json({
      error: { code: 'SYS_INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' }
    }, { status: 500 });
  }
};
