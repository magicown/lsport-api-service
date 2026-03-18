/**
 * relay_service/inplay_match.php 호환 엔드포인트
 * get_match_detail.php 호출. 개별 인플레이 경기 compact 형식 반환.
 */
import type { RequestHandler } from './$types';
import { getInplayRaw } from '$lib/api-cache';

export const GET: RequestHandler = async ({ url }) => {
  const sport = url.searchParams.get('sport') || 'soccer';
  const id = parseInt(url.searchParams.get('id') || '0');
  if (!id) return Response.json({ success: false, error: 'id required' }, { status: 400 });

  const all = getInplayRaw(sport);
  const match = all.find((m: any) => m.g === id || m.id === id);
  if (!match) return Response.json({ success: false, error: 'not found' }, { status: 404 });

  return Response.json({ success: true, result: match });
};
