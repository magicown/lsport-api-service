/**
 * GET /api/inplay/[sport] - 인플레이 실시간 데이터
 *
 * 모드:
 *   - 전체: /api/inplay/soccer (기본)
 *   - 업데이트: /api/inplay/soccer?since=1710500000000 (변경분만)
 */

import type { RequestHandler } from './$types';
import { getInplay, getInplayUpdates, getCacheInfo } from '$lib/api-cache';
import { formatMatchForApi } from '$lib/market-utils';
import { ALL_SPORTS } from '$lib/plan-limits';
import { safeInt } from '$lib/validator';

function addLiveData(formatted: any, raw: any) {
  return {
    ...formatted,
    live: {
      match_minute: raw.match_minute || '',
      match_time_str: raw.match_time_str || '',
      match_time_seconds: raw.match_time_seconds || 0,
      status_id: raw.status_id || 0,
    },
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
  const cacheInfo = getCacheInfo(sport, 'inplay');

  // ── 업데이트 모드 ──
  if (sinceParam) {
    const since = safeInt(sinceParam, -1, 0);
    if (since < 0) {
      return Response.json({
        error: { code: 'INVALID_PARAM', message: 'since는 Unix timestamp(ms)여야 합니다.' }
      }, { status: 400 });
    }

    const result = getInplayUpdates(sport, since);

    return Response.json({
      success: true,
      mode: 'updates',
      data: {
        updated: result.updated.map((m: any) => addLiveData(formatMatchForApi(m, sport), m)),
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
        refresh_interval: 5,
        hint: '다음 요청 시 server_time을 since 파라미터로 사용하세요.',
      },
    });
  }

  // ── 전체 모드 ──
  const page = safeInt(url.searchParams.get('page'), 1, 1, 10000);
  const limit = safeInt(url.searchParams.get('limit'), 50, 1, 100);

  let matches = getInplay(sport);

  const total = matches.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const offset = (page - 1) * limit;
  const pageMatches = matches.slice(offset, offset + limit);

  return Response.json({
    success: true,
    mode: 'full',
    data: {
      matches: pageMatches.map((m: any) => addLiveData(formatMatchForApi(m, sport), m)),
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
        refresh_interval: 5,
        hint: 'server_time을 since 파라미터로 사용하면 업데이트분만 조회할 수 있습니다.',
      },
    },
  });
};
