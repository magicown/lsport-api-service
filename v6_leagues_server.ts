/**
 * GET /api/leagues/[sport] - 리그 목록
 */

import type { RequestHandler } from './$types';
import { getPrematch } from '$lib/api-cache';
import { ALL_SPORTS } from '$lib/plan-limits';

export const GET: RequestHandler = async ({ params }) => {
  const sport = params.sport;

  if (!ALL_SPORTS.includes(sport as any)) {
    return Response.json({
      error: { code: 'INVALID_SPORT', message: '지원하지 않는 종목입니다.' }
    }, { status: 400 });
  }

  const matches = getPrematch(sport);

  // 리그별 집계
  const leagueMap = new Map<number, { id: number; name: string; country: string; image: string; match_count: number }>();

  for (const m of matches) {
    const lid = m.league_id;
    if (!lid) continue;

    if (!leagueMap.has(lid)) {
      leagueMap.set(lid, {
        id: lid,
        name: m.league_name || m.league_name_eng || '',
        country: m.cc_kr || m.cc || '',
        image: m.league_image || '',
        match_count: 0,
      });
    }
    leagueMap.get(lid)!.match_count++;
  }

  const leagues = Array.from(leagueMap.values()).sort((a, b) => b.match_count - a.match_count);

  return Response.json({
    success: true,
    data: {
      sport,
      leagues,
      total: leagues.length,
    },
  });
};
