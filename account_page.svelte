<script lang="ts">
  import { invalidateAll } from '$app/navigation';

  let { data } = $props();

  // API Key 생성
  let creatingKey = $state(false);

  // IP 등록
  let newIp = $state('');
  let newIpDesc = $state('');
  let addingIp = $state(false);
  let ipMode = $state<'auto' | 'manual'>('auto');

  // 삭제 확인
  let confirmDeleteKey = $state<number | null>(null);
  let confirmDeleteIp = $state<number | null>(null);
  let deleting = $state(false);

  // 복사 상태 (keyId별)
  let copiedKeyId = $state<number | null>(null);

  // 에러/성공 메시지
  let message = $state<{ type: 'success' | 'error'; text: string } | null>(null);

  function showMsg(type: 'success' | 'error', text: string) {
    message = { type, text };
    setTimeout(() => { message = null; }, 4000);
  }

  // API Key 생성 (자동)
  async function createApiKey() {
    creatingKey = true;
    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!res.ok) { showMsg('error', json.error?.message || '키 생성 실패'); return; }
      showMsg('success', 'API Key가 생성되었습니다.');
      await invalidateAll();
    } catch { showMsg('error', '네트워크 오류'); }
    finally { creatingKey = false; }
  }

  // API Key 삭제
  async function deleteApiKey(id: number) {
    deleting = true;
    try {
      const res = await fetch(`/api/keys/${id}`, { method: 'DELETE' });
      if (!res.ok) { const j = await res.json(); showMsg('error', j.error?.message || '삭제 실패'); return; }
      showMsg('success', 'API Key가 삭제되었습니다.');
      confirmDeleteKey = null;
      await invalidateAll();
    } catch { showMsg('error', '네트워크 오류'); }
    finally { deleting = false; }
  }

  // 클립보드 복사
  async function copyKey(keyId: number, keyText: string) {
    try {
      await navigator.clipboard.writeText(keyText);
      copiedKeyId = keyId;
      setTimeout(() => { copiedKeyId = null; }, 2000);
    } catch { showMsg('error', '복사 실패'); }
  }

  // IP 등록
  async function addIp() {
    const ipValue = ipMode === 'auto' ? 'auto' : newIp.trim();
    if (ipMode === 'manual' && !ipValue) { showMsg('error', 'IP 주소를 입력해주세요.'); return; }
    addingIp = true;
    try {
      const res = await fetch('/api/account/ips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip: ipValue, description: newIpDesc.trim() || undefined }),
      });
      const json = await res.json();
      if (!res.ok) { showMsg('error', json.error?.message || 'IP 등록 실패'); return; }
      showMsg('success', `IP ${json.registeredIp || ''} 등록 완료`);
      newIp = '';
      newIpDesc = '';
      await invalidateAll();
    } catch { showMsg('error', '네트워크 오류'); }
    finally { addingIp = false; }
  }

  // IP 삭제
  async function deleteIp(id: number) {
    deleting = true;
    try {
      const res = await fetch(`/api/account/ips/${id}`, { method: 'DELETE' });
      if (!res.ok) { const j = await res.json(); showMsg('error', j.error?.message || '삭제 실패'); return; }
      showMsg('success', 'IP가 삭제되었습니다.');
      confirmDeleteIp = null;
      await invalidateAll();
    } catch { showMsg('error', '네트워크 오류'); }
    finally { deleting = false; }
  }

  function formatDate(ts: string | number) {
    if (!ts) return '-';
    const d = typeof ts === 'number' ? new Date(ts) : new Date(ts);
    return d.toLocaleDateString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit' });
  }

  function planLabel(p: string) {
    const m: Record<string, string> = { free: 'Free', standard: 'Standard', premium: 'Premium', enterprise: 'Enterprise' };
    return m[p] || p;
  }

  function planColor(p: string) {
    const m: Record<string, string> = { free: 'text-gray-400', standard: 'text-blue-400', premium: 'text-purple-400', enterprise: 'text-yellow-400' };
    return m[p] || 'text-gray-400';
  }

  function statusLabel(s: string) {
    const m: Record<string, string> = { pending: '승인 대기', active: '활성', suspended: '정지', rejected: '거절' };
    return m[s] || s;
  }

  function statusColor(s: string) {
    const m: Record<string, string> = {
      pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      active: 'bg-green-500/20 text-green-400 border-green-500/30',
      suspended: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
    };
    return m[s] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  }
