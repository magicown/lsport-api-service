/**
 * IP 화이트리스트 관리
 * 유료 플랜: 필수, Free: 선택, CIDR 지원 (Premium+)
 * 외부 의존성 없이 순수 구현
 */

import { dbGet, dbAll, dbRun } from '$lib/db';
import { PLAN_LIMITS } from '$lib/plan-limits';
import type { PlanType } from '$lib/plan-limits';

// IP 화이트리스트 캐시: userId → { ips[], updatedAt }
const ipCache = new Map<number, { ips: string[]; updatedAt: number }>();
const CACHE_TTL = 60_000; // 60초

/**
 * IP 화이트리스트 체크
 * @returns null이면 통과, 문자열이면 에러 메시지
 */
export function checkIpWhitelist(
  userId: number,
  plan: PlanType,
  role: string,
  clientIp: string
): string | null {
  // 관리자는 화이트리스트 무시
  if (role === 'admin') return null;

  const limits = PLAN_LIMITS[plan];
  const ips = getCachedIps(userId);

  // 유료 플랜 + 화이트리스트 비어있음 → 설정 안내
  if (limits.ipRequired && ips.length === 0) {
    return 'IP 화이트리스트를 먼저 설정해주세요. 대시보드에서 허용 IP를 등록한 후 API를 사용할 수 있습니다.';
  }

  // 화이트리스트 없으면 통과 (Free 플랜)
  if (ips.length === 0) return null;

  // IP 매칭 체크
  const normalizedIp = normalizeIp(clientIp);
  for (const allowed of ips) {
    if (ipMatches(normalizedIp, allowed)) return null;
  }

  return '허용되지 않은 IP입니다. 대시보드에서 사용할 IP를 등록해주세요.';
}

function getCachedIps(userId: number): string[] {
  const cached = ipCache.get(userId);
  if (cached && Date.now() - cached.updatedAt < CACHE_TTL) {
    return cached.ips;
  }

  const rows = dbAll<{ ip_address: string }>(
    'SELECT ip_address FROM ip_whitelist WHERE user_id = ?',
    userId
  );
  const ips = rows.map(r => r.ip_address);
  ipCache.set(userId, { ips, updatedAt: Date.now() });
  return ips;
}

/**
 * 캐시 무효화 (IP 추가/삭제 시)
 */
export function invalidateIpCache(userId: number) {
  ipCache.delete(userId);
}

/**
 * IP 정규화 (::ffff:127.0.0.1 → 127.0.0.1)
 */
function normalizeIp(ip: string): string {
  if (ip.startsWith('::ffff:')) {
    return ip.slice(7);
  }
  return ip;
}

/**
 * IPv4를 32비트 정수로 변환
 */
