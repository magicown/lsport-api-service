/**
 * DELETE /api/keys/[keyId] - API 키 비활성화 (soft delete)
 */

import type { RequestHandler } from './$types';
import { dbGet, dbRun, auditLog } from '$lib/db';

export const DELETE: RequestHandler = async ({ params, locals, request }) => {
  const userId = locals.userId;
  if (!userId) {
    return Response.json({
      error: { code: 'AUTH_UNAUTHORIZED', message: '인증이 필요합니다.' }
    }, { status: 401 });
  }

  const keyId = parseInt(params.keyId, 10);
  if (isNaN(keyId)) {
    return Response.json({
      error: { code: 'VALIDATION_ERROR', message: '유효하지 않은 키 ID입니다.' }
    }, { status: 400 });
  }

  const key = dbGet<any>(
    'SELECT id, key_prefix, label FROM api_keys WHERE id = ? AND user_id = ?',
    keyId, userId
  );

  if (!key) {
    return Response.json({
      error: { code: 'KEY_NOT_FOUND', message: 'API 키를 찾을 수 없습니다.' }
    }, { status: 404 });
  }

  dbRun('UPDATE api_keys SET is_active = 0 WHERE id = ?', keyId);
  const clientIp = request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
  auditLog(userId, 'key_deactivate', { keyId, prefix: key.key_prefix, label: key.label }, clientIp);

  return Response.json({
    success: true,
    message: 'API 키가 비활성화되었습니다.',
  });
};
