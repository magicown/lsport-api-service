import { json } from '@sveltejs/kit';
import { getPrematch, getSpecial } from '$lib/api-cache';
import type { RequestHandler } from './$types';

// 경기 상세 API: 클릭 시 전체 마켓 데이터 반환
export const GET: RequestHandler = ({ params, url }) => {
  const sport = params.sport || 'soccer';
  const matchId = params.id;
  const type = url.searchParams.get('type');

  // 스페셜이면 스페셜 캐시에서, 아니면 프리매치 캐시에서 조회
  const source = type === 'special' ? getSpecial(sport) : getPrematch(sport);
  const match = source.find((m: any) =>
    String(m.prematch_id) === matchId || String(m.id) === matchId
  );

  if (!match) {
    return json({ error: 'not found' }, { status: 404 });
  }

  return json(match);
};
