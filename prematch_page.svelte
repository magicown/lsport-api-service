<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount, onDestroy } from 'svelte';
  import MatchDetail from '$lib/components/MatchDetail.svelte';

  let { data } = $props();
  let matches = $derived(data.matches || []);
  let sport = $derived(data.sport || 'soccer');
  let selectedMatch: any = $state(null);
  let detailData: any = $state(null);
  let loadingDetail = $state(false);
  let searchQuery = $state('');
  let showCount = $state(50);
  let scrollContainer: HTMLDivElement;
  let timeFilter = $state<'current' | 'last24'>('current');

  let filtered = $derived.by(() => {
    const now = Date.now();
    const H = 3600_000;
    let list = matches;

    if (timeFilter === 'current') {
      const from = now - 4 * H;
      list = list.filter((m: any) => {
        const tu = (m.tu || 0) * 1000;
        return tu >= from;
      });
    } else {
      const from = now - 12 * H;
      const to = now + 12 * H;
      list = list.filter((m: any) => {
        const tu = (m.tu || 0) * 1000;
        return tu >= from && tu <= to;
      });
    }

    if (!searchQuery) return list;
    const q = searchQuery.toLowerCase();
    return list.filter((m: any) =>
      m.hn?.toLowerCase().includes(q) || m.an?.toLowerCase().includes(q) ||
      m.ln?.toLowerCase().includes(q) || String(m.pid || '').includes(q) || String(m.id || '').includes(q)
    );
  });

  let visibleMatches = $derived(filtered.slice(0, showCount));

  interface TimeLeagueGroup {
    timeKey: string; league_id: number;
    ln: string; li: string; ck: string; ci: string;
    matches: any[]; time_unix: number;
  }

  let grouped = $derived.by(() => {
    const sorted = [...visibleMatches].sort((a: any, b: any) => (a.tu || 0) - (b.tu || 0));
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

  function handleScroll() {
    if (!scrollContainer || showCount >= filtered.length) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
    if (scrollTop + clientHeight >= scrollHeight * (2 / 3)) {
      showCount += 50;
    }
  }

  onMount(() => {
    scrollContainer?.addEventListener('scroll', handleScroll);
  });
  onDestroy(() => {
    scrollContainer?.removeEventListener('scroll', handleScroll);
  });

  async function selectMatch(m: any) {
    selectedMatch = m;
    detailData = null;
    loadingDetail = true;
    try {
      const res = await fetch(`/api/match/${sport}/${m.pid || m.id}`);
      if (res.ok) detailData = await res.json();
    } catch {}
    loadingDetail = false;
  }
</script>

<div class="flex gap-0 h-[calc(100vh-96px)]">
  <div class="flex-1 overflow-y-auto" bind:this={scrollContainer}>
    <div class="flex items-center gap-2 px-4 py-2 bg-tw-card border-b border-tw-border">
      <button
        class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors {timeFilter === 'current' ? 'bg-tw-accent text-white' : 'bg-tw-darker text-tw-text-muted border border-tw-border hover:text-tw-text'}"
        onclick={() => { timeFilter = 'current'; showCount = 50; }}
      >현재</button>
      <button
        class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors {timeFilter === 'last24' ? 'bg-tw-accent text-white' : 'bg-tw-darker text-tw-text-muted border border-tw-border hover:text-tw-text'}"
        onclick={() => { timeFilter = 'last24'; showCount = 50; }}
      >지난24시간</button>
      <input type="text" bind:value={searchQuery} placeholder="경기번호 혹은 팀, 리그명"
        class="flex-1 px-3 py-1.5 rounded-lg border border-tw-border bg-tw-darker text-tw-text text-sm placeholder:text-tw-text-muted focus:outline-none focus:border-tw-accent" />
      <button class="bg-tw-accent hover:bg-tw-accent-hover text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors">검색</button>
      <span class="text-tw-text-muted text-sm ml-2">{filtered.length}경기</span>
    </div>

    {#each grouped as group, idx}
      {#if shouldShowTimeHeader(idx)}
        <div class="bg-tw-darker text-tw-accent text-sm font-bold px-4 py-1.5 border-b border-tw-border">
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

      {#each group.matches as m}
        {@const finished = isFinished(m.sk)}
        <button
          class="w-full text-left border-b border-tw-border/50 hover:bg-tw-highlight transition-colors {selectedMatch?.id === m.id ? 'bg-tw-accent/10' : ''} {finished ? 'opacity-45' : ''}"
          onclick={() => selectMatch(m)}
        >
          <div class="flex items-center px-3 py-2.5">
            <!-- 왼쪽: 시간 + 팀 -->
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
            <!-- 오른쪽: 3종 배당 -->
            <div class="flex shrink-0">
              <div class="flex">
                <span class="odds-cell {m.h ? 'text-tw-text-bright' : 'text-tw-text-muted'}">{m.h || '-'}</span>
                <span class="odds-cell {m.d ? 'text-tw-text-bright' : 'text-tw-text-muted'}">{m.d || '-'}</span>
                <span class="odds-cell {m.a ? 'text-tw-text-bright' : 'text-tw-text-muted'}">{m.a || '-'}</span>
              </div>
              <div class="w-px bg-tw-border/40 mx-1"></div>
              <div class="flex">
                <span class="odds-cell {m.hch ? 'text-tw-text-bright' : 'text-tw-text-muted'}">{m.hch || '-'}</span>
                <span class="w-[44px] text-center text-sm font-bold text-tw-warning leading-[44px]">{m.hcl || ''}</span>
                <span class="odds-cell {m.hca ? 'text-tw-text-bright' : 'text-tw-text-muted'}">{m.hca || '-'}</span>
              </div>
              <div class="w-px bg-tw-border/40 mx-1"></div>
              <div class="flex">
                <span class="odds-cell {m.ouo ? 'text-tw-text-bright' : 'text-tw-text-muted'}">{m.ouo || '-'}</span>
                <span class="w-[44px] text-center text-sm font-bold text-tw-success leading-[44px]">{m.oul || ''}</span>
                <span class="odds-cell {m.ouu ? 'text-tw-text-bright' : 'text-tw-text-muted'}">{m.ouu || '-'}</span>
              </div>
            </div>
          </div>
        </button>
      {/each}
    {/each}

    {#if showCount < filtered.length}
      <div class="py-4 text-center text-tw-text-muted text-sm">
        <div class="inline-block w-4 h-4 border-2 border-tw-accent border-t-transparent rounded-full animate-spin"></div>
        <span class="ml-2">로딩 중... ({showCount}/{filtered.length})</span>
      </div>
    {/if}

    {#if grouped.length === 0}
      <div class="text-center text-tw-text-muted py-20 text-lg">데이터가 없습니다</div>
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
