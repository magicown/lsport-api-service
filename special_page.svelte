<script lang="ts">
  import { goto } from '$app/navigation';
  import MatchDetail from '$lib/components/MatchDetail.svelte';

  let { data } = $props();
  let matches = $derived(data.matches || []);
  let sport = $derived(data.sport || 'soccer');
  let selectedMatch: any = $state(null);
  let detailData: any = $state(null);
  let loadingDetail = $state(false);
  let searchQuery = $state('');

  let filtered = $derived.by(() => {
    if (!searchQuery) return matches;
    const q = searchQuery.toLowerCase();
    return matches.filter((m: any) =>
      m.hn?.toLowerCase().includes(q) || m.an?.toLowerCase().includes(q) ||
      m.ln?.toLowerCase().includes(q) || String(m.pid || '').includes(q) || String(m.id || '').includes(q)
    );
  });

  interface TimeLeagueGroup {
    timeKey: string; league_id: number;
    ln: string; li: string; ck: string; ci: string;
    matches: any[]; time_unix: number;
  }

  let grouped = $derived.by(() => {
    const sorted = [...filtered].sort((a: any, b: any) => (a.tu || 0) - (b.tu || 0));
    const groups: TimeLeagueGroup[] = [];
    const map = new Map<string, TimeLeagueGroup>();
    for (const m of sorted) {
      const timeKey = m.t || '';
      const key = timeKey + '|' + m.lid;
      if (!map.has(key)) {
        map.set(key, { timeKey, league_id: m.lid, ln: m.ln || '', li: m.li || '', ck: m.ck || '', ci: m.ci || '', matches: [], time_unix: m.tu || 0 });
        groups.push(map.get(key)!);
      }
      map.get(key)!.matches.push(m);
    }
    groups.sort((a, b) => a.time_unix !== b.time_unix ? a.time_unix - b.time_unix : a.ln.localeCompare(b.ln));
    return groups;
  });

  function formatTime(t: string) {
    if (!t) return '';
    const d = new Date(t);
    return String(d.getMonth()+1) + '/' + String(d.getDate()).padStart(2,'0') + ' ' + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
  }
  function formatTimeShort(t: string) {
    if (!t) return '';
    const d = new Date(t);
    return String(d.getMonth()+1).padStart(2,'0') + '/' + String(d.getDate()).padStart(2,'0') + ' ' + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
  }
  function shouldShowTimeHeader(idx: number) {
    if (idx === 0) return true;
    return grouped[idx].timeKey !== grouped[idx - 1].timeKey;
  }
  function isFinished(sk: string) {
    return sk === '경기종료' || sk === 'FT' || sk === 'Ended';
  }

  async function selectMatch(m: any) {
    selectedMatch = m;
    detailData = null;
    loadingDetail = true;
    try {
      const res = await fetch(`/api/match/${sport}/${m.pid || m.id}?type=special`);
      if (res.ok) detailData = await res.json();
    } catch {}
    loadingDetail = false;
  }
</script>

<div class="flex gap-0 h-[calc(100vh-96px)]">
  <div class="flex-1 overflow-y-auto">
    <div class="flex items-center gap-2 px-4 py-2 bg-tw-card border-b border-tw-border">
      <input type="text" bind:value={searchQuery} placeholder="경기번호 혹은 팀, 리그명"
        class="flex-1 px-3 py-1.5 rounded-lg border border-tw-border bg-tw-darker text-tw-text text-sm placeholder:text-tw-text-muted focus:outline-none focus:border-tw-accent" />
      <button class="bg-tw-accent hover:bg-tw-accent-hover text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors">검색</button>
      <span class="text-tw-text-muted text-sm ml-2">{filtered.length}경기</span>
      <span class="text-tw-warning text-xs font-bold px-1.5 py-0.5 bg-tw-warning/15 rounded">SP</span>
    </div>

    {#each grouped as group, idx}
      {#if shouldShowTimeHeader(idx)}
        <div class="bg-tw-darker text-tw-accent text-xs font-bold px-4 py-1.5 border-b border-tw-border">
          {formatTimeShort(group.timeKey)}
        </div>
      {/if}

      <!-- 리그 헤더 -->
      <div class="flex items-center bg-tw-card/80 border-b border-tw-border px-3 py-1.5">
        <div class="flex items-center gap-1.5 min-w-0 flex-1">
          {#if group.li}<img src={group.li} alt="" class="w-5 h-5 shrink-0" />{/if}
          <span class="text-sm font-medium text-tw-text-bright truncate">{group.ln}</span>
          {#if group.ci}<img src={group.ci} alt="" class="w-4 h-4 shrink-0 ml-0.5" />{/if}
          <span class="text-xs text-tw-text-muted">{group.ck}</span>
        </div>
        <div class="flex shrink-0 text-xs font-bold">
          <span class="w-[80px] text-center text-tw-warning">마켓</span>
          <span class="w-[72px] text-center text-tw-accent">1</span>
          <span class="w-[72px] text-center text-tw-accent">X</span>
          <span class="w-[72px] text-center text-tw-accent">2</span>
        </div>
      </div>

      {#each group.matches as m}
        {@const finished = isFinished(m.sk || '')}
        <button
          class="w-full text-left border-b border-tw-border/50 hover:bg-tw-highlight transition-colors {selectedMatch?.id === m.id ? 'bg-tw-warning/10' : ''} {finished ? 'opacity-50' : ''}"
          onclick={() => selectMatch(m)}
        >
          <div class="flex items-center px-3 py-2.5">
            <div class="flex-1 min-w-0 flex items-center gap-3">
              <div class="w-[160px] shrink-0">
                <div class="flex items-center gap-2">
                  <span class="text-sm text-tw-text-muted whitespace-nowrap">{formatTime(m.t)}</span>
                  {#if finished}
                    <span class="text-xs px-1.5 py-0.5 rounded bg-tw-text-muted/20 text-tw-text-muted font-bold">종료</span>
                  {:else if m.sk}
                    <span class="text-sm text-tw-danger font-bold">{m.sk}</span>
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
                <div class="w-[40px] shrink-0 text-center">
                  <div class="text-base font-bold {finished ? 'text-tw-text-muted' : 'text-tw-warning'}">{m.sh}</div>
                  <div class="text-base font-bold {finished ? 'text-tw-text-muted' : 'text-tw-warning'}">{m.sa}</div>
                </div>
              {/if}
            </div>
            <div class="flex shrink-0">
              <span class="w-[80px] text-center text-xs text-tw-warning font-medium leading-[40px] truncate">{m.mn || '스페셜'}</span>
              <span class="odds-cell {m.h ? 'text-tw-text-bright' : 'text-tw-text-muted'}">{m.h || '-'}</span>
              <span class="odds-cell {m.d ? 'text-tw-text-bright' : 'text-tw-text-muted'}">{m.d || '-'}</span>
              <span class="odds-cell {m.a ? 'text-tw-text-bright' : 'text-tw-text-muted'}">{m.a || '-'}</span>
            </div>
          </div>
        </button>
      {/each}
    {/each}

    {#if grouped.length === 0}
      <div class="text-center text-tw-text-muted py-20 text-lg">스페셜 마켓 데이터가 없습니다</div>
    {/if}
  </div>

  {#if selectedMatch}
    <div class="w-[420px] border-l border-tw-border overflow-y-auto bg-tw-card">
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
    cursor: pointer;
  }
  .odds-cell:hover {
    background-color: rgba(32, 161, 208, 0.25);
    color: #fff;
  }
</style>
