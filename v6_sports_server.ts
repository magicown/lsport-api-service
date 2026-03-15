/**
 * GET /api/sports - 종목 목록 + 경기 수
 */

import type { RequestHandler } from './$types';
import { getPrematch, getInplay, getCacheInfo } from '$lib/api-cache';
import { ALL_SPORTS } from '$lib/plan-limits';

const SPORT_NAMES: Record<string, { ko: string; en: string }> = {
  soccer: { ko: '축구', en: 'Soccer' },
  basketball: { ko: '농구', en: 'Basketball' },
  baseball: { ko: '야구', en: 'Baseball' },
  volleyball: { ko: '배구', en: 'Volleyball' },
  icehockey: { ko: '아이스하키', en: 'Ice Hockey' },
  americanfootball: { ko: '미식축구', en: 'American Football' },
  tennis: { ko: '테니스', en: 'Tennis' },
  handball: { ko: '핸드볼', en: 'Handball' },
  tabletennis: { ko: '탁구', en: 'Table Tennis' },
  esports: { ko: 'e스포츠', en: 'E-Sports' },
  boxingufc: { ko: '격투기', en: 'Boxing/UFC' },
};

export const GET: RequestHandler = async () => {
  const sports = ALL_SPORTS.map(sport => {
    const prematchData = getPrematch(sport);
    const inplayData = getInplay(sport);
    const prematchInfo = getCacheInfo(sport, 'prematch');
    const inplayInfo = getCacheInfo(sport, 'inplay');

    // 리그 수 계산
    const leagueIds = new Set<number>();
    for (const m of prematchData) {
      if (m.league_id) leagueIds.add(m.league_id);
    }

    return {
      id: sport,
      name: SPORT_NAMES[sport]?.ko || sport,
      name_en: SPORT_NAMES[sport]?.en || sport,
      prematch_count: prematchData.length,
      inplay_count: inplayData.length,
      league_count: leagueIds.size,
      cache: {
        prematch_age: prematchInfo.age >= 0 ? Math.round(prematchInfo.age / 1000) : -1,
        inplay_age: inplayInfo.age >= 0 ? Math.round(inplayInfo.age / 1000) : -1,
      },
    };
  });

  const totalPrematch = sports.reduce((sum, s) => sum + s.prematch_count, 0);
  const totalInplay = sports.reduce((sum, s) => sum + s.inplay_count, 0);
  const totalLeagues = sports.reduce((sum, s) => sum + s.league_count, 0);

  return Response.json({
    success: true,
    data: {
      sports,
      summary: {
        total_sports: sports.length,
        total_prematch: totalPrematch,
        total_inplay: totalInplay,
        total_leagues: totalLeagues,
      },
    },
  });
};
