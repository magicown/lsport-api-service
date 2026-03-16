/**
 * GET /api/prematch/[sport] - 프리매치 데이터
 *
 * 모드:
 *   - 전체: /api/prematch/soccer (기본)
 *   - 업데이트: /api/prematch/soccer?since=1710500000000 (변경분만)
 */

import type { RequestHandler } from './$types';
import { getPrematch, getPrematchUpdates, getCacheInfo } from '$lib/api-cache';
import { formatMatchForApi } from '$lib/market-utils';
import { ALL_SPORTS } from '$lib/plan-limits';
import { safeInt } from '$lib/validator';

export const GET: RequestHandler = async ({ params, url }) => {
  const sport = params.sport;

  if (!ALL_SPORTS.includes(sport as any)) {
    return Response.json({
      error: { code: 'INVALID_SPORT', message: '지원하지 않는 종목입니다.' }
    }, { status: 400 });
  }

  const sinceParam = url.searchParams.get('since');
  const cacheInfo = getCacheInfo(sport, 'prematch');

  // ── 업데이트 모드: since 파라미터가 있으면 변경분만 반환 ──
  if (sinceParam) {
    const since = safeInt(sinceParam, -1, 0);
    if (since < 0) {
      return Response.json({
        error: { code: 'INVALID_PARAM', message: 'since는 Unix timestamp(ms)여야 합니다.' }
      }, { status: 400 });
    }

    const result = getPrematchUpdates(sport, since);

    return Response.json({
      success: true,
      mode: 'updates',
      data: {
        updated: result.updated.map((m: any) => formatMatchForApi(m, sport)),
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

  // ── 전체 모드 (기본) ──
  const page = safeInt(url.searchParams.get('page'), 1, 1, 10000);
  const limit = safeInt(url.searchParams.get('limit'), 50, 1, 100);
  const leagueId = url.searchParams.get('league_id');

  let matches = getPrematch(sport);

  // 리그 필터
  if (leagueId) {
    const lid = safeInt(leagueId, 0, 1);
    if (lid > 0) matches = matches.filter((m: any) => m.league_id === lid);
  }

  const total = matches.length;
  const totalPages = Math.ceil(total / limit);
  const offset = (page - 1) * limit;
  const pageMatches = matches.slice(offset, offset + limit);

  return Response.json({
    success: true,
    mode: 'full',
    data: {
      matches: pageMatches.map((m: any) => formatMatchForApi(m, sport)),
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
