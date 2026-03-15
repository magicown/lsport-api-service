<script lang="ts">
  import { enhance } from '$app/forms';

  let { form } = $props();
  let loading = $state(false);
  let step = $state<'form' | 'success'>('form');

  // 성공 시 step 전환
  $effect(() => {
    if (form?.success) step = 'success';
  });
</script>

<div class="min-h-screen bg-[#0a0e17] flex items-center justify-center px-4 py-8">
  <div class="w-full max-w-[480px]">
    <!-- 로고 -->
    <div class="text-center mb-8">
      <a href="/login" class="inline-flex items-center gap-3 mb-3">
        <svg class="w-10 h-10 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
          <circle cx="10" cy="10" r="8" opacity="0.3"/>
          <circle cx="10" cy="10" r="4"/>
        </svg>
        <span class="text-3xl font-bold text-white tracking-tight">MatchData</span>
      </a>
      <p class="text-gray-500 text-sm">Sports Data API Platform v6</p>
    </div>

    {#if step === 'success'}
      <!-- 신청 완료 화면 -->
      <div class="bg-[#111827] rounded-2xl p-8 border border-gray-800 shadow-2xl text-center">
        <div class="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
          </svg>
        </div>
        <h2 class="text-xl font-bold text-white mb-2">가입 신청 완료!</h2>
        <p class="text-gray-400 text-sm mb-1">
          <span class="text-white font-medium">{form?.username}</span>님의 가입 신청이 접수되었습니다.
        </p>
        <p class="text-gray-500 text-sm mb-6">관리자 검토 후 승인 이메일을 보내드립니다.</p>

        <div class="bg-[#0a0e17] rounded-xl p-4 mb-6 text-left space-y-2">
          <div class="flex justify-between text-sm">
            <span class="text-gray-500">Username</span>
            <span class="text-gray-300">{form?.username}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-gray-500">Email</span>
            <span class="text-gray-300">{form?.email}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-gray-500">Company</span>
            <span class="text-gray-300">{form?.company || '-'}</span>
          </div>
        </div>

        <a
          href="/login"
          class="block w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors text-center"
        >
          로그인 페이지로
        </a>
      </div>

    {:else}
      <!-- 에러 메시지 -->
      {#if form?.error}
        <div class="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-start gap-2">
          <svg class="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
          </svg>
          <span>{form.error}</span>
        </div>
      {/if}

      <!-- 가입 폼 -->
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
        <h2 class="text-xl font-semibold text-white mb-1">API 이용 신청</h2>
        <p class="text-gray-500 text-sm mb-6">관리자 승인 후 API 키를 발급받으실 수 있습니다.</p>

        <div class="space-y-4">
          <!-- Username -->
          <div>
            <label for="username" class="block text-sm font-medium text-gray-400 mb-1.5">
              Username <span class="text-red-400">*</span>
            </label>
            <input
              id="username"
              name="username"
              type="text"
              required
              value={form?.username || ''}
              autocomplete="username"
              class="w-full px-4 py-3 bg-[#0a0e17] border border-gray-700 rounded-xl text-white placeholder-gray-600
                focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              placeholder="myusername"
            />
            <p class="text-xs text-gray-600 mt-1">영문, 숫자, 밑줄(_) 3~20자</p>
          </div>

          <!-- Email -->
          <div>
            <label for="email" class="block text-sm font-medium text-gray-400 mb-1.5">
              이메일 <span class="text-red-400">*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={form?.email || ''}
              autocomplete="email"
              class="w-full px-4 py-3 bg-[#0a0e17] border border-gray-700 rounded-xl text-white placeholder-gray-600
                focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              placeholder="you@company.com"
            />
          </div>

          <!-- Password -->
          <div>
            <label for="password" class="block text-sm font-medium text-gray-400 mb-1.5">
              비밀번호 <span class="text-red-400">*</span>
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autocomplete="new-password"
              class="w-full px-4 py-3 bg-[#0a0e17] border border-gray-700 rounded-xl text-white placeholder-gray-600
                focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              placeholder="8자 이상, 영문+숫자"
            />
            <p class="text-xs text-gray-600 mt-1">8자 이상, 영문 대소문자 + 숫자 포함</p>
          </div>

          <!-- Company -->
          <div>
            <label for="company" class="block text-sm font-medium text-gray-400 mb-1.5">
              회사/서비스명
            </label>
            <input
              id="company"
              name="company"
              type="text"
              value={form?.company || ''}
              class="w-full px-4 py-3 bg-[#0a0e17] border border-gray-700 rounded-xl text-white placeholder-gray-600
                focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              placeholder="회사 또는 서비스 이름 (선택)"
            />
          </div>

          <!-- 사용 목적 (선택) -->
          <div>
            <label for="purpose" class="block text-sm font-medium text-gray-400 mb-1.5">
              사용 목적
            </label>
            <select
              id="purpose"
              name="purpose"
              class="w-full px-4 py-3 bg-[#0a0e17] border border-gray-700 rounded-xl text-gray-300
                focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            >
              <option value="">선택해주세요 (선택)</option>
              <option value="sports_site">스포츠 정보 사이트</option>
              <option value="betting_solution">배팅 솔루션</option>
              <option value="analytics">데이터 분석</option>
              <option value="personal">개인 프로젝트</option>
              <option value="other">기타</option>
            </select>
          </div>
        </div>

        <!-- 이용약관 동의 -->
        <div class="mt-5 p-3 bg-[#0a0e17] rounded-xl border border-gray-700/50">
          <label class="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="agree"
              required
              class="mt-0.5 w-4 h-4 rounded border-gray-600 bg-[#0a0e17] text-blue-500 focus:ring-blue-500"
            />
            <span class="text-xs text-gray-500 leading-relaxed">
              데이터는 <span class="text-gray-300">참고용(informational)</span>으로만 제공됩니다.
              배팅 결정의 책임은 사용자에게 있으며, 데이터 재판매 및 무단 배포를 금지합니다.
              이용약관에 동의합니다.
            </span>
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          class="w-full mt-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50
            text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {#if loading}
            <div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            신청 중...
          {:else}
            이용 신청하기
          {/if}
        </button>
      </form>
    {/if}

    <p class="text-center text-gray-600 text-sm mt-6">
      이미 계정이 있으신가요?
      <a href="/login" class="text-blue-400 hover:text-blue-300 transition-colors">로그인</a>
    </p>
    <p class="text-center text-gray-700 text-xs mt-3">&copy; 2024 MatchData. All rights reserved.</p>
  </div>
</div>
