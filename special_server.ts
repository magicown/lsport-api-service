import type { PageServerLoad } from './$types';
import { getSpecial } from '$lib/api-cache';

// 스페셜 리스트용 초경량 데이터
function trimForList(matches: any[]): any[] {
  return matches.map((m: any) => {
    // 첫 번째 스페셜 마켓에서 배당 추출
    let h = '', d = '', a = '', mn = '', ms = false;
    const mk = (m.market || [])[0];
    if (mk) {
      mn = mk.market_name || '';
      ms = !!(mk.stop || mk.list?.[0]?.stop);
      if (mk.list?.[0]?.odds) {
        const odds = mk.list[0].odds;
        h = odds[0]?.value || '';
        d = odds.length >= 3 ? (odds[1]?.value || '') : '';
        a = odds[odds.length - 1]?.value || '';
      }
    }

    const sh = m.score?.home?.ft ?? m.score?.home?.score ?? '';
    const sa = m.score?.away?.ft ?? m.score?.away?.score ?? '';

    return {
      id: m.id, pid: m.prematch_id, iid: m.inplay_id || 0,
      lid: m.league_id, ln: m.league_name || m.league_name_eng || '',
      li: m.league_image || '', ck: m.cc_kr || m.cc || '', ci: m.cc_image || '',
      hn: m.home_name, an: m.away_name,
      hi: m.home_image || '', ai: m.away_image || '',
      sk: m.status_kr || '', t: m.time || '', tu: m.time_unix || 0,
      sh, sa, h, d, a, mn, ms,
    };
  });
}

export const load: PageServerLoad = async ({ params }) => {
  const sport = params.sport || 'soccer';
  const matches = trimForList(getSpecial(sport));
  return { matches, sport };
};
