<script lang="ts">
  let { data } = $props();

  const SPORT_NAMES: Record<string, string> = {
    soccer: '축구', basketball: '농구', baseball: '야구',
    volleyball: '배구', icehockey: '아이스하키', americanfootball: '미식축구',
    tennis: '테니스', handball: '핸드볼', tabletennis: '탁구',
    esports: 'E-스포츠', boxingufc: 'UFC/복싱',
  };

  const SPORT_ICONS: Record<string, string> = {
    soccer: '\u26BD', basketball: '\uD83C\uDFC0', baseball: '\u26BE',
    volleyball: '\uD83C\uDFD0', icehockey: '\uD83C\uDFD2', americanfootball: '\uD83C\uDFC8',
    tennis: '\uD83C\uDFBE', handball: '\uD83E\uDD3E', tabletennis: '\uD83C\uDFD3',
    esports: '\uD83C\uDFAE', boxingufc: '\uD83E\uDD4A',
  };

  const PLAN_LABELS: Record<string, { label: string; color: string }> = {
    free: { label: 'Free', color: 'text-gray-400 bg-gray-400/10 border-gray-400/30' },
    standard: { label: 'Standard', color: 'text-blue-400 bg-blue-400/10 border-blue-400/30' },
    premium: { label: 'Premium', color: 'text-amber-400 bg-amber-400/10 border-amber-400/30' },
  };

  const user = data.user;
  const plan = PLAN_LABELS[user?.plan || 'free'] || PLAN_LABELS.free;

  // 종목별 바 차트용 최대값
  let sportDataMax = $derived(Math.max(...data.sportsData.map((s: any) => s.prematch + s.inplay), 1));

  // 사용량 차트용
  let dailyMax = $derived(Math.max(
    ...data.usage.daily.map((d: any) => d.prematch + d.inplay + d.special), 1
  ));
  let hourlyMax = $derived(Math.max(...data.usage.hourly.map((h: any) => h.count), 1));

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  }
</script>

