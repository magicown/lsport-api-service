<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import MatchDetail from '$lib/components/MatchDetail.svelte';

  let { data } = $props();
  let matches: any[] = $state(data.matches || []);
  let sport = $derived(data.sport || 'soccer');
  let selectedMatch: any = $state(null);
  let detailData: any = $state(null);
  let loadingDetail = $state(false);
  let searchQuery = $state('');
  let pollTimer: any = null;
  let tickTimer: any = null;
  let tickCount = $state(0);

  // 종목 변경 시 데이터 리셋
  $effect(() => {
    void sport;
    matches = data.matches || [];
    selectedMatch = null;
    detailData = null;
    searchQuery = '';
    prevOddsMap = new Map();
    prevScoreMap = new Map();
    prevMatchIds = new Set();
    prevStatusMap = new Map();
  });

  const PAUSED_STATUSES = new Set([
    '하프타임', '휴식', '경기종료', '연기', '취소', '중단',
    'HT', 'FT', 'Postponed', 'Cancelled', 'Suspended',
    '브레이크', '세트 간 휴식', '쿼터 간 휴식', '이닝 간 휴식',
  ]);
  const FINISHED_STATUSES = new Set(['경기종료', 'FT', 'Ended']);

  function getMatchClock(m: any): string {
    if (!m.mtsec && !m.mm) return '';
    const isPaused = PAUSED_STATUSES.has(m.sk || '');
    let baseSec = m.mtsec || 0;
    if (!isPaused && m.fat) {
      baseSec += Math.floor((Date.now() - m.fat) / 1000);
    }
    void tickCount;
    const min = Math.floor(baseSec / 60);
    const sec = baseSec % 60;
    return String(min).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
  }

  function isFinished(sk: string) { return FINISHED_STATUSES.has(sk); }

  let prevOddsMap = new Map<string, string>();
  let prevScoreMap = new Map<string, string>();
  let oddsFlash = $state(new Map<string, 'up' | 'down'>());
  let scoreFlash = $state(new Set<string | number>());
  let statusFlash = $state(new Set<string | number>());
  let newMatchIds = $state(new Set<string | number>());
  let prevMatchIds = new Set<string | number>();
  let prevStatusMap = new Map<string | number, string>();

  function buildOddsKey(matchId: any, pos: string) { return matchId + '_' + pos; }

  function detectChanges(newMatches: any[]) {
    const nextOddsFlash = new Map<string, 'up' | 'down'>();
    const nextScoreFlash = new Set<string | number>();
    const nextStatusFlash = new Set<string | number>();
    const nextNewMatch = new Set<string | number>();
    const currentIds = new Set<string | number>();
    const nextOddsMap = new Map<string, string>();
    const nextScoreMap = new Map<string, string>();

    for (const m of newMatches) {
      const mid = m.id || m.iid;
      currentIds.add(mid);
      if (!prevMatchIds.has(mid)) nextNewMatch.add(mid);
      const scoreStr = (m.sh || '') + '-' + (m.sa || '');
      nextScoreMap.set(String(mid), scoreStr);
      if (prevScoreMap.get(String(mid)) !== undefined && prevScoreMap.get(String(mid)) !== scoreStr) nextScoreFlash.add(mid);
      if (prevStatusMap.get(mid) !== undefined && prevStatusMap.get(mid) !== (m.sk || '')) nextStatusFlash.add(mid);
      for (const pos of ['h', 'd', 'a', 'hch', 'hca', 'ouo', 'ouu']) {
        const key = buildOddsKey(mid, pos);
        const val = m[pos] || '';
        nextOddsMap.set(key, val);
        const prev = prevOddsMap.get(key);
        if (prev !== undefined && prev !== val) {
          const pv = parseFloat(prev), nv = parseFloat(val);
          if (!isNaN(pv) && !isNaN(nv)) nextOddsFlash.set(key, nv > pv ? 'up' : 'down');
        }
      }
    }
    prevOddsMap = nextOddsMap; prevScoreMap = nextScoreMap; prevMatchIds = currentIds;
    const nextStatusMap = new Map<string | number, string>();
    for (const m of newMatches) nextStatusMap.set(m.id || m.iid, m.sk || '');
    prevStatusMap = nextStatusMap;
    oddsFlash = nextOddsFlash; scoreFlash = nextScoreFlash; statusFlash = nextStatusFlash; newMatchIds = nextNewMatch;
    setTimeout(() => { oddsFlash = new Map(); scoreFlash = new Set(); statusFlash = new Set(); newMatchIds = new Set(); }, 1500);
  }

  function getOddsFlashClass(matchId: any, pos: string): string {
    const dir = oddsFlash.get(buildOddsKey(matchId, pos));
    if (dir === 'up') return 'odds-flash-up';
    if (dir === 'down') return 'odds-flash-down';
    return '';
  }

  async function pollData() {
    try {
      const res = await fetch('/api/inplay/' + sport);
      if (!res.ok) return;
      const newData = await res.json();
      detectChanges(newData);
      matches = newData;
      if (selectedMatch) {
        const updated = newData.find((m: any) => (m.id || m.iid) === (selectedMatch.id || selectedMatch.iid));
        if (updated) {
          selectedMatch = updated;
          // 상세 패널도 주기적으로 갱신
          try {
            const dres = await fetch(`/api/match/${sport}/${updated.iid || updated.id}?type=inplay`);
            if (dres.ok) detailData = await dres.json();
          } catch {}
        }
      }
    } catch {}
  }

  onMount(() => {
    for (const m of matches) {
      const mid = m.id || m.iid;
      prevMatchIds.add(mid); prevStatusMap.set(mid, m.sk || '');
      prevScoreMap.set(String(mid), (m.sh || '') + '-' + (m.sa || ''));
      for (const pos of ['h', 'd', 'a', 'hch', 'hca', 'ouo', 'ouu']) prevOddsMap.set(buildOddsKey(mid, pos), m[pos] || '');
    }
    pollTimer = setInterval(pollData, 3000);
    tickTimer = setInterval(() => { tickCount++; }, 1000);
  });
  onDestroy(() => { if (pollTimer) clearInterval(pollTimer); if (tickTimer) clearInterval(tickTimer); });

  async function selectMatch(m: any) {
    selectedMatch = m;
    detailData = null;
    loadingDetail = true;
    try {
      const res = await fetch(`/api/match/${sport}/${m.iid || m.id}?type=inplay`);
      if (res.ok) detailData = await res.json();
    } catch {}
    loadingDetail = false;
  }

  let filtered = $derived.by(() => {
    if (!searchQuery) return matches;
    const q = searchQuery.toLowerCase();
    return matches.filter((m: any) =>
      m.hn?.toLowerCase().includes(q) || m.an?.toLowerCase().includes(q) ||
      m.ln?.toLowerCase().includes(q) || String(m.pid || '').includes(q) || String(m.id || '').includes(q)
    );
  });

  let grouped = $derived.by(() => {
    const groups: any[] = []; const map = new Map<number, any>();
    for (const m of filtered) {
      const lid = m.lid;
      if (!map.has(lid)) { map.set(lid, { league_id: lid, ln: m.ln || '', li: m.li || '', ck: m.ck || '', ci: m.ci || '', matches: [] as any[] }); groups.push(map.get(lid)!); }
      map.get(lid)!.matches.push(m);
    }
    groups.sort((a, b) => a.ln.localeCompare(b.ln));
    return groups;
  });
