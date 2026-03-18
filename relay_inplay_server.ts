/**
 * relay_service/inplay.php 호환 엔드포인트
 * Ganzi의 6개+ PHP 파일에서 호출. api-77 compact 형식 그대로 반환.
 */
import type { RequestHandler } from './$types';
import { getInplayRaw, getAllInplayRaw } from '$lib/api-cache';

export const GET: RequestHandler = async ({ url }) => {
  const sport = url.searchParams.get('sport') || 'all';
  const result = sport === 'all' ? getAllInplayRaw() : getInplayRaw(sport);

  return Response.json({
    success: true,
    count: result.length,
    result,
  });
};