<div class="p-6 max-w-[1400px] mx-auto">
  <!-- 상단 환영 배너 -->
  <div class="mb-6 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-2xl p-6 border border-blue-500/20">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-white mb-1">
          {#if data.isAdmin}
            System Dashboard
          {:else}
            {user?.company || 'Dashboard'}
          {/if}
        </h1>
        <p class="text-gray-400 text-sm">
          {user?.email}
          <span class="inline-block ml-1 px-2 py-0.5 rounded-full text-xs border {plan.color}">{plan.label}</span>
          {#if data.isAdmin}
            <span class="inline-block ml-1 px-2 py-0.5 rounded-full text-xs border text-red-400 bg-red-400/10 border-red-400/30">Admin</span>
          {/if}
        </p>
      </div>
      <div class="text-right">
        <div class="text-4xl font-bold text-white">{(data.totalPrematch + data.totalInplay).toLocaleString()}</div>
        <div class="text-gray-400 text-xs mt-1">Total Available Matches</div>
      </div>
    </div>
  </div>

  <!-- 실시간 데이터 요약 카드 (5개) -->
  <div class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
    <div class="bg-[#111827] rounded-xl p-4 border border-gray-800">
      <div class="flex items-center justify-between mb-2">
        <span class="text-gray-400 text-xs">Prematch</span>
        <span class="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
      </div>
      <div class="text-3xl font-bold text-green-400">{data.totalPrematch.toLocaleString()}</div>
      <div class="text-gray-600 text-xs mt-1">경기 대기중</div>
    </div>
    <div class="bg-[#111827] rounded-xl p-4 border border-gray-800">
      <div class="flex items-center justify-between mb-2">
        <span class="text-gray-400 text-xs">Inplay</span>
        <span class="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
      </div>
      <div class="text-3xl font-bold text-blue-400">{data.totalInplay.toLocaleString()}</div>
      <div class="text-gray-600 text-xs mt-1">실시간 진행중</div>
    </div>
    <div class="bg-[#111827] rounded-xl p-4 border border-gray-800">
      <div class="flex items-center justify-between mb-2">
        <span class="text-gray-400 text-xs">Special</span>
      </div>
      <div class="text-3xl font-bold text-purple-400">{data.totalSpecial.toLocaleString()}</div>
      <div class="text-gray-600 text-xs mt-1">스페셜 마켓</div>
    </div>
    <div class="bg-[#111827] rounded-xl p-4 border border-gray-800">
      <div class="flex items-center justify-between mb-2">
        <span class="text-gray-400 text-xs">Leagues</span>
      </div>
      <div class="text-3xl font-bold text-cyan-400">{data.totalLeagues.toLocaleString()}</div>
      <div class="text-gray-600 text-xs mt-1">활성 리그</div>
    </div>
    <div class="bg-[#111827] rounded-xl p-4 border border-gray-800">
      <div class="flex items-center justify-between mb-2">
        <span class="text-gray-400 text-xs">Sports</span>
      </div>
      <div class="text-3xl font-bold text-amber-400">{data.activeSports}</div>
      <div class="text-gray-600 text-xs mt-1">/ 11 종목</div>
    </div>
  </div>

  <!-- 종목별 실시간 데이터 현황 (바 차트) -->
  <div class="bg-[#111827] rounded-xl p-5 border border-gray-800 mb-6">
    <h3 class="text-sm font-medium text-gray-300 mb-4">Sports Data Overview</h3>
    <div class="space-y-3">
      {#each data.sportsData as item}
        {@const total = item.prematch + item.inplay}
        {@const pctPre = total > 0 ? (item.prematch / sportDataMax) * 100 : 0}
        {@const pctIn = total > 0 ? (item.inplay / sportDataMax) * 100 : 0}
        <div class="flex items-center gap-3">
          <span class="text-lg w-7 text-center shrink-0">{SPORT_ICONS[item.sport] || ''}</span>
          <span class="text-sm text-gray-300 w-24 shrink-0 truncate">{SPORT_NAMES[item.sport] || item.sport}</span>
          <div class="flex-1 flex items-center gap-0.5">
            <div class="flex-1 h-6 bg-gray-800/50 rounded overflow-hidden flex">
              {#if pctPre > 0}
                <div class="bg-green-500/60 h-full rounded-l transition-all flex items-center justify-end pr-1"
                     style="width: {pctPre}%">
                  {#if item.prematch > 20}
                    <span class="text-[10px] text-white/80">{item.prematch}</span>
                  {/if}
                </div>
              {/if}
              {#if pctIn > 0}
                <div class="bg-blue-500/70 h-full transition-all flex items-center justify-end pr-1"
                     style="width: {pctIn}%">
                  {#if item.inplay > 5}
                    <span class="text-[10px] text-white/80">{item.inplay}</span>
                  {/if}
                </div>
              {/if}
            </div>
          </div>
          <div class="text-right shrink-0 w-28 flex gap-2">
            <span class="text-xs text-green-400 w-14 text-right">{item.prematch}</span>
            <span class="text-xs text-blue-400 w-14 text-right">
              {#if item.inplay > 0}
                {item.inplay} live
              {:else}
                -
              {/if}
            </span>
          </div>
        </div>
      {/each}
    </div>
    <div class="flex items-center gap-4 mt-4 pt-3 border-t border-gray-800 text-[10px] text-gray-500">
      <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-sm bg-green-500/60"></span> Prematch</span>
      <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-sm bg-blue-500/70"></span> Inplay (Live)</span>
    </div>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
    <!-- 종목별 상세 테이블 -->
    <div class="bg-[#111827] rounded-xl p-5 border border-gray-800">
      <h3 class="text-sm font-medium text-gray-300 mb-4">Detailed Data Status</h3>
      <div class="overflow-x-auto">
        <table class="w-full text-xs">
          <thead>
            <tr class="text-gray-500 border-b border-gray-800">
              <th class="text-left py-2 font-medium">Sport</th>
              <th class="text-right py-2 font-medium">Prematch</th>
              <th class="text-right py-2 font-medium">Inplay</th>
              <th class="text-right py-2 font-medium">Special</th>
              <th class="text-right py-2 font-medium">Leagues</th>
              <th class="text-right py-2 font-medium">Age</th>
            </tr>
          </thead>
          <tbody>
            {#each data.sportsData as item}
              <tr class="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                <td class="py-2 text-gray-300 font-medium">
                  <span class="mr-1.5">{SPORT_ICONS[item.sport] || ''}</span>
                  {SPORT_NAMES[item.sport] || item.sport}
                </td>
                <td class="text-right">
                  {#if item.prematch > 0}
                    <span class="text-green-400 font-medium">{item.prematch.toLocaleString()}</span>
                  {:else}
                    <span class="text-gray-700">0</span>
                  {/if}
                </td>
                <td class="text-right">
                  {#if item.inplay > 0}
                    <span class="inline-flex items-center gap-1 text-blue-400 font-medium">
                      <span class="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
                      {item.inplay}
                    </span>
                  {:else}
                    <span class="text-gray-700">0</span>
                  {/if}
                </td>
                <td class="text-right">
                  {#if item.special > 0}
                    <span class="text-purple-400">{item.special}</span>
                  {:else}
                    <span class="text-gray-700">0</span>
                  {/if}
                </td>
                <td class="text-right text-gray-400">
                  {data.leaguesBySport[item.sport] || 0}
                </td>
                <td class="text-right text-gray-500">
                  {#if item.prematchAge >= 0}
                    <span class="{item.prematchAge > 60 ? 'text-red-400' : item.prematchAge > 30 ? 'text-yellow-400' : 'text-gray-500'}">
                      {item.prematchAge}s
                    </span>
                  {:else}
                    <span class="text-gray-700">-</span>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
          <tfoot>
            <tr class="border-t border-gray-700 font-medium">
              <td class="py-2 text-gray-200">Total</td>
              <td class="text-right text-green-300">{data.totalPrematch.toLocaleString()}</td>
              <td class="text-right text-blue-300">{data.totalInplay.toLocaleString()}</td>
              <td class="text-right text-purple-300">{data.totalSpecial.toLocaleString()}</td>
              <td class="text-right text-gray-300">{data.totalLeagues}</td>
              <td class="text-right text-gray-500">-</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>

    <!-- 사용량 차트 (일별) -->
    <div class="bg-[#111827] rounded-xl p-5 border border-gray-800">
      <h3 class="text-sm font-medium text-gray-300 mb-4">My Usage (7 days)</h3>
      {#if data.usage.total.total === 0}
        <div class="flex flex-col items-center justify-center py-10 text-center">
          <div class="text-4xl mb-3 opacity-30">📊</div>
          <div class="text-gray-500 text-sm">아직 사용 기록이 없습니다</div>
          <div class="text-gray-600 text-xs mt-1">프리매치, 인플레이, 스페셜 페이지를 방문하면 기록됩니다</div>
          <div class="flex gap-2 mt-4">
            <a href="/prematch/soccer" class="px-3 py-1.5 bg-green-500/10 text-green-400 text-xs rounded-lg border border-green-500/20 hover:bg-green-500/20 transition-colors">
              프리매치 보기
            </a>
            <a href="/inplay/soccer" class="px-3 py-1.5 bg-blue-500/10 text-blue-400 text-xs rounded-lg border border-blue-500/20 hover:bg-blue-500/20 transition-colors">
              인플레이 보기
            </a>
          </div>
        </div>
      {:else}
        <div class="flex items-end gap-2 h-[180px]">
          {#each data.usage.daily as day}
            {@const total = day.prematch + day.inplay + day.special}
            {@const h = Math.max((total / dailyMax) * 160, total > 0 ? 4 : 0)}
            {@const hPre = total > 0 ? (day.prematch / total) * h : 0}
            {@const hIn = total > 0 ? (day.inplay / total) * h : 0}
            {@const hSp = total > 0 ? (day.special / total) * h : 0}
            <div class="flex-1 flex flex-col items-center gap-1">
              <div class="w-full flex flex-col-reverse items-stretch" style="height: 160px">
                <div class="flex flex-col-reverse w-full">
                  {#if hPre > 0}
                    <div class="bg-green-500/70 rounded-t-sm w-full" style="height: {hPre}px"></div>
                  {/if}
                  {#if hIn > 0}
                    <div class="bg-blue-500/70 w-full" style="height: {hIn}px"></div>
                  {/if}
                  {#if hSp > 0}
                    <div class="bg-purple-500/70 rounded-t-sm w-full" style="height: {hSp}px"></div>
                  {/if}
                </div>
              </div>
              <span class="text-[10px] text-gray-500">{formatDate(day.date)}</span>
              {#if total > 0}
                <span class="text-[10px] text-gray-400">{total}</span>
              {/if}
            </div>
          {/each}
        </div>
        <div class="flex items-center gap-4 mt-4 text-[10px] text-gray-500">
          <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-sm bg-green-500/70"></span> Prematch</span>
          <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-sm bg-blue-500/70"></span> Inplay</span>
          <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-sm bg-purple-500/70"></span> Special</span>
        </div>
      {/if}
    </div>
  </div>

  <!-- 시간대별 + Quick Links -->
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <!-- 시간대별 사용량 -->
    <div class="bg-[#111827] rounded-xl p-5 border border-gray-800">
      <h3 class="text-sm font-medium text-gray-300 mb-4">Hourly Usage (Today)</h3>
      {#if data.usage.total.total === 0}
        <div class="flex items-center justify-center py-10 text-gray-600 text-sm">
          데이터 없음
        </div>
      {:else}
        <div class="flex items-end gap-[3px] h-[140px]">
          {#each data.usage.hourly as hr}
            {@const h = Math.max((hr.count / hourlyMax) * 120, hr.count > 0 ? 3 : 0)}
            <div class="flex-1 flex flex-col items-center gap-1">
              <div class="w-full flex flex-col justify-end" style="height: 120px">
                <div class="bg-blue-500/60 rounded-t-sm w-full transition-all" style="height: {h}px"></div>
              </div>
              {#if hr.hour % 3 === 0}
                <span class="text-[9px] text-gray-500">{hr.hour}h</span>
              {:else}
                <span class="text-[9px] text-transparent">.</span>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Quick Links -->
    <div class="bg-[#111827] rounded-xl p-5 border border-gray-800">
      <h3 class="text-sm font-medium text-gray-300 mb-4">Quick Access</h3>
      <div class="grid grid-cols-1 gap-3">
        <a href="/prematch/soccer" class="flex items-center gap-3 p-3 rounded-lg bg-green-500/5 border border-green-500/10 hover:border-green-500/30 transition-colors group">
          <div class="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center text-green-400 text-lg group-hover:bg-green-500/20 transition-colors">P</div>
          <div>
            <div class="text-sm font-medium text-green-400 group-hover:text-green-300">Prematch</div>
            <div class="text-xs text-gray-500">{data.totalPrematch.toLocaleString()} matches available</div>
          </div>
          <div class="ml-auto text-gray-600 group-hover:text-gray-400">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
          </div>
        </a>
        <a href="/inplay/soccer" class="flex items-center gap-3 p-3 rounded-lg bg-blue-500/5 border border-blue-500/10 hover:border-blue-500/30 transition-colors group">
          <div class="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 text-lg group-hover:bg-blue-500/20 transition-colors">
            <span class="relative flex h-3 w-3"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span><span class="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span></span>
          </div>
          <div>
            <div class="text-sm font-medium text-blue-400 group-hover:text-blue-300">Inplay Live</div>
            <div class="text-xs text-gray-500">{data.totalInplay.toLocaleString()} matches live now</div>
          </div>
          <div class="ml-auto text-gray-600 group-hover:text-gray-400">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
          </div>
        </a>
        <a href="/special/soccer" class="flex items-center gap-3 p-3 rounded-lg bg-purple-500/5 border border-purple-500/10 hover:border-purple-500/30 transition-colors group">
          <div class="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 text-lg group-hover:bg-purple-500/20 transition-colors">S</div>
          <div>
            <div class="text-sm font-medium text-purple-400 group-hover:text-purple-300">Special Markets</div>
            <div class="text-xs text-gray-500">{data.totalSpecial.toLocaleString()} special markets</div>
          </div>
          <div class="ml-auto text-gray-600 group-hover:text-gray-400">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
          </div>
        </a>
      </div>
    </div>
  </div>
</div>
