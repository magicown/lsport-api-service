/**
 * GET /api/match/[sport]/[id] - 경기 상세 (전체 마켓)
 * 웹 UI용: 원본 캐시 데이터 직접 반환
 * 외부 API용: ?format=api 로 정형화된 형식 반환
 */

import type { RequestHandler } from './$types';
import { getPrematch, getInplay, getSpecial } from '$lib/api-cache';
import { ALL_SPORTS } from '$lib/plan-limits';
import { safeInt, safeString } from '$lib/validator';

const VALID_TYPES = ['all', 'prematch', 'inplay', 'special'] as const;
const VALID_FORMATS = ['default', 'api'] as const;

export const GET: RequestHandler = async ({ params, url }) => {
  const sport = params.sport;
  const matchId = safeInt(params.id, 0, 1);

  if (!ALL_SPORTS.includes(sport as any)) {
    return Response.json({
      error: { code: 'INVALID_SPORT', message: '지원하지 않는 종목입니다.' }
    }, { status: 400 });
  }

  if (matchId <= 0) {
    return Response.json({
      error: { code: 'VALIDATION_ERROR', message: '유효하지 않은 경기 ID입니다.' }
    }, { status: 400 });
  }

  // prematch, inplay, special 모두 검색
  const type = safeString(url.searchParams.get('type'), 20) || 'all';
  if (!VALID_TYPES.includes(type as any)) {
    return Response.json({
      error: { code: 'VALIDATION_ERROR', message: `type은 [${VALID_TYPES.join(', ')}] 중 하나여야 합니다.` }
    }, { status: 400 });
  }

  let match: any = null;

  if (type === 'all' || type === 'prematch') {
    match = getPrematch(sport).find((m: any) => m.id === matchId || m.prematch_id === matchId);
  }
  if (!match && (type === 'all' || type === 'inplay')) {
    match = getInplay(sport).find((m: any) => m.id === matchId || m.inplay_id === matchId);
  }
  if (!match && (type === 'all' || type === 'special')) {
    match = getSpecial(sport).find((m: any) => m.id === matchId || m.prematch_id === matchId);
  }

  if (!match) {
    return Response.json({
      error: { code: 'MATCH_NOT_FOUND', message: '경기를 찾을 수 없습니다.' }
    }, { status: 404 });
  }

  // format=api: 외부 API용 정형화된 응답
  const format = safeString(url.searchParams.get('format'), 10) || 'default';
  if (format === 'api') {
    return Response.json({
      success: true,
      data: {
        id: match.id || match.prematch_id || match.inplay_id,
        sport,
        league: {
          id: match.league_id,
          name: match.league_name || match.league_name_eng || '',
          country: match.cc_kr || match.cc || '',
          image: match.league_image || '',
        },
        home: { name: match.home_name, image: match.home_image || '' },
        away: { name: match.away_name, image: match.away_image || '' },
        start_time: match.time || '',
        start_time_unix: match.time_unix || 0,
        status: match.status_kr || '',
        score: {
          home: match.score?.home?.ft ?? match.score?.home?.score ?? '',
          away: match.score?.away?.ft ?? match.score?.away?.score ?? '',
        },
        live: match.match_minute ? {
          match_minute: match.match_minute,
          match_time_str: match.match_time_str || '',
          match_time_seconds: match.match_time_seconds || 0,
          status_id: match.status_id || 0,
        } : undefined,
        markets: (match.market || []).map((mk: any) => ({
          market_id: mk.market_id,
          market_name: mk.market_name || '',
          lines: (mk.list || []).map((line: any) => ({
            name: line.name || '',
            odds: (line.odds || []).map((o: any) => ({
              name: o.name || '',
              value: o.value || '',
            })),
          })),
        })),
        markets_count: (match.market || []).length,
      },
    });
  }

  // 기본: 원본 캐시 데이터 직접 반환 (웹 UI용)
  return Response.json(match);
};
