/**
 * API Key 생성, 해싱, 검증
 * 형식: lso_live_ + 40자 hex = 총 49자
 * 만료 기능 추가
 */

import { randomBytes, createHash } from 'crypto';
import { dbGet, dbRun } from '$lib/db';
import { createLogger } from '$lib/logger';

const log = createLogger('api-key');
const API_KEY_PREFIX = 'lso_live_';

// last_used_at 배치 업데이트 (5분 간격)
const pendingLastUsed = new Map<number, number>(); // keyId -> timestamp
setInterval(() => {
  if (pendingLastUsed.size === 0) return;
  for (const [keyId, ts] of pendingLastUsed) {
    try { dbRun('UPDATE api_keys SET last_used_at = ? WHERE id = ?', ts, keyId); } catch (e) { log.error('Batch update error', { keyId, error: String(e) }); }
  }
  pendingLastUsed.clear();
}, 5 * 60 * 1000);

/**
 * 새 API Key 생성 - 평문은 이 함수 호출 시에만 반환됨!
 * @param expiresInDays - 만료일 (일 단위, null이면 무기한)
 */
export function generateApiKey(expiresInDays?: number | null): {
  fullKey: string;
  prefix: string;
  hash: string;
  expiresAt: number | null;
} {
  const raw = randomBytes(20).toString('hex'); // 40자 hex, 160비트
  const fullKey = API_KEY_PREFIX + raw;
  const prefix = fullKey.slice(0, 16);
  const hash = hashApiKey(fullKey);
  const expiresAt = expiresInDays
    ? Date.now() + expiresInDays * 24 * 60 * 60 * 1000
    : null;
  return { fullKey, prefix, hash, expiresAt };
}

/**
 * API Key SHA-256 해싱
 */
export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

/**
 * API Key로 사용자 조회 (만료 체크 포함)
 * 반환: user 정보 + key 정보 (또는 null)
 */
export function validateApiKey(key: string): {
  userId: number;
  keyId: number;
  username: string;
  email: string;
  plan: string;
  role: string;
  status: string;
} | null {
  if (!key || !key.startsWith(API_KEY_PREFIX)) return null;

  const hash = hashApiKey(key);
  const row = dbGet<any>(`
    SELECT
      k.id as key_id, k.user_id, k.is_active, k.expires_at,
      u.username, u.email, u.plan, u.role, u.status
    FROM api_keys k
    JOIN users u ON k.user_id = u.id
    WHERE k.key_hash = ? AND k.is_active = 1
  `, hash);

  if (!row) return null;

  // 만료 체크
  if (row.expires_at && row.expires_at < Date.now()) {
    // 만료된 키 비활성화
    dbRun('UPDATE api_keys SET is_active = 0 WHERE id = ?', row.key_id);
    log.info('API key expired and deactivated', { keyId: row.key_id, userId: row.user_id });
    return null;
  }

  // last_used_at 갱신 (배치 처리, active 키만)
  if (row.status === 'active') {
    pendingLastUsed.set(row.key_id, Date.now());
  }

  return {
    userId: row.user_id,
    keyId: row.key_id,
    username: row.username,
    email: row.email,
    plan: row.plan,
    role: row.role,
    status: row.status,
  };
}