</script>

<div class="flex gap-0 h-[calc(100vh-96px)]">
  <div class="flex-1 overflow-y-auto">
    <div class="flex items-center gap-2 px-4 py-2 bg-tw-card border-b border-tw-border">
      <input type="text" bind:value={searchQuery} placeholder="경기번호 혹은 팀, 리그명"
        class="flex-1 px-3 py-1.5 rounded-lg border border-tw-border bg-tw-darker text-tw-text text-sm placeholder:text-tw-text-muted focus:outline-none focus:border-tw-accent" />
      <button class="bg-tw-accent hover:bg-tw-accent-hover text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors">검색</button>
      <span class="text-tw-text-muted text-sm ml-2">{filtered.length}경기</span>
      <span class="text-tw-danger text-xs animate-pulse font-bold flex items-center gap-1">
        <span class="w-1.5 h-1.5 bg-tw-danger rounded-full inline-block"></span> LIVE
      </span>
    </div>

    {#each grouped as group}
      <!-- 리그 헤더 -->
      <div class="flex items-center bg-tw-card/80 border-b border-tw-border px-3 py-1.5">
        <div class="flex items-center gap-1.5 min-w-0 flex-1">
          {#if group.li}<img src={group.li} alt="" class="w-5 h-5 shrink-0" />{/if}
          <span class="text-sm font-medium text-tw-text-bright truncate">{group.ln}</span>
          {#if group.ci}<img src={group.ci} alt="" class="w-4 h-4 shrink-0 ml-0.5" />{/if}
          <span class="text-xs text-tw-text-muted">{group.ck}</span>
        </div>
        <div class="flex shrink-0">
          <div class="flex items-center">
            <span class="w-[72px] text-center text-xs font-bold text-tw-accent">1</span>
            <span class="w-[72px] text-center text-xs font-bold text-tw-accent">X</span>
            <span class="w-[72px] text-center text-xs font-bold text-tw-accent">2</span>
          </div>
          <div class="w-px bg-tw-border/40 mx-1"></div>
          <div class="flex items-center">
            <span class="w-[72px] text-center text-xs font-bold text-tw-warning">H1</span>
            <span class="w-[44px] text-center text-xs font-bold text-tw-warning">HC</span>
            <span class="w-[72px] text-center text-xs font-bold text-tw-warning">H2</span>
          </div>
          <div class="w-px bg-tw-border/40 mx-1"></div>
          <div class="flex items-center">
            <span class="w-[72px] text-center text-xs font-bold text-tw-success">O</span>
            <span class="w-[44px] text-center text-xs font-bold text-tw-success">OU</span>
            <span class="w-[72px] text-center text-xs font-bold text-tw-success">U</span>
          </div>
        </div>
      </div>

      {#each group.matches as m (m.id || m.iid)}
        {@const mid = m.id || m.iid}
        {@const clock = getMatchClock(m)}
        {@const finished = isFinished(m.sk || '')}
        <button
          class="w-full text-left border-b border-tw-border/50 hover:bg-tw-highlight transition-colors
            {newMatchIds.has(mid) ? 'match-enter' : ''} {finished ? 'opacity-50' : ''}"
          class:selected={selectedMatch?.id === m.id || selectedMatch?.iid === m.iid}
          onclick={() => selectMatch(m)}
        >
          <div class="flex items-center px-3 py-2.5">
            <!-- 왼쪽: 시간/상태 + 팀 -->
            <div class="flex-1 min-w-0 flex items-center gap-3">
              <div class="w-[160px] shrink-0">
                <div class="flex items-center gap-2">
                  {#if clock}
                    <span class="text-base font-bold text-tw-success tabular-nums live-clock">{clock}</span>
                  {/if}
                  {#if finished}
                    <span class="text-xs px-1.5 py-0.5 rounded bg-tw-text-muted/20 text-tw-text-muted font-bold">종료</span>
                  {:else if m.sk}
                    <span class="text-sm font-bold {statusFlash.has(mid) ? 'status-flash' : ''} text-tw-danger">{m.sk}</span>
                  {/if}
                </div>
                <div class="flex items-center gap-1 mt-0.5">
                  <span class="text-xs text-tw-text-muted font-mono">{m.pid || m.id}</span>
                  {#if m.iid}<span class="text-xs text-tw-accent font-mono">/ {m.iid}</span>{/if}
                </div>
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-1.5">
                  {#if m.hi}<img src={m.hi} alt="" class="w-5 h-5 shrink-0" />{/if}
                  <span class="text-base text-tw-text-bright truncate {finished ? 'line-through' : ''}">{m.hn}</span>
                </div>
                <div class="flex items-center gap-1.5 mt-1">
                  {#if m.ai}<img src={m.ai} alt="" class="w-5 h-5 shrink-0" />{/if}
                  <span class="text-base text-tw-text-bright truncate {finished ? 'line-through' : ''}">{m.an}</span>
                </div>
              </div>
              {#if m.sh !== '' || m.sa !== ''}
                <div class="w-[40px] shrink-0 text-center {scoreFlash.has(mid) ? 'score-flash' : ''}">
                  <div class="text-base font-bold {finished ? 'text-tw-text-muted' : 'text-tw-warning'}">{m.sh}</div>
                  <div class="text-base font-bold {finished ? 'text-tw-text-muted' : 'text-tw-warning'}">{m.sa}</div>
                </div>
              {/if}
            </div>
            <!-- 오른쪽: 3종 배당 -->
            <div class="flex shrink-0">
              <div class="flex {m.ms ? 'stopped-group' : ''}">
                {#if m.ms}<span class="stop-badge">중지</span>{/if}
                <span class="odds-cell {m.ms ? 'stopped' : ''} {getOddsFlashClass(mid, 'h')} {m.h ? 'text-tw-text-bright' : 'text-tw-text-muted'}">{m.h || '-'}</span>
                <span class="odds-cell {m.ms ? 'stopped' : ''} {getOddsFlashClass(mid, 'd')} {m.d ? 'text-tw-text-bright' : 'text-tw-text-muted'}">{m.d || '-'}</span>
                <span class="odds-cell {m.ms ? 'stopped' : ''} {getOddsFlashClass(mid, 'a')} {m.a ? 'text-tw-text-bright' : 'text-tw-text-muted'}">{m.a || '-'}</span>
              </div>
              <div class="w-px bg-tw-border/40 mx-1"></div>
              <div class="flex {m.hcs ? 'stopped-group' : ''}">
                {#if m.hcs}<span class="stop-badge">중지</span>{/if}
                <span class="odds-cell {m.hcs ? 'stopped' : ''} {getOddsFlashClass(mid, 'hch')} {m.hch ? 'text-tw-text-bright' : 'text-tw-text-muted'}">{m.hch || '-'}</span>
                <span class="w-[44px] text-center text-sm font-bold leading-[44px] {m.hcs ? 'text-tw-text-muted/40' : 'text-tw-warning'}">{m.hcl || ''}</span>
                <span class="odds-cell {m.hcs ? 'stopped' : ''} {getOddsFlashClass(mid, 'hca')} {m.hca ? 'text-tw-text-bright' : 'text-tw-text-muted'}">{m.hca || '-'}</span>
              </div>
              <div class="w-px bg-tw-border/40 mx-1"></div>
              <div class="flex {m.ous ? 'stopped-group' : ''}">
                {#if m.ous}<span class="stop-badge">중지</span>{/if}
                <span class="odds-cell {m.ous ? 'stopped' : ''} {getOddsFlashClass(mid, 'ouo')} {m.ouo ? 'text-tw-text-bright' : 'text-tw-text-muted'}">{m.ouo || '-'}</span>
                <span class="w-[44px] text-center text-sm font-bold leading-[44px] {m.ous ? 'text-tw-text-muted/40' : 'text-tw-success'}">{m.oul || ''}</span>
                <span class="odds-cell {m.ous ? 'stopped' : ''} {getOddsFlashClass(mid, 'ouu')} {m.ouu ? 'text-tw-text-bright' : 'text-tw-text-muted'}">{m.ouu || '-'}</span>
              </div>
            </div>
          </div>
        </button>
      {/each}
    {/each}

    {#if grouped.length === 0}
      <div class="text-center text-tw-text-muted py-20 text-lg">
        {#if searchQuery}검색 결과가 없습니다{:else}진행 중인 인플레이 경기가 없습니다{/if}
      </div>
    {/if}
  </div>

  {#if selectedMatch}
    <div class="w-1/3 min-w-[380px] border-l border-tw-border overflow-y-auto bg-tw-card">
      {#if loadingDetail}
        <div class="text-center text-tw-text-muted py-10">
          <div class="inline-block w-5 h-5 border-2 border-tw-accent border-t-transparent rounded-full animate-spin"></div>
          <div class="mt-2 text-sm">로딩 중...</div>
        </div>
      {:else if detailData}
        <MatchDetail match={detailData} onclose={() => { selectedMatch = null; detailData = null; }} />
      {:else}
        <MatchDetail match={{
          id: selectedMatch.id, prematch_id: selectedMatch.pid, inplay_id: selectedMatch.iid,
          league_name: selectedMatch.ln, league_image: selectedMatch.li,
          cc_kr: selectedMatch.ck, cc_image: selectedMatch.ci,
          home_name: selectedMatch.hn, away_name: selectedMatch.an,
          home_image: selectedMatch.hi, away_image: selectedMatch.ai,
          status_kr: selectedMatch.sk, time: selectedMatch.t,
          match_time_str: selectedMatch.mts, match_minute: selectedMatch.mm,
          score: { home: { score: selectedMatch.sh }, away: { score: selectedMatch.sa } },
          market: [],
        }} onclose={() => { selectedMatch = null; detailData = null; }} />
      {/if}
    </div>
  {/if}
</div>

<style>
  .odds-cell {
    width: 72px;
    text-align: center;
    font-size: 16px;
    font-weight: 600;
    line-height: 44px;
    border-radius: 4px;
    margin: 0 1px;
    transition: all 0.2s;
  }
  .odds-cell:hover {
    background-color: rgba(32, 161, 208, 0.25);
    color: #fff;
  }
  .odds-cell.stopped {
    color: rgba(255, 255, 255, 0.2);
    text-decoration: line-through;
    pointer-events: none;
  }
  .stopped-group {
    position: relative;
    opacity: 0.5;
  }
  .stop-badge {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 2;
    font-size: 10px;
    font-weight: 700;
    color: #ef4444;
    background: rgba(239, 68, 68, 0.15);
    border: 1px solid rgba(239, 68, 68, 0.3);
    padding: 1px 6px;
    border-radius: 3px;
    white-space: nowrap;
    pointer-events: none;
  }
  :global(.odds-flash-up) { animation: flashUp 1.5s ease-out; }
  @keyframes flashUp {
    0% { background-color: rgba(32, 161, 208, 0.5); color: #fff; transform: scale(1.15); }
    50% { background-color: rgba(32, 161, 208, 0.2); }
    100% { background-color: transparent; transform: scale(1); }
  }
  :global(.odds-flash-down) { animation: flashDown 1.5s ease-out; }
  @keyframes flashDown {
    0% { background-color: rgba(254, 95, 85, 0.5); color: #fff; transform: scale(1.15); }
    50% { background-color: rgba(254, 95, 85, 0.2); }
    100% { background-color: transparent; transform: scale(1); }
  }
  :global(.score-flash) { animation: scorePulse 1.5s ease-out; }
  @keyframes scorePulse {
    0% { transform: scale(1.5); color: #FFC857; text-shadow: 0 0 12px rgba(255, 200, 87, 0.8); }
    50% { transform: scale(1.1); }
    100% { transform: scale(1); text-shadow: none; }
  }
  :global(.status-flash) { animation: statusBlink 1.5s ease-out; }
  @keyframes statusBlink {
    0%, 25%, 50%, 75% { opacity: 1; background-color: rgba(254, 95, 85, 0.3); }
    12%, 37%, 62% { opacity: 0.3; }
    100% { opacity: 1; background-color: transparent; }
  }
  :global(.live-clock) { font-variant-numeric: tabular-nums; letter-spacing: 0.5px; }
  :global(.selected) { background-color: rgba(32, 161, 208, 0.1); }
  :global(.match-enter) { animation: slideIn 0.8s ease-out; }
  @keyframes slideIn {
    0% { opacity: 0; transform: translateX(-30px); background-color: rgba(4, 167, 119, 0.2); }
    50% { opacity: 1; background-color: rgba(4, 167, 119, 0.1); }
    100% { transform: translateX(0); background-color: transparent; }
  }
</style>
