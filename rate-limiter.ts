/**
 * 슬라이딩 윈도우 레이트 리미터 (인메모리)
 * 분당 요청 수 제한 + 일일 호출 한도
 */

import { PLAN_LIMITS, isDailyLimitExceeded } from '$lib/plan-limits';
import type { PlanType } from '$lib/plan-limits';
import { dbGet } from '$lib/db';

// 분당 요청 타임스탬프: identifier → timestamp[]
const windowMap = new Map<string, number[]>();

// 일일 카운터: 'daily:{userId}:{date}' → count
const dailyCountMap = new Map<string, number>();

const WINDOW_MS = 60_000; // 1분

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;        // unix timestamp (seconds)
  retryAfter?: number;    // seconds
  code?: string;
  message?: string;
}

/**
 * 레이트 리밋 체크
 * @param identifier - 'user:{userId}' 또는 'key:{keyId}'
 * @param plan - 사용자 플랜
 * @param userId - 일일 한도 체크용
 */
export function checkRateLimit(identifier: string, plan: PlanType, userId: number): RateLimitResult {
  const limits = PLAN_LIMITS[plan];
  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  // 분당 윈도우 체크
  let timestamps = windowMap.get(identifier) || [];
  timestamps = timestamps.filter(t => t > windowStart);

  const perMinuteLimit = limits.ratePerMinute;
  const remaining = Math.max(0, perMinuteLimit - timestamps.length);
  const resetAt = Math.ceil((now + WINDOW_MS) / 1000);

  if (timestamps.length >= perMinuteLimit) {
    const oldestInWindow = timestamps[0];
    const retryAfter = Math.ceil((oldestInWindow + WINDOW_MS - now) / 1000);
    windowMap.set(identifier, timestamps);
    return {
      allowed: false,
      limit: perMinuteLimit,
      remaining: 0,
      resetAt,
      retryAfter,
      code: 'RATE_LIMIT_EXCEEDED',
      message: `분당 ${perMinuteLimit}회 요청 한도를 초과했습니다. ${retryAfter}초 후 재시도해주세요.`,
    };
  }

  // 일일 한도 체크 (서버 재시작 시 DB에서 시드)
  const today = new Date().toISOString().slice(0, 10);
  const dailyKey = `daily:${userId}:${today}`;
  let dailyCount = dailyCountMap.get(dailyKey);
  if (dailyCount === undefined) {
    // 첫 접근 시 DB에서 기존 카운트 로드
    const dbCount = dbGet<{ total_calls: number }>(
      'SELECT total_calls FROM usage_daily WHERE user_id = ? AND date = ?',
      userId, today
    );
    dailyCount = dbCount?.total_calls || 0;
    dailyCountMap.set(dailyKey, dailyCount);
  }

  if (isDailyLimitExceeded(plan, dailyCount)) {
    return {
      allowed: false,
      limit: perMinuteLimit,
      remaining,
      resetAt,
      code: 'RATE_LIMIT_EXCEEDED',
      message: `일일 ${limits.dailyLimit}회 호출 한도를 초과했습니다. KST 자정에 리셋됩니다.`,
    };
  }

  // 허용 - 타임스탬프 추가
  timestamps.push(now);
  windowMap.set(identifier, timestamps);

  // 일일 카운트 증가
  dailyCountMap.set(dailyKey, dailyCount + 1);

  return {
    allowed: true,
    limit: perMinuteLimit,
    remaining: remaining - 1,
    resetAt,
  };
}

/**
 * 레이트 리밋 응답 헤더 생성
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(result.resetAt),
  };
  if (result.retryAfter) {
    headers['Retry-After'] = String(result.retryAfter);
  }
  return headers;
}

/**
 * 만료된 엔트리 정리 (1분마다 호출)
 */
export function cleanupExpiredEntries() {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  for (const [key, timestamps] of windowMap) {
    const valid = timestamps.filter(t => t > windowStart);
    if (valid.length === 0) {
      windowMap.delete(key);
    } else {
      windowMap.set(key, valid);
    }
  }

  // 어제 이전 일일 카운터 정리
  const today = new Date().toISOString().slice(0, 10);
  for (const key of dailyCountMap.keys()) {
    const date = key.split(':')[2];
    if (date < today) {
      dailyCountMap.delete(key);
    }
  }
}

// 1분마다 정리
setInterval(cleanupExpiredEntries, 60_000);

/**
 * 일일 사용량 조회 (내부용)
 */
export function getDailyCount(userId: number): number {
  const today = new Date().toISOString().slice(0, 10);
  return dailyCountMap.get(`daily:${userId}:${today}`) || 0;
}
