/**
 * API 사용량 추적 및 집계
 * usage_records (시간별 세부), usage_daily (일별 요약)
 */

import { dbRun, dbGet, dbAll } from '$lib/db';

/**
 * API 요청 1건 기록
 */
export function trackRequest(
  userId: number,
  apiKeyId: number | null,
  endpoint: string,
  sport: string = ''
) {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const hour = now.getUTCHours();

  // 시간별 세부 기록 (UPSERT)
  dbRun(`
    INSERT INTO usage_records (user_id, api_key_id, endpoint, sport, date, hour, count)
    VALUES (?, ?, ?, ?, ?, ?, 1)
    ON CONFLICT(user_id, api_key_id, endpoint, sport, date, hour)
    DO UPDATE SET count = count + 1
  `, userId, apiKeyId, endpoint, sport, date, hour);

  // 일별 요약 (UPSERT) - 화이트리스트 기반 동적 컬럼으로 SQL 인젝션 방지
  const endpointType = getEndpointType(endpoint);
  const VALID_COLUMNS: Record<string, true> = { prematch: true, inplay: true, special: true };
  const col = endpointType && VALID_COLUMNS[endpointType] ? endpointType : null;
  const updateSuffix = col ? `, ${col} = ${col} + 1` : '';
  dbRun(`
    INSERT INTO usage_daily (user_id, date, total_calls, prematch, inplay, special)
    VALUES (?, ?, 1, ?, ?, ?)
    ON CONFLICT(user_id, date)
    DO UPDATE SET total_calls = total_calls + 1${updateSuffix}
  `,
    userId, date,
    col === 'prematch' ? 1 : 0,
    col === 'inplay' ? 1 : 0,
    col === 'special' ? 1 : 0
  );
}

function getEndpointType(endpoint: string): string | null {
  if (endpoint.includes('/prematch/')) return 'prematch';
  if (endpoint.includes('/inplay/')) return 'inplay';
  if (endpoint.includes('/special/')) return 'special';
  return null;
}

/**
 * 사용량 요약 조회 (대시보드 / /api/auth/me)
 */
export function getUsageSummary(userId: number): {
  today: { total: number; prematch: number; inplay: number; special: number };
  thisMonth: { total: number; prematch: number; inplay: number; special: number };
} {
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = today.slice(0, 7) + '-01';

  const todayRow = dbGet<any>(
    'SELECT total_calls, prematch, inplay, special FROM usage_daily WHERE user_id = ? AND date = ?',
    userId, today
  );

  const monthRows = dbAll<any>(
    'SELECT SUM(total_calls) as total, SUM(prematch) as prematch, SUM(inplay) as inplay, SUM(special) as special FROM usage_daily WHERE user_id = ? AND date >= ?',
    userId, monthStart
  );

  const monthRow = monthRows[0] || {};

  return {
    today: {
      total: todayRow?.total_calls || 0,
      prematch: todayRow?.prematch || 0,
      inplay: todayRow?.inplay || 0,
      special: todayRow?.special || 0,
    },
    thisMonth: {
      total: monthRow?.total || 0,
      prematch: monthRow?.prematch || 0,
      inplay: monthRow?.inplay || 0,
      special: monthRow?.special || 0,
    },
  };
}

/**
 * 일별 사용량 조회 (기간 지정)
 */
export function getDailyUsage(userId: number, from: string, to: string) {
  return dbAll(
    'SELECT date, total_calls, prematch, inplay, special FROM usage_daily WHERE user_id = ? AND date >= ? AND date <= ? ORDER BY date',
    userId, from, to
  );
}

/**
 * 시간별 사용량 조회 (특정 날짜)
 */
export function getHourlyUsage(userId: number, date: string) {
  return dbAll(
    'SELECT hour, SUM(count) as count FROM usage_records WHERE user_id = ? AND date = ? GROUP BY hour ORDER BY hour',
    userId, date
  );
}

/**
 * 엔드포인트별 사용량 (특정 날짜 범위)
 */
export function getEndpointUsage(userId: number, from: string, to: string) {
  return dbAll(
    'SELECT endpoint, sport, SUM(count) as count FROM usage_records WHERE user_id = ? AND date >= ? AND date <= ? GROUP BY endpoint, sport ORDER BY count DESC',
    userId, from, to
  );
}

/**
 * 웹 페이지 사용량 추적 (기존 auth.ts의 trackUsage 대체)
 */
export function trackWebUsage(userId: number, type: string, sport: string) {
  trackRequest(userId, null, `/web/${type}/${sport}`, sport);
}

/**
 * 웹 사용량 통계 (기존 auth.ts의 getUsageStats 호환)
 */
export function getWebUsageStats(userId: number) {
  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const from = sevenDaysAgo.toISOString().slice(0, 10);
  const to = today.toISOString().slice(0, 10);
  const todayStr = to;

  // 일별
  const dailyRows = dbAll<any>(
    'SELECT date, prematch, inplay, special FROM usage_daily WHERE user_id = ? AND date >= ? AND date <= ? ORDER BY date',
    userId, from, to
  );
  const dailyMap = new Map<string, { prematch: number; inplay: number; special: number }>();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dailyMap.set(d.toISOString().slice(0, 10), { prematch: 0, inplay: 0, special: 0 });
  }
  for (const r of dailyRows) {
    dailyMap.set(r.date, { prematch: r.prematch || 0, inplay: r.inplay || 0, special: r.special || 0 });
  }

  // 시간별 (오늘)
  const hourlyRows = dbAll<any>(
    'SELECT hour, SUM(count) as count FROM usage_records WHERE user_id = ? AND date = ? GROUP BY hour',
    userId, todayStr
  );
  const hourlyMap = new Map<number, number>();
  for (let h = 0; h < 24; h++) hourlyMap.set(h, 0);
  for (const r of hourlyRows) hourlyMap.set(r.hour, r.count);

  // 종목별
  const sportRows = dbAll<any>(
    'SELECT sport, SUM(count) as count FROM usage_records WHERE user_id = ? AND date >= ? AND sport != \'\' GROUP BY sport ORDER BY count DESC',
    userId, from
  );

  const summary = getUsageSummary(userId);

  return {
    daily: Array.from(dailyMap.entries()).map(([date, d]) => ({ date, ...d })),
    hourly: Array.from(hourlyMap.entries()).map(([hour, count]) => ({ hour, count })),
    bySport: sportRows.map((r: any) => ({ sport: r.sport, count: r.count })),
    total: summary.today,
  };
}
