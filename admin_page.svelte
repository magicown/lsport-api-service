<script lang="ts">
  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';

  let { data, form } = $props();

  let selectedUser = $state<any>(null);
  let modalOpen = $state(false);
  let editStatus = $state('');
  let editPlan = $state('');
  let editMemo = $state('');
  let saving = $state(false);

  function openModal(user: any) {
    selectedUser = user;
    editStatus = user.status;
    editPlan = user.plan;
    editMemo = user.memo || '';
    modalOpen = true;
  }

  function closeModal() {
    modalOpen = false;
    selectedUser = null;
  }

  function statusBadge(s: string) {
    const m: Record<string, string> = {
      pending: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
      active: 'bg-green-500/20 text-green-400 border border-green-500/30',
      suspended: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
      rejected: 'bg-red-500/20 text-red-400 border border-red-500/30',
    };
    return m[s] || 'bg-gray-500/20 text-gray-400';
  }

  function statusLabel(s: string) {
    const m: Record<string, string> = { pending: '대기', active: '활성', suspended: '정지', rejected: '거절' };
    return m[s] || s;
  }

  function planBadge(p: string) {
    const m: Record<string, string> = {
      free: 'text-gray-400',
      standard: 'text-blue-400',
      premium: 'text-purple-400',
      enterprise: 'text-yellow-400',
    };
    return m[p] || 'text-gray-400';
  }

  function formatDate(ts: number) {
    return new Date(ts).toLocaleDateString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit' });
  }

  function setFilter(key: string, value: string) {
    const params = new URLSearchParams($page.url.searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete('page');
    goto(`/admin?${params.toString()}`);
  }

  $effect(() => {
    if (form?.success) closeModal();
  });
</script>

<div class="min-h-screen bg-[#0a0e17] text-white">
  <!-- 헤더 -->
  <div class="bg-[#111827] border-b border-gray-800 px-6 py-4 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <a href="/" class="text-gray-500 hover:text-gray-300 text-sm">← 메인</a>
      <span class="text-gray-700">|</span>
      <h1 class="text-lg font-bold text-white">관리자 · 회원 관리</h1>
    </div>
    <span class="text-xs text-gray-500">MatchData Admin</span>
  </div>

  <div class="max-w-7xl mx-auto px-6 py-6 space-y-6">

    <!-- 통계 카드 -->
    <div class="grid grid-cols-5 gap-3">
      {#each [
        { label: '전체', value: data.stats.total, color: 'text-white', filter: '' },
        { label: '대기', value: data.stats.pending, color: 'text-yellow-400', filter: 'pending' },
        { label: '활성', value: data.stats.active, color: 'text-green-400', filter: 'active' },
        { label: '정지', value: data.stats.suspended, color: 'text-orange-400', filter: 'suspended' },
        { label: '거절', value: data.stats.rejected, color: 'text-red-400', filter: 'rejected' },
      ] as card}
        <button
          onclick={() => setFilter('status', card.filter)}
          class="bg-[#111827] rounded-xl p-4 border text-left transition-colors hover:border-gray-600
            {data.filters.status === card.filter ? 'border-blue-500' : 'border-gray-800'}"
        >
          <div class="text-2xl font-bold {card.color}">{card.value}</div>
          <div class="text-xs text-gray-500 mt-1">{card.label}</div>
        </button>
      {/each}
    </div>

    <!-- 검색 + 필터 -->
    <div class="flex gap-3">
      <form class="flex-1" onsubmit={(e) => { e.preventDefault(); const v = (e.target as HTMLFormElement).querySelector('input')?.value || ''; setFilter('search', v); }}>
        <input
          type="text"
          placeholder="이름 / 이메일 / 회사 검색..."
          value={data.filters.search}
          class="w-full px-4 py-2.5 bg-[#111827] border border-gray-700 rounded-xl text-white text-sm
            placeholder-gray-600 focus:outline-none focus:border-blue-500"
        />
      </form>
      <select
        value={data.filters.status}
        onchange={(e) => setFilter('status', (e.target as HTMLSelectElement).value)}
        class="px-3 py-2.5 bg-[#111827] border border-gray-700 rounded-xl text-sm text-gray-300 focus:outline-none focus:border-blue-500"
      >
        <option value="">전체 상태</option>
        <option value="pending">대기</option>
        <option value="active">활성</option>
        <option value="suspended">정지</option>
        <option value="rejected">거절</option>
      </select>
    </div>

    <!-- 사용자 테이블 -->
    <div class="bg-[#111827] rounded-2xl border border-gray-800 overflow-hidden">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-gray-800 text-gray-500 text-xs uppercase">
            <th class="px-4 py-3 text-left">사용자</th>
            <th class="px-4 py-3 text-left">이메일</th>
            <th class="px-4 py-3 text-left">회사</th>
            <th class="px-4 py-3 text-center">플랜</th>
            <th class="px-4 py-3 text-center">상태</th>
            <th class="px-4 py-3 text-center">가입일</th>
            <th class="px-4 py-3 text-center">관리</th>
          </tr>
        </thead>
        <tbody>
          {#each data.users as user}
            <tr class="border-b border-gray-800/50 hover:bg-white/[0.02] transition-colors">
              <td class="px-4 py-3">
                <div class="font-medium text-white">{user.username}</div>
                {#if user.role === 'admin'}
                  <span class="text-xs text-blue-400">관리자</span>
                {/if}
              </td>
              <td class="px-4 py-3 text-gray-400">{user.email}</td>
              <td class="px-4 py-3 text-gray-400">{user.company || '-'}</td>
              <td class="px-4 py-3 text-center">
                <span class="font-medium {planBadge(user.plan)}">{user.plan}</span>
              </td>
              <td class="px-4 py-3 text-center">
                <span class="px-2 py-0.5 rounded-full text-xs {statusBadge(user.status)}">
                  {statusLabel(user.status)}
                </span>
              </td>
              <td class="px-4 py-3 text-center text-gray-500 text-xs">{formatDate(user.created_at)}</td>
              <td class="px-4 py-3 text-center">
                <button
                  onclick={() => openModal(user)}
                  class="px-3 py-1 text-xs bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 rounded-lg transition-colors border border-blue-600/30"
                >
                  편집
                </button>
              </td>
            </tr>
          {:else}
            <tr>
              <td colspan="7" class="px-4 py-12 text-center text-gray-600">
                회원이 없습니다.
              </td>
            </tr>
          {/each}
        </tbody>
      </table>

      <!-- 페이지네이션 -->
      {#if data.pagination.total_pages > 1}
        <div class="px-4 py-3 border-t border-gray-800 flex items-center justify-between text-sm">
          <span class="text-gray-500 text-xs">
            총 {data.pagination.total}명 · {data.pagination.page}/{data.pagination.total_pages} 페이지
          </span>
          <div class="flex gap-2">
            {#if data.pagination.page > 1}
              <button onclick={() => setFilter('page', String(data.pagination.page - 1))}
                class="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs text-gray-300">이전</button>
            {/if}
            {#if data.pagination.page < data.pagination.total_pages}
              <button onclick={() => setFilter('page', String(data.pagination.page + 1))}
                class="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs text-gray-300">다음</button>
            {/if}
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>

<!-- 편집 모달 -->
{#if modalOpen && selectedUser}
  <div class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4" onclick={closeModal}>
    <div class="bg-[#111827] rounded-2xl border border-gray-700 w-full max-w-md p-6 shadow-2xl" onclick={(e) => e.stopPropagation()}>
      <div class="flex items-center justify-between mb-5">
        <h2 class="text-lg font-bold text-white">회원 편집</h2>
        <button onclick={closeModal} class="text-gray-500 hover:text-gray-300 text-xl leading-none">&times;</button>
      </div>

      <!-- 사용자 정보 -->
      <div class="bg-[#0a0e17] rounded-xl p-4 mb-5 space-y-2 text-sm">
        <div class="flex justify-between">
          <span class="text-gray-500">Username</span>
          <span class="text-white font-medium">{selectedUser.username}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-500">Email</span>
          <span class="text-gray-300">{selectedUser.email}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-500">Company</span>
          <span class="text-gray-300">{selectedUser.company || '-'}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-500">가입일</span>
          <span class="text-gray-300">{formatDate(selectedUser.created_at)}</span>
        </div>
      </div>

      <!-- form -->
      <form method="POST" action="?/updateUser" use:enhance={() => {
        saving = true;
        return async ({ update }) => { saving = false; await update(); };
      }} class="space-y-4">
        <input type="hidden" name="userId" value={selectedUser.id} />

        <!-- 상태 변경 -->
        <div>
          <label class="block text-sm font-medium text-gray-400 mb-1.5">상태</label>
          <div class="grid grid-cols-4 gap-2">
            {#each [
              { v: 'active', label: '승인', cls: 'border-green-500 bg-green-500/20 text-green-400' },
              { v: 'pending', label: '대기', cls: 'border-yellow-500 bg-yellow-500/20 text-yellow-400' },
              { v: 'suspended', label: '정지', cls: 'border-orange-500 bg-orange-500/20 text-orange-400' },
              { v: 'rejected', label: '거절', cls: 'border-red-500 bg-red-500/20 text-red-400' },
            ] as opt}
              <button
                type="button"
                onclick={() => editStatus = opt.v}
                class="py-2 rounded-lg text-xs font-medium border transition-colors
                  {editStatus === opt.v ? opt.cls : 'border-gray-700 text-gray-500 hover:border-gray-600'}"
              >{opt.label}</button>
            {/each}
          </div>
          <input type="hidden" name="status" value={editStatus} />
        </div>

        <!-- 플랜 변경 -->
        <div>
          <label class="block text-sm font-medium text-gray-400 mb-1.5">플랜</label>
          <select
            bind:value={editPlan}
            name="plan"
            class="w-full px-3 py-2.5 bg-[#0a0e17] border border-gray-700 rounded-xl text-sm text-gray-300
              focus:outline-none focus:border-blue-500"
          >
            <option value="free">Free</option>
            <option value="standard">Standard</option>
            <option value="premium">Premium</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>

        <!-- 메모 -->
        <div>
          <label class="block text-sm font-medium text-gray-400 mb-1.5">메모 (내부용)</label>
          <textarea
            bind:value={editMemo}
            name="memo"
            rows="2"
            placeholder="관리자 메모..."
            class="w-full px-3 py-2 bg-[#0a0e17] border border-gray-700 rounded-xl text-sm text-gray-300
              placeholder-gray-600 focus:outline-none focus:border-blue-500 resize-none"
          ></textarea>
        </div>

        {#if form?.error}
          <p class="text-red-400 text-xs">{form.error}</p>
        {/if}

        <div class="flex gap-3 pt-1">
          <button type="button" onclick={closeModal}
            class="flex-1 py-2.5 border border-gray-700 text-gray-400 rounded-xl text-sm hover:border-gray-600 transition-colors">
            취소
          </button>
          <button type="submit" disabled={saving}
            class="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors">
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}
