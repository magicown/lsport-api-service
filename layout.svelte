<script lang="ts">
  import "../app.css";
  import { page } from "$app/stores";
  import { navigating } from "$app/stores";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";

  let { children, data } = $props();

  const modes = [
    { id: 'prematch', name: '프리매치', path: '/prematch' },
    { id: 'inplay', name: '인플레이', path: '/inplay' },
    { id: 'special', name: '스페셜', path: '/special' },
  ];

  const SPORTS = [
    { id: 'soccer', name: '축구', icon: '⚽' },
    { id: 'americanfootball', name: '미식축구', icon: '🏈' },
    { id: 'boxingufc', name: 'UFC/복싱', icon: '🥊' },
    { id: 'tennis', name: '테니스', icon: '🎾' },
    { id: 'baseball', name: '야구', icon: '⚾' },
    { id: 'icehockey', name: '아이스하키', icon: '🏒' },
    { id: 'basketball', name: '농구', icon: '🏀' },
    { id: 'handball', name: '핸드볼', icon: '🤾' },
    { id: 'volleyball', name: '배구', icon: '🏐' },
    { id: 'tabletennis', name: '탁구', icon: '🏓' },
    { id: 'esports', name: 'E-스포츠', icon: '🎮' },
  ];

  let currentMode = $derived(
    $page.url.pathname.startsWith('/inplay') ? 'inplay' :
    $page.url.pathname.startsWith('/special') ? 'special' :
    $page.url.pathname.startsWith('/prematch') ? 'prematch' : ''
  );

  let isNavigating = $derived(!!$navigating);
  let isLoginPage = $derived($page.url.pathname === '/login' || $page.url.pathname === '/register');
  let isHome = $derived($page.url.pathname === '/');

  let showUserMenu = $state(false);

  const user = $derived(data?.user);

  const PLAN_COLORS: Record<string, string> = {
    free: 'text-gray-400',
    standard: 'text-blue-400',
    premium: 'text-amber-400',
  };

  // 중복 로그인 감지: 주기적으로 세션 체크
  onMount(() => {
    const interval = setInterval(async () => {
      if (isLoginPage || !user) return;
      try {
        const res = await fetch('/api/health');
        // hooks에서 401이면 세션 만료/킥
        // redirect는 자동 처리되지 않으므로 별도 체크
      } catch {}
    }, 30000);

    // 클릭 외부 영역으로 메뉴 닫기
    const handleClick = (e: MouseEvent) => {
      if (showUserMenu) showUserMenu = false;
    };

    document.addEventListener('click', handleClick);
    return () => {
      clearInterval(interval);
      document.removeEventListener('click', handleClick);
    };
  });
</script>

{#if isLoginPage}
  <!-- 로그인 페이지: 네비게이션 없이 렌더링 -->
  {@render children()}
{:else}
  <div class="min-h-screen bg-tw-body text-tw-text">
    <!-- 상단 로딩 바 -->
    {#if isNavigating}
      <div class="fixed top-0 left-0 w-full h-0.5 bg-tw-accent z-50 animate-loading-bar"></div>
    {/if}

    <!-- 상단 헤더 -->
    <nav class="bg-tw-card border-b border-tw-border h-[50px] flex items-center px-4 gap-6">
      <a href="/" class="text-tw-accent text-lg font-bold tracking-tight flex items-center gap-2">
        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" opacity="0.3"/><circle cx="10" cy="10" r="4"/></svg>
        MatchData
      </a>
      <div class="flex gap-0.5">
        {#each modes as mode}
          <a
            href={mode.path + '/soccer'}
            data-sveltekit-preload-data="hover"
            class="px-4 py-1.5 text-sm font-medium rounded-lg transition-all duration-200
              {currentMode === mode.id
                ? 'bg-tw-accent text-white'
                : 'text-tw-text-muted hover:text-tw-text-bright hover:bg-tw-highlight'}"
          >{mode.name}</a>
        {/each}
      </div>

      <!-- 우측 사용자 정보 -->
      <div class="ml-auto flex items-center gap-3">
        <a href="/docs" class="text-tw-text-muted hover:text-tw-accent text-xs transition-colors flex items-center gap-1">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
          API Docs
        </a>
        <span class="text-gray-700">|</span>
        <span class="text-tw-text-muted text-xs">v6 API</span>

        {#if user}
          <div class="relative">
            <button
              onclick={(e) => { e.stopPropagation(); showUserMenu = !showUserMenu; }}
              class="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-tw-highlight transition-colors text-sm"
            >
              <div class="w-7 h-7 rounded-full bg-tw-accent/20 flex items-center justify-center text-tw-accent text-xs font-bold">
                {user.id.charAt(0).toUpperCase()}
              </div>
              <span class="text-tw-text-bright text-sm hidden sm:inline">{user.id}</span>
              <span class="text-xs {PLAN_COLORS[user.plan] || 'text-gray-400'} hidden sm:inline">{user.plan}</span>
              <svg class="w-3 h-3 text-tw-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
              </svg>
            </button>

            {#if showUserMenu}
              <div
                class="absolute right-0 top-full mt-1 w-56 bg-[#1a1f2e] rounded-xl border border-gray-700 shadow-2xl py-2 z-50"
                onclick={(e) => e.stopPropagation()}
              >
                <div class="px-4 py-2 border-b border-gray-700/50">
                  <div class="text-sm text-white font-medium">{user.company}</div>
                  <div class="text-xs text-gray-400">{user.email}</div>
                </div>
                <a href="/" class="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700/50 hover:text-white transition-colors">
                  Dashboard
                </a>
                <a href="/account" class="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700/50 hover:text-white transition-colors">
                  Account (API Key / IP)
                </a>
                {#if data?.role === 'admin'}
                  <a href="/admin" class="block px-4 py-2 text-sm text-blue-400 hover:bg-blue-500/10 hover:text-blue-300 transition-colors">
                    관리자 패널
                  </a>
                {/if}
                <form method="POST" action="/api/logout" class="border-t border-gray-700/50 mt-1 pt-1">
                  <button
                    type="submit"
                    class="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
                  >
                    로그아웃
                  </button>
                </form>
              </div>
            {/if}
          </div>
        {/if}
      </div>
    </nav>

    <!-- 종목 탭 (대시보드가 아닐 때만) -->
    {#if !isHome}
      <div class="bg-tw-darker border-b border-tw-border">
        <div class="max-w-full px-4 flex gap-1 overflow-x-auto py-1.5">
          {#each SPORTS as sport}
            {@const basePath = currentMode === 'inplay' ? '/inplay' : currentMode === 'special' ? '/special' : '/prematch'}
            {@const isActive = $page.url.pathname.includes(sport.id)}
            <a
              href="{basePath}/{sport.id}"
              data-sveltekit-preload-data="hover"
              class="flex items-center gap-1.5 px-3 py-1.5 text-sm whitespace-nowrap rounded-md transition-all duration-200
                {isActive
                  ? 'bg-tw-accent/15 text-tw-accent font-medium border border-tw-accent/30'
                  : 'text-tw-text-muted hover:text-tw-text-bright hover:bg-tw-highlight border border-transparent'}"
            >
              <span class="text-base">{sport.icon}</span>
              {sport.name}
            </a>
          {/each}
        </div>
      </div>
    {/if}

    <main class="max-w-full">
      {@render children()}
    </main>
  </div>
{/if}

<style>
  @keyframes loadingBar {
    0% { width: 0; }
    50% { width: 70%; }
    100% { width: 100%; }
  }
  :global(.animate-loading-bar) {
    animation: loadingBar 0.8s ease-in-out infinite;
  }
</style>
