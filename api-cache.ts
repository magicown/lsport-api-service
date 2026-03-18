/**
 * 서버사이드 메모리 캐시 - 백그라운드에서 주기적으로 갱신
 * 프리매치: 30초마다, 인플레이: 5초마다
 *
 * 전체 데이터 + 업데이트 추적 (since 파라미터 지원)
 */

const TOKEN = process.env.API77_TOKEN || 'pGbmTHt1vkvITi62AbRiNQHZyhAQmLi';
const PREMATCH_URL = 'https://v6.api-77.com';
const INPLAY_URL = 'https://v6_i.api-77.com/inplay';

const SPORTS = [
  'soccer', 'basketball', 'baseball', 'volleyball', 'icehockey',
  'americanfootball', 'tennis', 'handball', 'tabletennis', 'esports', 'boxingufc'
];

interface MatchEntry {
  data: any;
  hash: string;        // 변경 감지용 해시
  changedAt: number;   // 이 경기가 마지막으로 변경된 시간 (ms)
}

interface CacheEntry {
  matches: Map<number | string, MatchEntry>;  // matchId → MatchEntry
  updatedAt: number;   // 캐시 갱신 시간
}

// 메모리 캐시
const prematchCache = new Map<string, CacheEntry>();
const inplayCache = new Map<string, CacheEntry>();
const inplayRawCache = new Map<string, any[]>(); // sport → raw api-77 compact 배열 (relay_service용)
// 삭제된 경기 추적 (since 조회 시 "삭제됨" 알려주기 위해)
const removedMatches = new Map<string, Map<number | string, number>>(); // sport → {matchId → removedAt}
let initialized = false;

/**
 * 경기 데이터의 간단한 해시 생성 (배당 변경 감지용)
 */
function quickHash(match: any): string {
  const markets = match.market || [];
  // 배당값 + 스코어 등 핵심 데이터만 해시
  const parts: string[] = [];
  for (const mk of markets) {
    for (const line of (mk.list || [])) {
      for (const o of (line.odds || [])) {
        parts.push(`${o.name}:${o.value}`);
      }
    }
  }
  // 상태, 스코어 변경도 감지
  if (match.status_id) parts.push(`s:${match.status_id}`);
  if (match.score) parts.push(`sc:${JSON.stringify(match.score)}`);
  if (match.match_minute) parts.push(`m:${match.match_minute}`);
  return parts.join('|');
}

/**
 * 캐시 업데이트 - 변경된 경기만 changedAt 갱신
 */
function updateCache(cache: Map<string, CacheEntry>, removed: Map<string, Map<number | string, number>>, sport: string, newData: any[]) {
  const now = Date.now();
  const existing = cache.get(sport);
  const newMap = new Map<number | string, MatchEntry>();

  // 이전 경기 ID 목록
  const prevIds = new Set(existing?.matches.keys() || []);

  for (const match of newData) {
    const matchId = match.id || match.inplay_id || match.prematch_id;
    if (!matchId) continue;

    const hash = quickHash(match);
    const prev = existing?.matches.get(matchId);

    if (prev && prev.hash === hash) {
      // 변경 없음 - 기존 changedAt 유지
      newMap.set(matchId, { data: match, hash, changedAt: prev.changedAt });
    } else {
      // 신규 또는 변경됨
      newMap.set(matchId, { data: match, hash, changedAt: now });
    }

    prevIds.delete(matchId);
  }

  // 삭제된 경기 추적
  if (prevIds.size > 0) {
    if (!removed.has(sport)) removed.set(sport, new Map());
    const sportRemoved = removed.get(sport)!;
    for (const id of prevIds) {
      sportRemoved.set(id, now);
    }
    // 오래된 삭제 기록 정리 (10분 이상)
    for (const [id, ts] of sportRemoved) {
      if (now - ts > 600_000) sportRemoved.delete(id);
    }
  }

  cache.set(sport, { matches: newMap, updatedAt: now });
}

async function fetchAllPages(sport: string, bettype = 'multi'): Promise<any[]> {
  const allList: any[] = [];
  let page = 1;

  while (page <= 20) {
    try {
      const url = `${PREMATCH_URL}/${sport}/${bettype}/all?token=${TOKEN}&page=${page}`;
      const res = await fetch(url);
      if (!res.ok) break;

      const data = await res.json();
      if (!data?.result?.list?.length) break;

      allList.push(...data.result.list);

      const pagination = data.result.pagination;
      if (!pagination || page >= (pagination.total_pages ?? 1)) break;
      page++;
    } catch {
      break;
    }
  }

  return allList;
}

