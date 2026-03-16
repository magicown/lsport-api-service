/**
 * GET/POST /api/account/ips - IP 화이트리스트 관리
 */

import type { RequestHandler } from './$types';
import { dbGet } from '$lib/db';
import { getIpList, addIp } from '$lib/ip-whitelist';
import { auditLog } from '$lib/db';
import type { PlanType } from '$lib/plan-limits';
import { safeString } from '$lib/validator';

export const GET: RequestHandler = async ({ locals, request }) => {
  const userId = locals.userId;
  if (!userId) {
    return Response.json({
      error: { code: 'AUTH_UNAUTHORIZED', message: '인증이 필요합니다.' }
    }, { status: 401 });
  }

  const ips = getIpList(userId);
  // 현재 요청 IP를 함께 반환하여 사용자가 자신의 IP를 알 수 있도록
  const currentIp = normalizeIp(request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1');
  return Response.json({ success: true, ips, currentIp });
};

export const POST: RequestHandler = async ({ locals, request }) => {
  const userId = locals.userId;
  if (!userId) {
    return Response.json({
      error: { code: 'AUTH_UNAUTHORIZED', message: '인증이 필요합니다.' }
    }, { status: 401 });
  }

  try {
    const body = await request.json();
    let { ip, description } = body;

    // 'auto' 또는 빈 값이면 현재 요청의 클라이언트 IP 자동 감지
    if (!ip || ip === 'auto') {
      ip = normalizeIp(request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1');
    }

    const desc = safeString(description, 200);
    const user = dbGet<any>('SELECT plan FROM users WHERE id = ?', userId);
    const result = addIp(userId, ip, desc, user.plan as PlanType);

    if (!result.success) {
      return Response.json({
        error: { code: 'VALIDATION_ERROR', message: result.error }
      }, { status: 400 });
    }

    auditLog(userId, 'ip_add', { ip, description }, normalizeIp(request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1'));

    return Response.json({
      success: true,
      message: 'IP가 등록되었습니다.',
      id: result.id,
      registeredIp: ip,
    }, { status: 201 });

  } catch (e: any) {
    return Response.json({
      error: { code: 'SYS_INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' }
    }, { status: 500 });
  }
};

/**
 * IP 정규화 (::ffff:1.2.3.4 → 1.2.3.4)
 */
function normalizeIp(ip: string): string {
  if (ip.startsWith('::ffff:')) {
    return ip.slice(7);
  }
  return ip;
}
