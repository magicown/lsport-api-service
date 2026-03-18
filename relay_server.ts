/**
 * relay_service/relay.php 호환 엔드포인트
 * main.go(상세보충), sync_special_odds.php(5분), sync_raw_scores.php(1분) 호출. ID 배치 조회.
 */
import type { RequestHandler } from './$types';
import { getMatchesByIds } from '$lib/api-cache';

export const GET: RequestHandler = async ({ url }) => {
  const sport = url.searchParams.get('sport') || 'soccer';
  const idsParam = url.searchParams.get('ids') || '';
  const ids = idsParam.split(',').map(Number).filter(Boolean);
  const list = ids.length ? getMatchesByIds(sport, ids) : [];

  return Response.json({
    success: 1,
    result: { list },
  });
};
