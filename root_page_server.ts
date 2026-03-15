/**
 * 대시보드 메인 페이지 서버 - 실시간 데이터 현황 + 사용량 로드
 */

import type { PageServerLoad } from './$types';
import { getUsageStats } from '$lib/auth';
import { getPrematch, getInplay, getSpecial, getCacheInfo } from '$lib/api-cache';

const SPORTS = [
  'soccer', 'basketball', 'baseball', 'volleyball', 'icehockey',
  'americanfootball', 'tennis', 'handball', 'tabletennis', 'esports', 'boxingufc'
];

export const load: PageServerLoad = async ({ locals }) => {
  const userId = locals.user?.id || '';
  const isAdmin = userId === 'admin';
  const usage = getUsageStats(userId);

  // 종목별 실시간 데이터 수 집계
  const sportsData = SPORTS.map(sport => {
    const prematchInfo = getCacheInfo(sport, 'prematch');
    const inplayInfo = getCacheInfo(sport, 'inplay');

    // 스페셜 데이터 수도 가져오기
    const specialMatches = getSpecial(sport);

    return {
      sport,
      prematch: prematchInfo.count,
      inplay: inplayInfo.count,
      special: specialMatches.length,
      prematchAge: prematchInfo.age > 0 ? Math.floor(prematchInfo.age / 1000) : -1,
      inplayAge: inplayInfo.age > 0 ? Math.floor(inplayInfo.age / 1000) : -1,
    };
  });

  const totalPrematch = sportsData.reduce((sum, s) => sum + s.prematch, 0);
  const totalInplay = sportsData.reduce((sum, s) => sum + s.inplay, 0);
  const totalSpecial = sportsData.reduce((sum, s) => sum + s.special, 0);
  const activeSports = sportsData.filter(s => s.prematch > 0 || s.inplay > 0).length;

  // 종목별 리그 수 집계 (프리매치 데이터에서)
  const leaguesBySport: Record<string, number> = {};
  for (const sport of SPORTS) {
    const matches = getPrematch(sport);
    const leagueIds = new Set(matches.map((m: any) => m.league_id));
    leaguesBySport[sport] = leagueIds.size;
  }
  const totalLeagues = Object.values(leaguesBySport).reduce((a, b) => a + b, 0);

  return {
    usage,
    sportsData,
    totalPrematch,
    totalInplay,
    totalSpecial,
    activeSports,
    totalLeagues,
    leaguesBySport,
    isAdmin,
  };
};
