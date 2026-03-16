<script lang="ts">
  let { match, onclose }: { match: any; onclose: () => void } = $props();
  let markets = $derived(match?.market || []);

  function getScore() {
    if (!match?.score) return '';
    const h = match.score.home?.ft ?? match.score.home?.score ?? '';
    const a = match.score.away?.ft ?? match.score.away?.score ?? '';
    if (h === '' && a === '') return '';
    return h + '-' + a;
  }

  function getMatchIds() {
    const pid = match.prematch_id || match.id || '';
    const iid = match.inplay_id || '0';
    return pid + ' / ' + iid;
  }
</script>

<div class="p-4 space-y-3">
  <div class="flex items-center justify-between border-b border-tw-border pb-2">
    <h3 class="text-sm font-bold text-tw-text-bright">경기 상세</h3>
    <button onclick={onclose} class="text-tw-text-muted hover:text-tw-text-bright text-lg w-6 h-6 flex items-center justify-center rounded hover:bg-tw-highlight">&times;</button>
  </div>

  <!-- 경기 정보 -->
  <div class="bg-tw-darker rounded-lg p-3 space-y-2 border border-tw-border">
    <div class="flex items-center gap-2 text-xs text-tw-text-muted">
      {#if match.league_image}
        <img src={match.league_image} alt="" class="w-4 h-4" />
      {/if}
      <span class="font-medium text-tw-text">{match.league_name || ''}</span>
      {#if match.cc_image}
        <img src={match.cc_image} alt="" class="w-3 h-3 ml-1" />
      {/if}
      <span>{match.cc_kr || match.cc || ''}</span>
    </div>
    <div class="text-xs text-tw-text-muted font-mono">{getMatchIds()}</div>
    <div class="text-center space-y-1 py-2">
      <div class="flex items-center justify-center gap-2">
        {#if match.home_image}
          <img src={match.home_image} alt="" class="w-6 h-6" />
        {/if}
        <span class="text-tw-text-bright font-medium">{match.home_name}</span>
      </div>
      {#if getScore()}
        <div class="text-tw-warning text-2xl font-bold">{getScore()}</div>
      {:else}
        <div class="text-tw-text-muted text-sm">VS</div>
      {/if}
      <div class="flex items-center justify-center gap-2">
        <span class="text-tw-text-bright font-medium">{match.away_name}</span>
        {#if match.away_image}
          <img src={match.away_image} alt="" class="w-6 h-6" />
        {/if}
      </div>
    </div>
    <div class="flex justify-between items-center text-xs text-tw-text-muted">
      <span>{match.time || ''}</span>
      {#if match.match_time_str || match.match_minute}
        <span class="text-tw-success font-bold text-sm tabular-nums">{match.match_time_str || (match.match_minute + "'")}</span>
      {/if}
      <span class="text-tw-accent font-medium">{match.status_kr || ''}</span>
    </div>
  </div>

  <div class="text-tw-text-muted text-xs">{markets.length}개 마켓</div>

  {#each markets as mk}
    {@const mkStopped = !!(mk.stop)}
    <div class="border border-tw-border rounded-lg overflow-hidden {mkStopped ? 'opacity-60' : ''}">
      <div class="px-3 py-1.5 bg-tw-darker border-b border-tw-border flex items-center justify-between">
        <span class="text-tw-accent text-xs font-medium">{mk.market_name}</span>
        {#if mkStopped}
          <span class="text-[10px] font-bold text-red-400 bg-red-400/15 border border-red-400/30 px-1.5 py-0.5 rounded">중지</span>
        {/if}
      </div>
      <div class="px-3 py-2 space-y-1">
        {#each mk.list || [] as line, li}
          {@const lineStopped = mkStopped || !!(line.stop)}
          {#if mk.list.length > 1}
            <div class="text-tw-text-muted text-xs mt-1 flex items-center gap-1">
              라인 {li + 1} {#if line.name}<span class="text-tw-warning">({line.name})</span>{/if}
              {#if lineStopped && !mkStopped}
                <span class="text-[9px] font-bold text-red-400 bg-red-400/15 px-1 rounded">중지</span>
              {/if}
            </div>
          {/if}
          <div class="flex flex-wrap gap-1">
            {#each line.odds || [] as odd}
              {@const oddStopped = lineStopped || !!(odd.stop)}
              <div class="flex-1 min-w-[4rem] border rounded-md px-2 py-1.5 text-center transition-colors
                {oddStopped ? 'border-red-400/20 bg-red-950/20' : 'border-tw-border bg-tw-darker hover:bg-tw-highlight'}">
                <div class="text-xs truncate {oddStopped ? 'text-tw-text-muted/50' : 'text-tw-text-muted'}">{odd.name || ''}</div>
                <div class="text-sm font-medium {oddStopped ? 'text-red-400/40 line-through' : 'text-tw-text-bright'}">{odd.value || '-'}</div>
              </div>
            {/each}
          </div>
        {/each}
      </div>
    </div>
  {/each}

  {#if markets.length === 0}
    <div class="text-center text-tw-text-muted text-sm py-4">추가 마켓이 없습니다</div>
  {/if}
</div>
