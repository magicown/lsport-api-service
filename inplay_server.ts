import type { PageServerLoad } from './$types';
import { getInplay } from '$lib/api-cache';

// 종목별 마켓 ID: [1X2/승무패, 핸디캡, 언오버]
const MARKET_IDS: Record<string, { m: number[]; hc: number[]; ou: number[] }> = {
  soccer:            { m: [10001], hc: [10008], ou: [10013] },
  basketball:        { m: [16001], hc: [16002], ou: [16003] },
  baseball:          { m: [14001], hc: [14002], ou: [14003] },
  volleyball:        { m: [18001], hc: [18002], ou: [18003] },
  icehockey:         { m: [15004], hc: [15002], ou: [15003] },
  handball:          { m: [17001], hc: [17002], ou: [17003] },
  americanfootball:  { m: [13001], hc: [13002], ou: [13003] },
  tennis:            { m: [19001], hc: [19002], ou: [19003] },
  tabletennis:       { m: [20001], hc: [20002], ou: [20003] },
  esports:           { m: [21001], hc: [21002], ou: [21003] },
  boxingufc:         { m: [22001], hc: [22002], ou: [22003] },
};

function findMarket(markets: any[], ids: number[]) {
  return markets.find((x: any) => ids.includes(x.market_id));
}

function extract1X2(mk: any) {
  if (!mk?.list?.[0]?.odds) return { h: '', d: '', a: '', mid: 0, on: ['Home', 'Draw', 'Away'], ms: false };
  const mid = mk.market_id;
  const line = mk.list[0];
  const odds = line.odds;
  const ms = !!(mk.stop || line.stop);
  const ho = odds.find((o: any) => o.name === 'Home' || o.name === '1');
  const dr = odds.find((o: any) => o.name === 'Draw' || o.name === 'X');
  const aw = odds.find((o: any) => o.name === 'Away' || o.name === '2');
  return {
    h: ho?.value || '', d: dr?.value || '', a: aw?.value || '',
    mid, on: [ho?.name || 'Home', dr?.name || 'Draw', aw?.name || 'Away'], ms,
  };
}

function extractHC(mk: any) {
  if (!mk?.list?.[0]) return { hcl: '', hch: '', hca: '', hcs: false };
  const l = mk.list[0];
  const lineName = l.name || l.line || '';
  const odds = l.odds || [];
  const hcs = !!(mk.stop || l.stop);
  return {
    hcl: lineName,
    hch: odds.find((o: any) => o.name === 'Home' || o.name === '1')?.value || '',
    hca: odds.find((o: any) => o.name === 'Away' || o.name === '2')?.value || '',
    hcs,
  };
}

function extractOU(mk: any) {
  if (!mk?.list?.[0]) return { oul: '', ouo: '', ouu: '', ous: false };
  const l = mk.list[0];
  const lineName = l.name || l.line || '';
  const odds = l.odds || [];
  const ous = !!(mk.stop || l.stop);
  return {
    oul: lineName,
    ouo: odds.find((o: any) => o.name === 'Over')?.value || '',
    ouu: odds.find((o: any) => o.name === 'Under')?.value || '',
    ous,
  };
}

// 인플레이 리스트용 초경량 데이터
function trimForList(matches: any[], sport: string): any[] {
  const ids = MARKET_IDS[sport] || MARKET_IDS.soccer;
  return matches.map((m: any) => {
    const markets = m.market || [];
    const mk1x2 = findMarket(markets, ids.m) || markets[0];
    const mkHC = findMarket(markets, ids.hc);
    const mkOU = findMarket(markets, ids.ou);

    const { h, d, a, mid, on, ms } = extract1X2(mk1x2);
    const { hcl, hch, hca, hcs } = extractHC(mkHC);
    const { oul, ouo, ouu, ous } = extractOU(mkOU);

    const sh = m.score?.home?.ft ?? m.score?.home?.score ?? '';
    const sa = m.score?.away?.ft ?? m.score?.away?.score ?? '';

    return {
      id: m.id, pid: m.prematch_id, iid: m.inplay_id,
      lid: m.league_id, ln: m.league_name || m.league_name_eng || '',
      li: m.league_image || '', ck: m.cc_kr || m.cc || '', ci: m.cc_image || '',
      hn: m.home_name, an: m.away_name,
      hi: m.home_image || '', ai: m.away_image || '',
      sk: m.status_kr || '', si: m.status_id || 0,
      mm: m.match_minute || '', mts: m.match_time_str || '',
      mtsec: m.match_time_seconds || 0, fat: m.fetched_at || 0,
      t: m.time || '', tu: m.time_unix || 0,
      sh, sa, h, d, a, mid, on, ms,
      hcl, hch, hca, hcs, oul, ouo, ouu, ous,
    };
  });
}

export const load: PageServerLoad = async ({ params }) => {
  const sport = params.sport || 'soccer';
  const matches = trimForList(getInplay(sport), sport);
  return { matches, sport };
};
