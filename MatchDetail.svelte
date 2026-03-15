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
    <div class="border border-tw-border rounded-lg overflow-hidden">
      <div class="px-3 py-1.5 bg-tw-darker border-b border-tw-border">
        <span class="text-tw-accent text-xs font-medium">{mk.market_name}</span>
      </div>
      <div class="px-3 py-2 space-y-1">
        {#each mk.list || [] as line, li}
          {#if mk.list.length > 1}
            <div class="text-tw-text-muted text-xs mt-1">라인 {li + 1}</div>
          {/if}
          <div class="flex flex-wrap gap-1">
            {#each line.odds || [] as odd}
              <div class="flex-1 min-w-[4rem] border border-tw-border rounded-md px-2 py-1.5 text-center bg-tw-darker hover:bg-tw-highlight transition-colors">
                <div class="text-tw-text-muted text-xs truncate">{odd.name || ''}</div>
                <div class="text-tw-text-bright text-sm font-medium">{odd.value || '-'}</div>
              </div>
            {/each}
          </div>
        {/each}
      </div>
    </div>
  {/each}

  {#if markets.length === 0}
    <div class="text-center text-tw-text-muted text-sm py-4">마켓 데이터를 불러오는 중...</div>
  {/if}
</div>
