/**
 * DELETE /api/account/ips/[id] - IP 삭제
 */

import type { RequestHandler } from './$types';
import { removeIp } from '$lib/ip-whitelist';
import { auditLog } from '$lib/db';

export const DELETE: RequestHandler = async ({ params, locals, request }) => {
  const userId = locals.userId;
  if (!userId) {
    return Response.json({
      error: { code: 'AUTH_UNAUTHORIZED', message: '인증이 필요합니다.' }
    }, { status: 401 });
  }

  const ipId = parseInt(params.id, 10);
  if (isNaN(ipId)) {
    return Response.json({
      error: { code: 'VALIDATION_ERROR', message: '유효하지 않은 ID입니다.' }
    }, { status: 400 });
  }

  const result = removeIp(userId, ipId);
  if (!result.success) {
    return Response.json({
      error: { code: 'DATA_NOT_FOUND', message: result.error }
    }, { status: 404 });
  }

  const clientIp = request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
  auditLog(userId, 'ip_remove', { ipId }, clientIp);

  return Response.json({
    success: true,
    message: 'IP가 삭제되었습니다.',
  });
};
