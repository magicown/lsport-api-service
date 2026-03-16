/**
 * GET /api/special/[sport] - 스페셜 마켓 데이터
 *
 * 모드:
 *   - 전체: /api/special/soccer (기본)
 *   - 업데이트: /api/special/soccer?since=1710500000000 (변경분만)
 */

import type { RequestHandler } from './$types';
import { getSpecial, getSpecialUpdates, getCacheInfo } from '$lib/api-cache';
import { ALL_SPORTS } from '$lib/plan-limits';
import { safeInt } from '$lib/validator';

function formatSpecialMatch(m: any, sport: string) {
  return {
    id: m.id || m.prematch_id,
    sport,
    league: {
      id: m.league_id,
      name: m.league_name || m.league_name_eng || '',
      country: m.cc_kr || m.cc || '',
      image: m.league_image || '',
    },
    home: { name: m.home_name, image: m.home_image || '' },
    away: { name: m.away_name, image: m.away_image || '' },
    start_time: m.time || '',
    markets: (m.market || []).map((mk: any) => ({
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
    markets_count: (m.market || []).length,
  };
}

export const GET: RequestHandler = async ({ params, url }) => {
  const sport = params.sport;

  if (!ALL_SPORTS.includes(sport as any)) {
    return Response.json({
      error: { code: 'INVALID_SPORT', message: '지원하지 않는 종목입니다.' }
    }, { status: 400 });
  }

  const sinceParam = url.searchParams.get('since');
  const cacheInfo = getCacheInfo(sport, 'prematch');

  // ── 업데이트 모드 ──
  if (sinceParam) {
    const since = safeInt(sinceParam, -1, 0);
    if (since < 0) {
      return Response.json({
        error: { code: 'INVALID_PARAM', message: 'since는 Unix timestamp(ms)여야 합니다.' }
      }, { status: 400 });
    }

    const result = getSpecialUpdates(sport, since);

    return Response.json({
      success: true,
      mode: 'updates',
      data: {
        updated: result.updated.map((m: any) => formatSpecialMatch(m, sport)),
        removed: result.removed,
        counts: {
          updated: result.updated.length,
          removed: result.removed.length,
        },
        since: result.since,
        server_time: result.server_time,
      },
      meta: {
        sport,
        cache_age_seconds: cacheInfo.age >= 0 ? Math.round(cacheInfo.age / 1000) : -1,
        hint: '다음 요청 시 server_time을 since 파라미터로 사용하세요.',
      },
    });
  }

  // ── 전체 모드 ──
  const page = safeInt(url.searchParams.get('page'), 1, 1, 10000);
  const limit = safeInt(url.searchParams.get('limit'), 50, 1, 100);

  const allMatches = getSpecial(sport);

  const total = allMatches.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const offset = (page - 1) * limit;
  const pageMatches = allMatches.slice(offset, offset + limit);

  return Response.json({
    success: true,
    mode: 'full',
    data: {
      matches: pageMatches.map((m: any) => formatSpecialMatch(m, sport)),
      pagination: {
        page,
        limit,
        total,
        total_pages: totalPages,
        has_next: page < totalPages,
      },
      server_time: Date.now(),
      meta: {
        sport,
        cache_age_seconds: cacheInfo.age >= 0 ? Math.round(cacheInfo.age / 1000) : -1,
        hint: 'server_time을 since 파라미터로 사용하면 업데이트분만 조회할 수 있습니다.',
      },
    },
  });
};
