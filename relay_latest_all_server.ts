/**
 * relay_service/relay_latest_all.php 호환 엔드포인트
 * main.go(5초 주기), sync_raw_scores.php(1분 주기) 호출. 전종목 최근 변경분 반환.
 */
import type { RequestHandler } from './$types';
import { getRecentAllSports } from '$lib/api-cache';

export const GET: RequestHandler = async ({ url }) => {
  const start = performance.now();
  const ts = parseInt(url.searchParams.get('ts') || '10');
  const bettype = url.searchParams.get('bettype') || 'multi';
  const data = getRecentAllSports(ts, bettype);

  return Response.json({
    success: true,
    timestamp: new Date().toISOString(),
    duration_ms: +(performance.now() - start).toFixed(1),
    data,
  });
};