// 인플레이 API 응답을 prematch 형식으로 변환
function transformInplayMatch(raw: any, sport: string): any {
  const gm = raw.gm || {};
  const st = raw.st || {};
  const ss = raw.ss || {};

  const market = (raw.od || []).map((od: any) => ({
    market_id: od.m,
    market_name: od.mn || '',
    stop: od.s || 0,
    list: (od.l || []).map((line: any) => ({
      name: line.n || '',
      stop: line.s || 0,
      odds: (line.o || []).map((o: any) => ({
        name: o.n || '',
        value: o.v || '',
        stop: o.s || 0,
      })),
    })),
  }));

  return {
    id: raw.g,
    inplay_id: raw.g,
    prematch_id: raw.b || 0,
    sport,
    league_id: gm.l,
    league_name: gm.ln || gm.le || '',
    league_name_eng: gm.le || '',
    league_image: gm.li || '',
    home_name: gm.hn || gm.he || '',
    away_name: gm.an || gm.ae || '',
    home_image: gm.hi || '',
    away_image: gm.ai || '',
    cc: gm.c || '',
    cc_kr: gm.ck || gm.c || '',
    cc_image: gm.ci || '',
    status_kr: st.ss || '',
    status_id: st.si || 0,
    match_minute: st.m || '',
    match_time_str: st.ms || '',
    match_time_seconds: st.mi || 0,
    fetched_at: Date.now(),
    time: '',
    time_unix: 0,
    score: {
      home: { score: ss?.g?.h ?? '', ft: ss?.g?.h ?? '' },
      away: { score: ss?.g?.a ?? '', ft: ss?.g?.a ?? '' },
    },
    market,
  };
}

async function fetchInplay(sport: string): Promise<{ transformed: any[], raw: any[] }> {
  try {
    const url = `${INPLAY_URL}/${sport}?token=${TOKEN}`;
    const res = await fetch(url);
    if (!res.ok) return { transformed: [], raw: [] };

    const data = await res.json();
    if (!data?.success) {
      console.error(`Inplay API error [${sport}]:`, data?.error || 'unknown');
      return { transformed: [], raw: [] };
    }
    const rawList = data?.result || [];
    console.log(`[Inplay] ${sport} raw: ${rawList.length} matches`);

    // raw에 sport, id 필드 주입 (relay_service 호환용)
    const raw = rawList.map((r: any) => ({ ...r, sport, id: r.g }));

    const transformed = rawList.map((r: any) => {
      try {
        return transformInplayMatch(r, sport);
      } catch (e) {
        console.error(`Transform error [${sport}]:`, e);
        return null;
      }
    }).filter(Boolean);

    return { transformed, raw };
  } catch {
    return { transformed: [], raw: [] };
  }
}

// 백그라운드 갱신 - 프리매치
async function refreshPrematch() {
  const promises = SPORTS.map(async (sport) => {
    try {
      const data = await fetchAllPages(sport);
      updateCache(prematchCache, removedMatches, sport, data);
    } catch (e) {
      console.error(`Prematch refresh error [${sport}]:`, e);
    }
  });
  await Promise.all(promises);
  console.log(`[Cache] 프리매치 갱신 완료: ${SPORTS.map(s => `${s}(${prematchCache.get(s)?.matches.size || 0})`).join(', ')}`);
}

// 백그라운드 갱신 - 인플레이
async function refreshInplay() {
  try {
    const promises = SPORTS.map(async (sport) => {
      try {
        const { transformed, raw } = await fetchInplay(sport);
        updateCache(inplayCache, removedMatches, sport, transformed);
        inplayRawCache.set(sport, raw); // raw는 단순 교체 (변경추적 불필요)
      } catch (e) {
        console.error(`Inplay refresh error [${sport}]:`, e);
      }
    });
    await Promise.all(promises);
    console.log(`[Cache] 인플레이 갱신 완료: ${SPORTS.map(s => `${s}(${inplayCache.get(s)?.matches.size || 0})`).join(', ')}`);
  } catch (e) {
    console.error('[Cache] 인플레이 갱신 전체 에러:', e);
  }
}