function ipToInt(ip: string): number {
  const parts = ip.split('.').map(Number);
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

/**
 * IP 매칭 (단일 IP 또는 CIDR, IPv4/IPv6)
 */
function ipMatches(clientIp: string, allowed: string): boolean {
  const normalizedAllowed = normalizeIp(allowed);

  // 0.0.0.0/0 또는 ::/0 → 모든 IP 허용 (와일드카드)
  if (normalizedAllowed === '0.0.0.0/0' || normalizedAllowed === '::/0') {
    return true;
  }

  // IPv6 매칭
  if (clientIp.includes(':') || normalizedAllowed.includes(':')) {
    // 둘 다 IPv6여야 매칭 가능
    if (!clientIp.includes(':') || !normalizedAllowed.replace(/\/\d+$/, '').includes(':')) {
      return false;
    }
    const clientNorm = normalizeIpv6(clientIp);
    const allowedAddr = normalizedAllowed.split('/')[0];
    const allowedNorm = normalizeIpv6(allowedAddr);
    // IPv6 CIDR는 향후 지원, 현재는 정확 매칭만
    return clientNorm === allowedNorm;
  }

  // IPv4 단일 IP 정확히 매칭
  if (!normalizedAllowed.includes('/')) {
    return clientIp === normalizedAllowed;
  }

  // IPv4 CIDR 매칭
  try {
    const [rangeAddr, prefixStr] = normalizedAllowed.split('/');
    const prefix = parseInt(prefixStr, 10);
    if (prefix < 0 || prefix > 32) return false;

    const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
    const rangeInt = ipToInt(rangeAddr);
    const clientInt = ipToInt(clientIp);

    return (rangeInt & mask) === (clientInt & mask);
  } catch {
    return false;
  }
}

// ── CRUD ──

export function getIpList(userId: number) {
  return dbAll(
    'SELECT id, ip_address, description, created_at FROM ip_whitelist WHERE user_id = ? ORDER BY created_at',
    userId
  );
}

export function addIp(
  userId: number,
  ipAddress: string,
  description: string,
  plan: PlanType
): { success: boolean; error?: string; id?: number } {
  const limits = PLAN_LIMITS[plan];

  // CIDR 검사
  if (ipAddress.includes('/') && !limits.cidrSupport) {
    return { success: false, error: 'CIDR 형식은 Premium 이상 플랜에서 사용 가능합니다.' };
  }

  // IP 형식 검증
  if (!isValidIpOrCidr(ipAddress)) {
    return { success: false, error: '올바른 IP 주소 또는 CIDR 형식이 아닙니다.' };
  }

  // 최대 개수 체크
  const currentCount = dbGet<{ cnt: number }>(
    'SELECT COUNT(*) as cnt FROM ip_whitelist WHERE user_id = ?',
    userId
  )?.cnt || 0;

  if (currentCount >= limits.maxIps) {
    return { success: false, error: `최대 ${limits.maxIps}개의 IP만 등록할 수 있습니다.` };
  }

  // 중복 체크
  const existing = dbGet(
    'SELECT id FROM ip_whitelist WHERE user_id = ? AND ip_address = ?',
    userId, ipAddress
  );
  if (existing) {
    return { success: false, error: '이미 등록된 IP입니다.' };
  }

  const result = dbRun(
    'INSERT INTO ip_whitelist (user_id, ip_address, description) VALUES (?, ?, ?)',
    userId, ipAddress, description || ''
  );

  invalidateIpCache(userId);
  return { success: true, id: Number(result.lastInsertRowid) };
}

export function removeIp(userId: number, ipId: number): { success: boolean; error?: string } {
  const existing = dbGet<any>(
    'SELECT id FROM ip_whitelist WHERE id = ? AND user_id = ?',
    ipId, userId
  );
  if (!existing) {
    return { success: false, error: 'IP를 찾을 수 없습니다.' };
  }

  dbRun('DELETE FROM ip_whitelist WHERE id = ? AND user_id = ?', ipId, userId);
  invalidateIpCache(userId);
  return { success: true };
}

function isValidIpOrCidr(ip: string): boolean {
  // IPv6 지원 (Cloudflare CF-Connecting-IP가 IPv6를 반환할 수 있음)
  if (ip.includes(':')) {
    return isValidIpv6(ip);
  }

  // IPv4 검증
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;
  if (!ipv4Regex.test(ip)) return false;

  const parts = ip.split('/');
  const octets = parts[0].split('.').map(Number);
  if (octets.some(o => o > 255)) return false;
  if (parts[1]) {
    const prefix = parseInt(parts[1], 10);
    if (prefix < 0 || prefix > 32) return false;
  }
  return true;
}

/**
 * IPv6 주소 유효성 검증 (CIDR 포함)
 */
function isValidIpv6(ip: string): boolean {
  const parts = ip.split('/');
  const addr = parts[0];

  // CIDR prefix 검증
  if (parts[1]) {
    const prefix = parseInt(parts[1], 10);
    if (isNaN(prefix) || prefix < 0 || prefix > 128) return false;
  }

  // 기본 IPv6 형식 검증 (:: 축약 포함)
  const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
  return ipv6Regex.test(addr);
}

/**
 * IPv6 주소 정규화 (소문자, 0 패딩 제거, :: 확장)
 */
function normalizeIpv6(ip: string): string {
  const parts = ip.toLowerCase().split(':');

  // :: 확장
  const emptyIdx = parts.indexOf('');
  if (emptyIdx !== -1) {
    const before = parts.slice(0, emptyIdx);
    const after = parts.slice(emptyIdx + 1).filter(p => p !== '');
    const missing = 8 - before.length - after.length;
    const expanded = [...before, ...Array(missing).fill('0'), ...after];
    return expanded.map(p => p || '0').join(':');
  }

  return parts.map(p => p || '0').join(':').toLowerCase();
}
