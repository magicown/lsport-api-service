/**
 * GET/POST /api/keys - API 키 목록 조회 / 새 키 생성
 */

import type { RequestHandler } from './$types';
import { dbGet, dbAll, dbRun, auditLog } from '$lib/db';
import { generateApiKey } from '$lib/api-key';
import { PLAN_LIMITS } from '$lib/plan-limits';
import type { PlanType } from '$lib/plan-limits';

export const GET: RequestHandler = async ({ locals }) => {
  const userId = locals.userId;
  if (!userId) {
    return Response.json({
      error: { code: 'AUTH_UNAUTHORIZED', message: '인증이 필요합니다.' }
    }, { status: 401 });
  }

  const keys = dbAll<any>(
    'SELECT id, key_prefix, label, is_active, last_used_at, created_at FROM api_keys WHERE user_id = ? ORDER BY created_at DESC',
    userId
  );

  return Response.json({
    success: true,
    keys: keys.map((k: any) => ({
      id: k.id,
      prefix: k.key_prefix + '...',
      label: k.label,
      active: !!k.is_active,
      last_used_at: k.last_used_at,
      created_at: k.created_at,
    })),
  });
};

export const POST: RequestHandler = async ({ locals, request }) => {
  const userId = locals.userId;
  if (!userId) {
    return Response.json({
      error: { code: 'AUTH_UNAUTHORIZED', message: '인증이 필요합니다.' }
    }, { status: 401 });
  }

  // 플랜별 최대 키 개수 체크
  const user = dbGet<any>('SELECT plan FROM users WHERE id = ?', userId);
  const limits = PLAN_LIMITS[user.plan as PlanType];

  const activeCount = dbGet<{ cnt: number }>(
    'SELECT COUNT(*) as cnt FROM api_keys WHERE user_id = ? AND is_active = 1',
    userId
  )?.cnt || 0;

  if (activeCount >= limits.maxKeys) {
    return Response.json({
      error: { code: 'MAX_KEYS_REACHED', message: `최대 ${limits.maxKeys}개의 API 키만 생성할 수 있습니다. 기존 키를 삭제 후 다시 시도해주세요.` }
    }, { status: 400 });
  }

  let label = 'Default';
  try {
    const body = await request.json();
    if (body.label) label = String(body.label).slice(0, 50);
  } catch { /* body 없어도 OK */ }

  // 키 생성
  const { fullKey, prefix, hash } = generateApiKey();

  const insertResult = dbRun(
    'INSERT INTO api_keys (user_id, key_prefix, key_hash, key_full, label) VALUES (?, ?, ?, ?, ?)',
    userId, prefix, hash, fullKey, label
  );

  const keyId = Number(insertResult.lastInsertRowid);

  const clientIp = request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
  auditLog(userId, 'key_create', { keyId, label, prefix }, clientIp);

  // ⚠️ fullKey는 이 응답에서만 노출됨!
  return Response.json({
    success: true,
    message: 'API 키가 생성되었습니다. 이 키는 다시 표시되지 않으니 안전한 곳에 저장해주세요.',
    key: {
      id: keyId,
      fullKey,
      prefix: prefix + '...',
      label,
    },
  }, { status: 201 });
};