// 초기화 + 주기적 갱신 시작
function startBackgroundRefresh() {
  if (initialized) return;
  initialized = true;

  console.log('[Cache] 백그라운드 캐시 시작...');

  refreshPrematch();
  refreshInplay();

  setInterval(refreshPrematch, 30_000);
  setInterval(refreshInplay, 5_000);
}

startBackgroundRefresh();

// ────── Public API ──────

/**
 * 전체 데이터 (기존과 동일)
 */
export function getPrematch(sport: string): any[] {
  const entry = prematchCache.get(sport);
  if (!entry) return [];
  return Array.from(entry.matches.values()).map(e => e.data);
}

export function getInplay(sport: string): any[] {
  const entry = inplayCache.get(sport);
  if (!entry) return [];
  return Array.from(entry.matches.values()).map(e => e.data);
}

/**
 * 업데이트분만 (since 이후 변경된 경기만)
 * @param since Unix timestamp (milliseconds)
 * @returns { updated: any[], removed: (number|string)[], since: number, server_time: number }
 */
export function getPrematchUpdates(sport: string, since: number): {
  updated: any[];
  removed: (number | string)[];
  since: number;
  server_time: number;
} {
  return getUpdates(prematchCache, sport, since);
}

export function getInplayUpdates(sport: string, since: number): {
  updated: any[];
  removed: (number | string)[];
  since: number;
  server_time: number;
} {
  return getUpdates(inplayCache, sport, since);
}

function getUpdates(cache: Map<string, CacheEntry>, sport: string, since: number) {
  const now = Date.now();
  const entry = cache.get(sport);

  const updated: any[] = [];
  if (entry) {
    for (const [, matchEntry] of entry.matches) {
      if (matchEntry.changedAt > since) {
        updated.push(matchEntry.data);
      }
    }
  }

  // 삭제된 경기 (since 이후 사라진 것)
  const sportRemoved = removedMatches.get(sport);
  const removed: (number | string)[] = [];
  if (sportRemoved) {
    for (const [id, ts] of sportRemoved) {
      if (ts > since) removed.push(id);
    }
  }

  return { updated, removed, since, server_time: now };
}

// 종목별 기본(메인) 마켓 ID
const MAIN_MARKET_IDS: Record<string, number[]> = {
  soccer: [10001, 10002, 10003, 10004, 10005, 10006, 10007, 10008, 10009, 10013, 10014, 10024, 10029, 10030, 10050, 10051],
  basketball: [16001, 16002, 16003, 16004, 16005, 16006, 16020, 16021],
  baseball: [14001, 14002, 14003, 14004, 14005, 14006],
  volleyball: [18001, 18002, 18003, 18004, 18005, 18007, 18008, 18055, 18056, 18057, 18058],
  icehockey: [15001, 15002, 15003, 15004, 15007, 15009, 15011, 15012, 15051, 15052, 15053, 15054],
  handball: [17001, 17002, 17003],
  americanfootball: [13001, 13002, 13003],
  tennis: [19001, 19002, 19003],
  tabletennis: [20001, 20002, 20003],
  esports: [20001, 20002, 20003],
  boxingufc: [22001, 22002, 22003],
};

// 스페셜 데이터: prematch에서 스페셜 마켓만 필터링
export function getSpecial(sport: string): any[] {
  startBackgroundRefresh();
  const all = getPrematch(sport);
  const mainIds = new Set(MAIN_MARKET_IDS[sport] || []);

  return all
    .map((m: any) => {
      const specialMarkets = (m.market || []).filter((mk: any) => !mainIds.has(mk.market_id));
      if (specialMarkets.length === 0) return null;
      return { ...m, market: specialMarkets };
    })
    .filter(Boolean);
}

export function getSpecialUpdates(sport: string, since: number) {
  const now = Date.now();
  const entry = prematchCache.get(sport);
  const mainIds = new Set(MAIN_MARKET_IDS[sport] || []);

  const updated: any[] = [];
  if (entry) {
    for (const [, matchEntry] of entry.matches) {
      if (matchEntry.changedAt > since) {
        const specialMarkets = (matchEntry.data.market || []).filter((mk: any) => !mainIds.has(mk.market_id));
        if (specialMarkets.length > 0) {
          updated.push({ ...matchEntry.data, market: specialMarkets });
        }
      }
    }
  }

  const sportRemoved = removedMatches.get(sport);
  const removed: (number | string)[] = [];
  if (sportRemoved) {
    for (const [id, ts] of sportRemoved) {
      if (ts > since) removed.push(id);
    }
  }

  return { updated, removed, since, server_time: now };
}

