/**
 * 마켓 유틸 공통 모듈
 * 종목별 마켓 ID, 배당 추출, 리스트 축소 함수
 */

// 종목별 메인 마켓 ID: [1X2/승무패, 핸디캡, 언오버]
export const MARKET_IDS: Record<string, { m: number[]; hc: number[]; ou: number[] }> = {
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

export function findMarket(markets: any[], ids: number[]) {
  return markets.find((x: any) => ids.includes(x.market_id));
}

export function extract1X2(mk: any) {
  if (!mk?.list?.[0]?.odds) return { h: '', d: '', a: '', stopped: false };
  const line = mk.list[0];
  const odds = line.odds;
  const stopped = !!(mk.stop || line.stop);
  return {
    h: odds.find((o: any) => o.name === 'Home' || o.name === '1')?.value || '',
    d: odds.find((o: any) => o.name === 'Draw' || o.name === 'X')?.value || '',
    a: odds.find((o: any) => o.name === 'Away' || o.name === '2')?.value || '',
    stopped,
  };
}

export function extractHC(mk: any) {
  if (!mk?.list?.[0]) return { hcl: '', hch: '', hca: '', stopped: false };
  const l = mk.list[0];
  const lineName = l.name || l.line || '';
  const odds = l.odds || [];
  const stopped = !!(mk.stop || l.stop);
  return {
    hcl: lineName,
    hch: odds.find((o: any) => o.name === 'Home' || o.name === '1')?.value || '',
    hca: odds.find((o: any) => o.name === 'Away' || o.name === '2')?.value || '',
    stopped,
  };
}

export function extractOU(mk: any) {
  if (!mk?.list?.[0]) return { oul: '', ouo: '', ouu: '', stopped: false };
  const l = mk.list[0];
  const lineName = l.name || l.line || '';
  const odds = l.odds || [];
  const stopped = !!(mk.stop || l.stop);
  return {
    oul: lineName,
    ouo: odds.find((o: any) => o.name === 'Over')?.value || '',
    ouu: odds.find((o: any) => o.name === 'Under')?.value || '',
    stopped,
  };
}

/**
 * 리스트용 초경량 데이터: 3종 배당 flat 추출
 */
export function trimForList(matches: any[], sport: string): any[] {
  const ids = MARKET_IDS[sport] || MARKET_IDS.soccer;
  return matches.map((m: any) => {
    const markets = m.market || [];
    const mk1x2 = findMarket(markets, ids.m) || markets[0];
    const mkHC = findMarket(markets, ids.hc);
    const mkOU = findMarket(markets, ids.ou);

    const { h, d, a, stopped: ms } = extract1X2(mk1x2);
    const { hcl, hch, hca, stopped: hcs } = extractHC(mkHC);
    const { oul, ouo, ouu, stopped: ous } = extractOU(mkOU);

    const sh = m.score?.home?.ft ?? m.score?.home?.score ?? '';
    const sa = m.score?.away?.ft ?? m.score?.away?.score ?? '';

    return {
      id: m.id, pid: m.prematch_id, iid: m.inplay_id || 0,
      lid: m.league_id, ln: m.league_name || m.league_name_eng || '',
      li: m.league_image || '', ck: m.cc_kr || m.cc || '', ci: m.cc_image || '',
      hn: m.home_name, an: m.away_name,
      hi: m.home_image || '', ai: m.away_image || '',
      sk: m.status_kr || '', t: m.time || '', tu: m.time_unix || 0,
      sh, sa, h, d, a, ms, hcl, hch, hca, hcs, oul, ouo, ouu, ous,
    };
  });
}

/**
 * API용 풍부한 매치 데이터 변환
 */
export function formatMatchForApi(m: any, sport: string) {
  const markets = m.market || [];
  const ids = MARKET_IDS[sport] || MARKET_IDS.soccer;

  const mk1x2 = findMarket(markets, ids.m);
  const mkHC = findMarket(markets, ids.hc);
  const mkOU = findMarket(markets, ids.ou);

  const odds: any = {};
  if (mk1x2) {
    const { h, d, a } = extract1X2(mk1x2);
    odds['1x2'] = { market_id: mk1x2.market_id, home: h, draw: d, away: a };
  }
  if (mkHC) {
    const { hcl, hch, hca } = extractHC(mkHC);
    odds['handicap'] = { market_id: mkHC.market_id, line: hcl, home: hch, away: hca };
  }
  if (mkOU) {
    const { oul, ouo, ouu } = extractOU(mkOU);
    odds['over_under'] = { market_id: mkOU.market_id, line: oul, over: ouo, under: ouu };
  }

  return {
    id: m.id || m.prematch_id || m.inplay_id,
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
    start_time_unix: m.time_unix || 0,
    status: m.status_kr || '',
    score: {
      home: m.score?.home?.ft ?? m.score?.home?.score ?? '',
      away: m.score?.away?.ft ?? m.score?.away?.score ?? '',
    },
    odds,
    markets_count: markets.length,
  };
}