</script>

<div class="min-h-screen bg-[#0a0e17] text-white">
  <!-- 헤더 -->
  <div class="bg-[#111827] border-b border-gray-800 px-6 py-4 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <a href="/" class="text-gray-500 hover:text-gray-300 text-sm">← 대시보드</a>
      <span class="text-gray-700">|</span>
      <h1 class="text-lg font-bold text-white">계정 관리</h1>
    </div>
    <span class="text-xs text-gray-500">MatchData Account</span>
  </div>

  <!-- 알림 메시지 -->
  {#if message}
    <div class="max-w-5xl mx-auto px-6 pt-4">
      <div class="px-4 py-3 rounded-xl text-sm border {message.type === 'success'
        ? 'bg-green-500/10 text-green-400 border-green-500/30'
        : 'bg-red-500/10 text-red-400 border-red-500/30'}">
        {message.text}
      </div>
    </div>
  {/if}

  <div class="max-w-5xl mx-auto px-6 py-6 space-y-6">

    <!-- ============ 섹션 1: 프로필 & 플랜 ============ -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <!-- 프로필 -->
      <div class="bg-[#111827] rounded-2xl border border-gray-800 p-5">
        <h2 class="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">프로필</h2>
        <div class="space-y-3 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-500">Username</span>
            <span class="text-white font-medium">{data.profile.username}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">Email</span>
            <span class="text-gray-300">{data.profile.email}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">Company</span>
            <span class="text-gray-300">{data.profile.company || '-'}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">상태</span>
            <span class="px-2 py-0.5 rounded-full text-xs border {statusColor(data.profile.status)}">
              {statusLabel(data.profile.status)}
            </span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">플랜</span>
            <span class="font-semibold {planColor(data.profile.plan)}">{planLabel(data.profile.plan)}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">가입일</span>
            <span class="text-gray-400 text-xs">{formatDate(data.profile.created_at)}</span>
          </div>
        </div>
      </div>

      <!-- 플랜 제한 & 사용량 -->
      <div class="bg-[#111827] rounded-2xl border border-gray-800 p-5">
        <h2 class="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">플랜 제한 & 오늘 사용량</h2>
        <div class="space-y-3 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-500">분당 호출</span>
            <span class="text-white">{data.limits.ratePerMinute} / min</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">일일 호출</span>
            <span class="text-white">
              <span class="{data.usage.total >= data.limits.dailyLimit ? 'text-red-400' : ''}">{data.usage.total}</span>
              / {data.limits.dailyLimit}
            </span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">최대 API Key</span>
            <span class="text-white">{data.apiKeys.length} / {data.limits.maxKeys}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">최대 IP</span>
            <span class="text-white">{data.ipList.length} / {data.limits.maxIps}</span>
          </div>
          <div class="border-t border-gray-800 my-2"></div>
          <div class="flex justify-between">
            <span class="text-gray-500">Prematch</span>
            <span class="{data.limits.prematch ? 'text-green-400' : 'text-red-400'}">{data.limits.prematch ? '허용' : '불가'}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">Inplay</span>
            <span class="{data.limits.inplay ? 'text-green-400' : 'text-red-400'}">{data.limits.inplay ? '허용' : '불가'}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">Special</span>
            <span class="{data.limits.special ? 'text-green-400' : 'text-red-400'}">{data.limits.special ? '허용' : '불가'}</span>
          </div>
          {#if data.limits.ipRequired}
            <div class="mt-2 px-3 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-xs text-yellow-400">
              이 플랜은 IP 화이트리스트 등록이 필수입니다.
            </div>
          {/if}
        </div>
      </div>
    </div>

    <!-- ============ 섹션 2: API Keys ============ -->
    <div class="bg-[#111827] rounded-2xl border border-gray-800 p-5">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-sm font-semibold text-gray-400 uppercase tracking-wider">API Keys</h2>
        <div class="flex items-center gap-3">
          <span class="text-xs text-gray-600">{data.apiKeys.length} / {data.limits.maxKeys}</span>
          {#if data.apiKeys.length < data.limits.maxKeys}
            <button
              onclick={createApiKey}
              disabled={creatingKey}
              class="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs
                font-medium transition-colors whitespace-nowrap"
            >
              {creatingKey ? '생성 중...' : '+ 새 키 생성'}
            </button>
          {/if}
        </div>
      </div>

      {#if data.apiKeys.length >= data.limits.maxKeys}
        <div class="mb-4 px-3 py-2 bg-gray-800/50 rounded-lg text-xs text-gray-500">
          최대 키 수에 도달했습니다. 새 키를 만들려면 기존 키를 삭제하세요.
        </div>
      {/if}

      <!-- 키 목록 -->
      {#if data.apiKeys.length > 0}
        <div class="space-y-3">
          {#each data.apiKeys as key}
            <div class="bg-[#0a0e17] rounded-xl border border-gray-800 p-4">
              <div class="flex items-center gap-2 mb-2">
                <div class="flex-1 min-w-0">
                  <div class="font-mono text-xs text-green-400 break-all select-all leading-relaxed">
                    {key.fullKey}
                  </div>
                </div>
                <button
                  onclick={() => copyKey(key.id, key.fullKey)}
                  class="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                    {copiedKeyId === key.id
                      ? 'bg-green-600/30 text-green-400 border border-green-600/40'
                      : 'bg-blue-600/20 text-blue-400 border border-blue-600/30 hover:bg-blue-600/40'}"
                >
                  {copiedKeyId === key.id ? '복사됨!' : '복사'}
                </button>
                {#if confirmDeleteKey === key.id}
                  <button onclick={() => deleteApiKey(key.id)} disabled={deleting}
                    class="shrink-0 px-3 py-1.5 text-xs bg-red-600/30 text-red-400 rounded-lg border border-red-600/40 hover:bg-red-600/50">삭제 확인</button>
                  <button onclick={() => confirmDeleteKey = null}
                    class="shrink-0 px-3 py-1.5 text-xs text-gray-500 rounded-lg border border-gray-700 hover:border-gray-600">취소</button>
                {:else}
                  <button onclick={() => confirmDeleteKey = key.id}
                    class="shrink-0 px-3 py-1.5 text-xs text-red-400/60 hover:text-red-400 rounded-lg border border-transparent hover:border-red-600/30 transition-colors">삭제</button>
                {/if}
              </div>
              <div class="flex items-center gap-4 text-xs text-gray-600">
                <span>생성: {formatDate(key.created_at)}</span>
                <span>마지막 사용: {key.last_used_at ? formatDate(key.last_used_at) : '미사용'}</span>
              </div>
            </div>
          {/each}
        </div>
      {:else}
        <div class="text-center py-8 text-gray-600 text-sm">
          생성된 API Key가 없습니다. 새 키를 생성하세요.
        </div>
      {/if}
    </div>

    <!-- ============ 섹션 3: IP Whitelist ============ -->
    <div class="bg-[#111827] rounded-2xl border border-gray-800 p-5">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-sm font-semibold text-gray-400 uppercase tracking-wider">IP Whitelist</h2>
        <span class="text-xs text-gray-600">{data.ipList.length} / {data.limits.maxIps}</span>
      </div>

      <!-- IP 등록 폼 -->
      {#if data.ipList.length < data.limits.maxIps}
        <div class="space-y-2 mb-4">
          <div class="flex gap-2">
            <div class="flex bg-[#0a0e17] border border-gray-700 rounded-xl overflow-hidden">
              <button
                onclick={() => ipMode = 'auto'}
                class="px-3 py-2.5 text-xs transition-colors {ipMode === 'auto'
                  ? 'bg-blue-600/30 text-blue-400' : 'text-gray-500 hover:text-gray-300'}"
              >현재 IP</button>
              <button
                onclick={() => ipMode = 'manual'}
                class="px-3 py-2.5 text-xs transition-colors {ipMode === 'manual'
                  ? 'bg-blue-600/30 text-blue-400' : 'text-gray-500 hover:text-gray-300'}"
              >직접 입력</button>
            </div>
            {#if ipMode === 'manual'}
              <input
                type="text"
                bind:value={newIp}
                placeholder="IP 주소 (예: 203.0.113.50)"
                class="flex-1 px-4 py-2.5 bg-[#0a0e17] border border-gray-700 rounded-xl text-sm text-white
                  placeholder-gray-600 focus:outline-none focus:border-blue-500 font-mono"
              />
            {:else}
              <div class="flex-1 px-4 py-2.5 bg-[#0a0e17] border border-gray-700 rounded-xl text-sm text-gray-400">
                현재 접속 IP가 자동으로 등록됩니다
              </div>
            {/if}
          </div>
          <div class="flex gap-2">
            <input
              type="text"
              bind:value={newIpDesc}
              placeholder="설명 (선택, 예: Production Server)"
              class="flex-1 px-4 py-2.5 bg-[#0a0e17] border border-gray-700 rounded-xl text-sm text-white
                placeholder-gray-600 focus:outline-none focus:border-blue-500"
            />
            <button
              onclick={addIp}
              disabled={addingIp}
              class="px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-xl text-sm
                font-medium transition-colors whitespace-nowrap"
            >
              {addingIp ? '등록 중...' : '+ IP 등록'}
            </button>
          </div>
        </div>
      {:else}
        <div class="mb-4 px-3 py-2 bg-gray-800/50 rounded-lg text-xs text-gray-500">
          최대 IP 수에 도달했습니다. 새 IP를 등록하려면 기존 IP를 삭제하세요.
        </div>
      {/if}

      <!-- IP 목록 -->
      {#if data.ipList.length > 0}
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-800 text-gray-500 text-xs uppercase">
                <th class="px-3 py-2 text-left">IP 주소</th>
                <th class="px-3 py-2 text-left">설명</th>
                <th class="px-3 py-2 text-center">등록일</th>
                <th class="px-3 py-2 text-center w-20">삭제</th>
              </tr>
            </thead>
            <tbody>
              {#each data.ipList as ip}
                <tr class="border-b border-gray-800/50 hover:bg-white/[0.02]">
                  <td class="px-3 py-2.5 text-white font-mono text-xs">{ip.ip_address}</td>
                  <td class="px-3 py-2.5 text-gray-400">{ip.description || '-'}</td>
                  <td class="px-3 py-2.5 text-center text-gray-500 text-xs">{formatDate(ip.created_at)}</td>
                  <td class="px-3 py-2.5 text-center">
                    {#if confirmDeleteIp === ip.id}
                      <div class="flex gap-1 justify-center">
                        <button onclick={() => deleteIp(ip.id)} disabled={deleting}
                          class="px-2 py-1 text-xs bg-red-600/30 text-red-400 rounded border border-red-600/40 hover:bg-red-600/50">확인</button>
                        <button onclick={() => confirmDeleteIp = null}
                          class="px-2 py-1 text-xs text-gray-500 rounded border border-gray-700 hover:border-gray-600">취소</button>
                      </div>
                    {:else}
                      <button onclick={() => confirmDeleteIp = ip.id}
                        class="px-2 py-1 text-xs text-red-400/60 hover:text-red-400 rounded border border-transparent hover:border-red-600/30 transition-colors">삭제</button>
                    {/if}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {:else}
        <div class="text-center py-8 text-gray-600 text-sm">
          등록된 IP가 없습니다.
          {#if data.limits.ipRequired}
            <span class="text-yellow-400">API 사용을 위해 IP를 등록해주세요.</span>
          {/if}
        </div>
      {/if}
    </div>
  </div>
</div>