export function getCacheInfo(sport: string, type: 'prematch' | 'inplay') {
  const cache = type === 'prematch' ? prematchCache : inplayCache;
  const entry = cache.get(sport);
  return {
    count: entry?.matches.size || 0,
    updatedAt: entry?.updatedAt || 0,
    age: entry ? Date.now() - entry.updatedAt : -1
  };
}

// ────── relay_service 호환 API ──────

/** relay_service/inplay.php 용 — raw compact 데이터 반환 */
export function getInplayRaw(sport: string): any[] {
  return inplayRawCache.get(sport) || [];
}

export function getAllInplayRaw(): any[] {
  const all: any[] = [];
  for (const [, list] of inplayRawCache) all.push(...list);
  return all;
}

/** relay_service/relay.php 용 — ID 배치 조회 (prematch + inplay 통합) */
export function getMatchesByIds(sport: string, ids: (number | string)[]): any[] {
  const idSet = new Set(ids.map(Number));
  const results: any[] = [];

  // prematch 캐시 검색
  const pm = prematchCache.get(sport);
  if (pm) {
    for (const [, entry] of pm.matches) {
      const mid = entry.data.id || entry.data.prematch_id;
      if (idSet.has(mid)) results.push(entry.data);
    }
  }
  // inplay 캐시 검색 (transformed - flat 형식)
  const ip = inplayCache.get(sport);
  if (ip) {
    for (const [, entry] of ip.matches) {
      const mid = entry.data.id || entry.data.inplay_id;
      if (idSet.has(mid) && !results.find(r => (r.id || r.prematch_id) === mid)) {
        results.push(entry.data);
      }
    }
  }
  return results;
}

/** relay_service/relay_all.php 용 — 프리매치 페이지네이션 + status 필터 */
export function getPrematchPaginated(sport: string, page: number, pageSize: number, statusFilter?: number) {
  let all = getPrematch(sport);
  if (statusFilter !== undefined) {
    all = all.filter((m: any) => m.status_id === statusFilter);
  }
  const total = all.length;
  const totalPages = Math.ceil(total / pageSize) || 1;
  const offset = (page - 1) * pageSize;
  const list = all.slice(offset, offset + pageSize);
  return { list, pagination: { total, total_pages: totalPages } };
}

/** relay_service/relay_latest_all.php 용 — 전종목 최근 변경분 */
export function getRecentAllSports(tsSeconds: number, bettype: string = 'multi'): Record<string, any[]> {
  const since = Date.now() - (tsSeconds * 1000);
  const data: Record<string, any[]> = {};

  for (const sport of SPORTS) {
    const matches: any[] = [];

    // prematch 캐시에서 변경분
    const pmEntry = prematchCache.get(sport);
    if (pmEntry) {
      for (const [, me] of pmEntry.matches) {
        if (me.changedAt > since) {
          matches.push({ ...me.data, is_inplay_ing: 0, bet_type: bettype });
        }
      }
    }
    // inplay 캐시에서 변경분 (flat 형식)
    const ipEntry = inplayCache.get(sport);
    if (ipEntry) {
      for (const [, me] of ipEntry.matches) {
        if (me.changedAt > since) {
          matches.push({ ...me.data, is_inplay_ing: 1, bet_type: bettype });
        }
      }
    }

    // bettype 필터링
    if (bettype === 'special') {
      const sportMainIds = new Set(MAIN_MARKET_IDS[sport] || []);
      const filtered = matches
        .map(m => {
          const specialMarkets = (m.market || []).filter((mk: any) => !sportMainIds.has(mk.market_id));
          if (specialMarkets.length === 0) return null;
          return { ...m, market: specialMarkets };
        })
        .filter(Boolean);
      if (filtered.length > 0) data[sport] = filtered;
    } else {
      if (matches.length > 0) data[sport] = matches;
    }
  }
  return data;
}

export { SPORTS };
