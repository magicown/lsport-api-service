/**
 * relay_service/relay_all.php 호환 엔드포인트
 * sync_relay_all.php(30분 주기) 호출. 전체 프리매치 페이지네이션 + status 필터.
 */
import type { RequestHandler } from './$types';
import { getPrematchPaginated } from '$lib/api-cache';

export const GET: RequestHandler = async ({ url }) => {
  const sport = url.searchParams.get('sport') || 'soccer';
  const page = parseInt(url.searchParams.get('page') || '1');
  const statusParam = url.searchParams.get('status');
  const statusFilter = statusParam !== null ? parseInt(statusParam) : undefined;
  const result = getPrematchPaginated(sport, page, 50, statusFilter);

  return Response.json({
    success: 1,
    result,
  });
};
