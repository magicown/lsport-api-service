<script lang="ts">
  import { enhance } from '$app/forms';
  import { page } from '$app/stores';

  let { form } = $props();
  let loading = $state(false);
  let kicked = $derived($page.url.searchParams.get('kicked') === '1');
</script>

<div class="min-h-screen bg-[#0a0e17] flex items-center justify-center px-4">
  <div class="w-full max-w-[420px]">
    <!-- 로고 -->
    <div class="text-center mb-8">
      <div class="inline-flex items-center gap-3 mb-3">
        <svg class="w-10 h-10 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
          <circle cx="10" cy="10" r="8" opacity="0.3"/>
          <circle cx="10" cy="10" r="4"/>
        </svg>
        <span class="text-3xl font-bold text-white tracking-tight">MatchData</span>
      </div>
      <p class="text-gray-500 text-sm">Sports Data API Platform v6</p>
    </div>

    <!-- 중복 로그인 알림 -->
    {#if kicked}
      <div class="mb-4 p-3 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-400 text-sm flex items-center gap-2">
        <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"/>
        </svg>
        <span>다른 기기에서 로그인되어 현재 세션이 종료되었습니다.</span>
      </div>
    {/if}

    <!-- 에러 메시지 -->
    {#if form?.error}
      <div class="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
        {form.error}
      </div>
    {/if}

    <!-- 로그인 폼 -->
    <form
      method="POST"
      use:enhance={() => {
        loading = true;
        return async ({ update }) => {
          loading = false;
          await update();
        };
      }}
      class="bg-[#111827] rounded-2xl p-8 border border-gray-800 shadow-2xl"
    >
      <h2 class="text-xl font-semibold text-white mb-6">로그인</h2>

      <div class="space-y-4">
        <div>
          <label for="email" class="block text-sm font-medium text-gray-400 mb-1.5">이메일 또는 ID</label>
          <input
            id="email"
            name="email"
            type="text"
            required
            autocomplete="username"
            value={form?.email || ''}
            class="w-full px-4 py-3 bg-[#0a0e17] border border-gray-700 rounded-xl text-white placeholder-gray-600
              focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            placeholder="admin@matchdata.net"
          />
        </div>

        <div>
          <label for="password" class="block text-sm font-medium text-gray-400 mb-1.5">비밀번호</label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autocomplete="current-password"
            class="w-full px-4 py-3 bg-[#0a0e17] border border-gray-700 rounded-xl text-white placeholder-gray-600
              focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            placeholder="********"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        class="w-full mt-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50
          text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
      >
        {#if loading}
          <div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          로그인 중...
        {:else}
          로그인
        {/if}
      </button>

      <div class="mt-4 text-center">
        <span class="text-gray-600 text-sm">계정이 없으신가요? </span>
        <a href="/register" class="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors">
          이용 신청하기 →
        </a>
      </div>
    </form>

    <!-- 테스트 계정 안내 -->
    <div class="mt-6 p-4 bg-[#111827]/50 rounded-xl border border-gray-800">
      <p class="text-xs text-gray-500 mb-2 font-medium">안내</p>
      <div class="space-y-1 text-xs text-gray-600">
        <div>계정이 없으신가요? <a href="/register" class="text-blue-400 hover:underline">회원가입</a></div>
        <div class="flex justify-between">
          <span>Free:</span>
          <span class="text-gray-400">test / test1234</span>
        </div>
      </div>
    </div>

    <p class="text-center text-gray-600 text-xs mt-6">&copy; 2024 MatchData. All rights reserved.</p>
  </div>
</div>
