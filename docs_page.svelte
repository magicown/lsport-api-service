<script lang="ts">
  let { data } = $props();
  let activeSection = $state('overview');
  let activeTab = $state('javascript');

  const sections = [
    { id: 'overview', name: '개요' },
    { id: 'auth', name: '회원가입 / 인증' },
    { id: 'endpoints', name: 'API 엔드포인트' },
    { id: 'prematch', name: '프리매치 API' },
    { id: 'inplay', name: '인플레이 API' },
    { id: 'special', name: '스페셜 API' },
    { id: 'errors', name: '에러 코드' },
    { id: 'cors', name: 'CORS / 헤더' },
    { id: 'encoding', name: '인코딩 / 타임존' },
    { id: 'client', name: '클라이언트 예시' },
    { id: 'plans', name: '요금제' },
    { id: 'troubleshooting', name: '문제 해결' },
  ];

  function scrollTo(id: string) {
    activeSection = id;
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
</script>

<div class="flex min-h-[calc(100vh-50px)]">
  <!-- 좌측 사이드바 (목차) -->
  <aside class="w-[240px] shrink-0 bg-[#0d1117] border-r border-gray-800 p-4 overflow-y-auto sticky top-[50px] h-[calc(100vh-50px)] hidden lg:block">
    <div class="text-xs text-gray-500 uppercase tracking-wider mb-3 font-medium">Documentation</div>
    <nav class="space-y-0.5">
      {#each sections as sec}
        <button
          onclick={() => scrollTo(sec.id)}
          class="block w-full text-left px-3 py-2 text-sm rounded-lg transition-colors
            {activeSection === sec.id
              ? 'bg-blue-500/10 text-blue-400 font-medium'
              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'}"
        >{sec.name}</button>
      {/each}
    </nav>
  </aside>

  <!-- 본문 -->
  <main class="flex-1 max-w-[900px] mx-auto px-6 py-8">
    <!-- 개요 -->
    <section id="overview" class="mb-12">
      <h1 class="text-3xl font-bold text-white mb-2">MatchData API</h1>
      <p class="text-gray-400 mb-6">OpenAPI 3.0 기반 스포츠 배당 데이터 API 문서</p>

      <div class="bg-[#111827] rounded-xl p-5 border border-gray-800 mb-4">
        <div class="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span class="text-gray-500">Base URL</span>
            <div class="text-blue-400 font-mono mt-1">https://api.matchdata.net/api</div>
          </div>
          <div>
            <span class="text-gray-500">인증 방식</span>
            <div class="text-gray-200 mt-1">Bearer Token (JWT)</div>
          </div>
          <div>
            <span class="text-gray-500">응답 포맷</span>
            <div class="text-gray-200 mt-1">JSON (UTF-8)</div>
          </div>
          <div>
            <span class="text-gray-500">타임존</span>
            <div class="text-gray-200 mt-1">UTC+9 (KST)</div>
          </div>
        </div>
      </div>

      <div class="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 text-sm text-blue-300">
        모든 API 요청에는 <code class="bg-blue-500/10 px-1.5 py-0.5 rounded text-blue-400">Authorization: Bearer YOUR_TOKEN</code> 헤더가 필수입니다.
      </div>
    </section>

    <!-- 회원가입 / 인증 -->
    <section id="auth" class="mb-12">
      <h2 class="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <span class="w-7 h-7 rounded-lg bg-green-500/10 flex items-center justify-center text-green-400 text-sm">1</span>
        회원가입 및 인증
      </h2>

      <!-- Register -->
      <div class="bg-[#111827] rounded-xl border border-gray-800 mb-4 overflow-hidden">
        <div class="flex items-center gap-2 px-4 py-3 border-b border-gray-800">
          <span class="px-2 py-0.5 rounded text-xs font-bold bg-green-500/20 text-green-400">POST</span>
          <code class="text-sm text-gray-200">/auth/register</code>
          <span class="text-xs text-gray-500 ml-auto">회원가입</span>
        </div>
        <div class="p-4">
          <div class="text-xs text-gray-500 mb-2">Request Body</div>
          <pre class="bg-[#0d1117] rounded-lg p-3 text-xs text-gray-300 overflow-x-auto"><code>{`{
  "company": "Example Corp",
  "email": "dev@example.com",
  "password": "SecurePass123!",
  "contact_name": "홍길동",
  "contact_phone": "010-1234-5678",
  "usage_purpose": "스포츠 데이터 분석"
}`}</code></pre>
          <div class="mt-3 text-xs text-gray-500">가입 후 관리자 심사 (1-2 영업일) 승인 시 API 키 발급</div>
        </div>
      </div>

      <!-- Login -->
      <div class="bg-[#111827] rounded-xl border border-gray-800 mb-4 overflow-hidden">
        <div class="flex items-center gap-2 px-4 py-3 border-b border-gray-800">
          <span class="px-2 py-0.5 rounded text-xs font-bold bg-green-500/20 text-green-400">POST</span>
          <code class="text-sm text-gray-200">/auth/login</code>
          <span class="text-xs text-gray-500 ml-auto">로그인 (토큰 발급)</span>
        </div>
        <div class="p-4">
          <div class="text-xs text-gray-500 mb-2">Request Body</div>
          <pre class="bg-[#0d1117] rounded-lg p-3 text-xs text-gray-300 overflow-x-auto"><code>{`{
  "email": "dev@example.com",
  "password": "SecurePass123!"
}`}</code></pre>
          <div class="text-xs text-gray-500 mt-3 mb-2">Response (200)</div>
          <pre class="bg-[#0d1117] rounded-lg p-3 text-xs text-gray-300 overflow-x-auto"><code>{`{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "expires_at": "2024-03-15T09:30:00Z",
  "refresh_token": "dGhpcyBpcyBhIHJl..."
}`}</code></pre>
        </div>
      </div>

      <!-- Refresh -->
      <div class="bg-[#111827] rounded-xl border border-gray-800 mb-4 overflow-hidden">
        <div class="flex items-center gap-2 px-4 py-3 border-b border-gray-800">
          <span class="px-2 py-0.5 rounded text-xs font-bold bg-green-500/20 text-green-400">POST</span>
          <code class="text-sm text-gray-200">/auth/refresh</code>
          <span class="text-xs text-gray-500 ml-auto">토큰 갱신</span>
        </div>
        <div class="p-4">
          <pre class="bg-[#0d1117] rounded-lg p-3 text-xs text-gray-300 overflow-x-auto"><code>{`{ "refresh_token": "dGhpcyBpcyBhIHJl..." }`}</code></pre>
        </div>
      </div>
    </section>

    <!-- API 엔드포인트 구조 -->
    <section id="endpoints" class="mb-12">
      <h2 class="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <span class="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 text-sm">2</span>
        API 엔드포인트 구조
      </h2>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-[#111827] rounded-xl p-4 border border-green-500/20">
          <div class="text-green-400 font-medium text-sm mb-2">Prematch</div>
          <div class="text-xs text-gray-400 space-y-1">
            <div>경기 시작 전 정보</div>
            <div>경기목록 + 배당 데이터</div>
            <div>페이지네이션 지원</div>
          </div>
        </div>
        <div class="bg-[#111827] rounded-xl p-4 border border-blue-500/20">
          <div class="text-blue-400 font-medium text-sm mb-2">InPlay</div>
          <div class="text-xs text-gray-400 space-y-1">
            <div>실시간 경기 정보</div>
            <div>스코어 5초 / 배당 1초</div>
            <div>동적 배당 변동</div>
          </div>
        </div>
        <div class="bg-[#111827] rounded-xl p-4 border border-purple-500/20">
          <div class="text-purple-400 font-medium text-sm mb-2">Special</div>
          <div class="text-xs text-gray-400 space-y-1">
            <div>특수 베팅 상품</div>
            <div>파레이, 콤보 등</div>
            <div>복합 배당 구조</div>
          </div>
        </div>
      </div>
    </section>

    <!-- 프리매치 API -->
    <section id="prematch" class="mb-12">
      <h2 class="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <span class="w-7 h-7 rounded-lg bg-green-500/10 flex items-center justify-center text-green-400 text-sm">3</span>
        프리매치 API
      </h2>

      <div class="bg-[#111827] rounded-xl border border-gray-800 mb-4 overflow-hidden">
        <div class="flex items-center gap-2 px-4 py-3 border-b border-gray-800">
          <span class="px-2 py-0.5 rounded text-xs font-bold bg-blue-500/20 text-blue-400">GET</span>
          <code class="text-sm text-gray-200">/prematch/matches</code>
          <span class="text-xs text-gray-500 ml-auto">경기 목록 조회</span>
        </div>
        <div class="p-4">
          <div class="text-xs text-gray-500 mb-2">Parameters</div>
          <table class="w-full text-xs">
            <thead><tr class="text-gray-500 border-b border-gray-800">
              <th class="text-left py-1.5">Name</th><th class="text-left py-1.5">Type</th><th class="text-left py-1.5">Default</th><th class="text-left py-1.5">Description</th>
            </tr></thead>
            <tbody class="text-gray-300">
              <tr class="border-b border-gray-800/50"><td class="py-1.5"><code>page</code></td><td>integer</td><td>1</td><td>페이지 번호</td></tr>
              <tr class="border-b border-gray-800/50"><td class="py-1.5"><code>limit</code></td><td>integer</td><td>50</td><td>페이지당 경기 수 (max: 100)</td></tr>
              <tr><td class="py-1.5"><code>sport</code></td><td>string</td><td>-</td><td>스포츠 종류</td></tr>
            </tbody>
          </table>

          <div class="text-xs text-gray-500 mt-4 mb-2">Example</div>
          <pre class="bg-[#0d1117] rounded-lg p-3 text-xs text-gray-300 overflow-x-auto"><code>curl -X GET "https://api.matchdata.net/api/prematch/matches?page=1&limit=50" \
  -H "Authorization: Bearer YOUR_TOKEN"</code></pre>
        </div>
      </div>

      <div class="bg-[#111827] rounded-xl border border-gray-800 overflow-hidden">
        <div class="flex items-center gap-2 px-4 py-3 border-b border-gray-800">
          <span class="px-2 py-0.5 rounded text-xs font-bold bg-blue-500/20 text-blue-400">GET</span>
          <code class="text-sm text-gray-200">/prematch/matches/{'{matchId}'}/odds</code>
          <span class="text-xs text-gray-500 ml-auto">배당 정보 조회</span>
        </div>
        <div class="p-4">
          <table class="w-full text-xs">
            <thead><tr class="text-gray-500 border-b border-gray-800">
              <th class="text-left py-1.5">Name</th><th class="text-left py-1.5">Type</th><th class="text-left py-1.5">Required</th><th class="text-left py-1.5">Description</th>
            </tr></thead>
            <tbody class="text-gray-300">
              <tr class="border-b border-gray-800/50"><td class="py-1.5"><code>matchId</code></td><td>integer</td><td>Yes</td><td>경기 ID (path)</td></tr>
              <tr><td class="py-1.5"><code>provider</code></td><td>string</td><td>No</td><td>배당사 필터</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- 인플레이 API -->
    <section id="inplay" class="mb-12">
      <h2 class="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <span class="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 text-sm">4</span>
        인플레이 API
      </h2>

      <div class="bg-[#111827] rounded-xl border border-gray-800 overflow-hidden">
        <div class="flex items-center gap-2 px-4 py-3 border-b border-gray-800">
          <span class="px-2 py-0.5 rounded text-xs font-bold bg-blue-500/20 text-blue-400">GET</span>
          <code class="text-sm text-gray-200">/inplay/matches</code>
          <span class="text-xs text-gray-500 ml-auto">실시간 경기 목록</span>
        </div>
        <div class="p-4">
          <div class="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3 text-xs text-blue-300 mb-3">
            갱신 주기: 스코어 5초 / 배당 1초 (배당사별 변동 시)
          </div>
          <table class="w-full text-xs">
            <thead><tr class="text-gray-500 border-b border-gray-800">
              <th class="text-left py-1.5">Name</th><th class="text-left py-1.5">Type</th><th class="text-left py-1.5">Description</th>
            </tr></thead>
            <tbody class="text-gray-300">
              <tr><td class="py-1.5"><code>sport</code></td><td>string</td><td>스포츠 종류 필터</td></tr>
            </tbody>
          </table>
          <div class="text-xs text-gray-500 mt-3 mb-2">Response fields</div>
          <div class="text-xs text-gray-400 space-y-1">
            <div><code class="text-gray-300">matchId</code> - 경기 ID</div>
            <div><code class="text-gray-300">status</code> - "live"</div>
            <div><code class="text-gray-300">currentScore</code> - 현재 스코어 (ex: "1-0")</div>
            <div><code class="text-gray-300">elapsedTime</code> - 경과 시간 (분)</div>
          </div>
        </div>
      </div>
    </section>

    <!-- 스페셜 API -->
    <section id="special" class="mb-12">
      <h2 class="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <span class="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 text-sm">5</span>
        스페셜 API
      </h2>

      <div class="bg-[#111827] rounded-xl p-4 border border-gray-800 text-sm text-gray-400">
        <p class="mb-2">스페셜 API는 프리매치 데이터에서 메인 마켓(승무패, 핸디캡, 언오버)을 제외한 특수 마켓을 제공합니다.</p>
        <div class="text-xs text-gray-500 space-y-1">
          <div>- 파레이, 콤보 등 복합 배당</div>
          <div>- 스페셜 상품별 배당 계산 방식</div>
          <div>- Premium 요금제에서만 사용 가능</div>
        </div>
      </div>
    </section>

    <!-- 에러 코드 -->
    <section id="errors" class="mb-12">
      <h2 class="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <span class="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400 text-sm">6</span>
        에러 코드
      </h2>

      <div class="bg-[#111827] rounded-xl border border-gray-800 overflow-hidden">
        <table class="w-full text-sm">
          <thead><tr class="text-gray-500 border-b border-gray-800 text-xs">
            <th class="text-left px-4 py-2">Code</th><th class="text-left px-4 py-2">Status</th><th class="text-left px-4 py-2">Description</th>
          </tr></thead>
          <tbody class="text-gray-300 text-xs">
            <tr class="border-b border-gray-800/50"><td class="px-4 py-2"><code>AUTH_001</code></td><td>401</td><td>토큰 없음 또는 만료</td></tr>
            <tr class="border-b border-gray-800/50"><td class="px-4 py-2"><code>AUTH_002</code></td><td>403</td><td>심사 미승인 계정 / 권한 부족</td></tr>
            <tr class="border-b border-gray-800/50"><td class="px-4 py-2"><code>RATE_001</code></td><td>429</td><td>API 호출 빈도 초과</td></tr>
            <tr><td class="px-4 py-2"><code>NOT_FOUND</code></td><td>404</td><td>리소스 없음 (경기 등)</td></tr>
          </tbody>
        </table>
      </div>

      <div class="mt-3 text-xs text-gray-500">
        에러 응답 형식: <code class="text-gray-400">{`{ "error": "메시지", "code": "AUTH_001", "retryAfter": 30 }`}</code>
      </div>
    </section>

    <!-- CORS / 헤더 -->
    <section id="cors" class="mb-12">
      <h2 class="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <span class="w-7 h-7 rounded-lg bg-yellow-500/10 flex items-center justify-center text-yellow-400 text-sm">7</span>
        CORS 설정 및 HTTP 헤더
      </h2>

      <div class="bg-[#111827] rounded-xl p-4 border border-gray-800 mb-4">
        <div class="text-xs text-gray-500 mb-2">필수 헤더</div>
        <pre class="bg-[#0d1117] rounded-lg p-3 text-xs text-gray-300"><code>Authorization: Bearer {'{JWT_TOKEN}'}
Content-Type: application/json
Accept: application/json
Accept-Charset: utf-8</code></pre>
      </div>

      <div class="bg-[#111827] rounded-xl p-4 border border-gray-800">
        <div class="text-xs text-gray-500 mb-2">CORS 에러 해결</div>
        <pre class="bg-[#0d1117] rounded-lg p-3 text-xs text-gray-300 overflow-x-auto"><code>{`fetch('https://api.matchdata.net/api/prematch/matches', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  credentials: 'include'
})`}</code></pre>
      </div>
    </section>

    <!-- 인코딩 / 타임존 -->
    <section id="encoding" class="mb-12">
      <h2 class="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <span class="w-7 h-7 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400 text-sm">8</span>
        인코딩 및 타임존
      </h2>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="bg-[#111827] rounded-xl p-4 border border-gray-800">
          <div class="text-sm text-gray-300 font-medium mb-2">문자 인코딩</div>
          <div class="text-xs text-gray-400 space-y-1">
            <div>- 모든 요청/응답: UTF-8</div>
            <div>- 특수 문자 (한글 등): URL 인코딩 필수</div>
          </div>
          <pre class="bg-[#0d1117] rounded-lg p-2 text-xs text-gray-300 mt-2"><code>{`const q = encodeURIComponent("팀 이름");`}</code></pre>
        </div>
        <div class="bg-[#111827] rounded-xl p-4 border border-gray-800">
          <div class="text-sm text-gray-300 font-medium mb-2">타임존</div>
          <div class="text-xs text-gray-400 space-y-1">
            <div>- 서버: UTC+9 (KST)</div>
            <div>- 요청: ISO 8601 형식</div>
            <div>- 응답: UTC 기준 반환</div>
          </div>
          <pre class="bg-[#0d1117] rounded-lg p-2 text-xs text-gray-300 mt-2"><code>{`"2024-03-14T09:30:00Z"`}</code></pre>
        </div>
      </div>
    </section>

    <!-- 클라이언트 예시 -->
    <section id="client" class="mb-12">
      <h2 class="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <span class="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 text-sm">9</span>
        클라이언트 구현 예시
      </h2>

      <div class="bg-[#111827] rounded-xl border border-gray-800 overflow-hidden">
        <!-- 탭 헤더 -->
        <div class="flex border-b border-gray-800">
          {#each [
            { id: 'javascript', label: 'JavaScript' },
            { id: 'python', label: 'Python' },
            { id: 'php', label: 'PHP' },
          ] as tab}
            <button
              onclick={() => activeTab = tab.id}
              class="px-5 py-3 text-xs font-medium transition-colors relative
                {activeTab === tab.id
                  ? 'text-blue-400 bg-blue-500/5'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/30'}"
            >
              {tab.label}
              {#if activeTab === tab.id}
                <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400"></div>
              {/if}
            </button>
          {/each}
        </div>

        <!-- JavaScript -->
        {#if activeTab === 'javascript'}
        <pre class="p-4 text-xs text-gray-300 overflow-x-auto"><code>{`const API_KEY = 'YOUR_API_KEY';
const BASE = 'https://api.matchdata.net/api';

// ── 1. 전체 데이터 가져오기 ──
async function getFullData(sport = 'soccer', page = 1) {
  const res = await fetch(
    \`\${BASE}/prematch/\${sport}?page=\${page}&limit=50\`,
    { headers: { 'x-api-key': API_KEY } }
  );
  const json = await res.json();
  console.log(\`전체 경기: \${json.data.pagination.total}건\`);
  return json;
}

// ── 2. 업데이트분만 가져오기 (since 사용) ──
let lastServerTime = 0;

async function getUpdates(sport = 'soccer') {
  // 첫 호출: 전체 데이터
  if (!lastServerTime) {
    const full = await getFullData(sport);
    lastServerTime = full.data.server_time;
    return full;
  }

  // 이후: 변경분만
  const res = await fetch(
    \`\${BASE}/prematch/\${sport}?since=\${lastServerTime}\`,
    { headers: { 'x-api-key': API_KEY } }
  );
  const json = await res.json();
  lastServerTime = json.data.server_time;

  console.log(\`변경: \${json.data.counts.updated}건, 삭제: \${json.data.counts.removed}건\`);
  return json;
}

// ── 3. 주기적 폴링 (30초마다) ──
setInterval(() => getUpdates('soccer'), 30000);

// ── 인플레이 (실시간) ──
async function getInplay(sport = 'soccer') {
  const res = await fetch(
    \`\${BASE}/inplay/\${sport}\`,
    { headers: { 'x-api-key': API_KEY } }
  );
  return res.json();
}`}</code></pre>
        {/if}

        <!-- Python -->
        {#if activeTab === 'python'}
        <pre class="p-4 text-xs text-gray-300 overflow-x-auto"><code>{`import requests
import time

API_KEY = 'YOUR_API_KEY'
BASE = 'https://api.matchdata.net/api'
HEADERS = {'x-api-key': API_KEY}

# ── 1. 전체 데이터 가져오기 ──
def get_full_data(sport='soccer', page=1, limit=50):
    res = requests.get(
        f'{BASE}/prematch/{sport}',
        headers=HEADERS,
        params={'page': page, 'limit': limit}
    )
    data = res.json()
    print(f"전체 경기: {data['data']['pagination']['total']}건")
    return data

# ── 2. 업데이트분만 가져오기 (since 사용) ──
def get_updates(sport='soccer', since=0):
    if since == 0:
        return get_full_data(sport)

    res = requests.get(
        f'{BASE}/prematch/{sport}',
        headers=HEADERS,
        params={'since': since}
    )
    data = res.json()
    counts = data['data']['counts']
    print(f"변경: {counts['updated']}건, 삭제: {counts['removed']}건")
    return data

# ── 3. 주기적 폴링 예제 ──
def poll_prematch(sport='soccer', interval=30):
    # 첫 호출: 전체 데이터
    result = get_full_data(sport)
    server_time = result['data']['server_time']

    while True:
        time.sleep(interval)
        result = get_updates(sport, since=server_time)
        server_time = result['data']['server_time']

# ── 인플레이 (실시간) ──
def get_inplay(sport='soccer'):
    res = requests.get(f'{BASE}/inplay/{sport}', headers=HEADERS)
    return res.json()

# 실행
if __name__ == '__main__':
    # 전체 데이터
    data = get_full_data('soccer')

    # 업데이트 폴링 시작 (30초 간격)
    poll_prematch('soccer', interval=30)`}</code></pre>
        {/if}

        <!-- PHP -->
        {#if activeTab === 'php'}
        <pre class="p-4 text-xs text-gray-300 overflow-x-auto"><code>{`<?php
$API_KEY = 'YOUR_API_KEY';
$BASE = 'https://api.matchdata.net/api';

// ── 공통 API 호출 함수 ──
function apiRequest($url, $apiKey) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => ["x-api-key: {$apiKey}"],
        CURLOPT_TIMEOUT => 30,
    ]);
    $response = curl_exec($ch);
    curl_close($ch);
    return json_decode($response, true);
}

// ── 1. 전체 데이터 가져오기 ──
function getFullData($sport = 'soccer', $page = 1, $limit = 50) {
    global $BASE, $API_KEY;
    $url = "{$BASE}/prematch/{$sport}?page={$page}&limit={$limit}";
    $data = apiRequest($url, $API_KEY);
    echo "전체 경기: {$data['data']['pagination']['total']}건\\n";
    return $data;
}

// ── 2. 업데이트분만 가져오기 (since 사용) ──
function getUpdates($sport = 'soccer', $since = 0) {
    global $BASE, $API_KEY;
    if ($since === 0) {
        return getFullData($sport);
    }

    $url = "{$BASE}/prematch/{$sport}?since={$since}";
    $data = apiRequest($url, $API_KEY);
    $counts = $data['data']['counts'];
    echo "변경: {$counts['updated']}건, 삭제: {$counts['removed']}건\\n";
    return $data;
}

// ── 3. 인플레이 (실시간) ──
function getInplay($sport = 'soccer') {
    global $BASE, $API_KEY;
    $url = "{$BASE}/inplay/{$sport}";
    return apiRequest($url, $API_KEY);
}

// ── 사용 예시 ──
// 전체 데이터
$data = getFullData('soccer');
$serverTime = $data['data']['server_time'];

// 30초 후 업데이트분만 가져오기
sleep(30);
$updates = getUpdates('soccer', $serverTime);
$serverTime = $updates['data']['server_time'];

// 인플레이 데이터
$inplay = getInplay('soccer');
?>`}</code></pre>
        {/if}
      </div>

      <div class="mt-3 bg-blue-500/5 border border-blue-500/20 rounded-xl p-3 text-xs text-blue-300">
        <strong>TIP:</strong> 첫 요청으로 전체 데이터를 받은 뒤, 응답의 <code class="bg-blue-500/10 px-1 py-0.5 rounded">server_time</code>을
        다음 요청의 <code class="bg-blue-500/10 px-1 py-0.5 rounded">since</code> 파라미터로 사용하면 변경된 데이터만 효율적으로 받을 수 있습니다.
      </div>
    </section>

    <!-- 요금제 -->
    <section id="plans" class="mb-12">
      <h2 class="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <span class="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400 text-sm">10</span>
        요금제
      </h2>

      <div class="bg-[#111827] rounded-xl border border-gray-800 overflow-hidden">
        <table class="w-full text-sm">
          <thead><tr class="text-gray-500 border-b border-gray-800 text-xs">
            <th class="text-left px-4 py-3">항목</th>
            <th class="text-center px-4 py-3 text-gray-400">Free</th>
            <th class="text-center px-4 py-3 text-blue-400">Standard</th>
            <th class="text-center px-4 py-3 text-amber-400">Premium</th>
          </tr></thead>
          <tbody class="text-xs text-gray-300">
            <tr class="border-b border-gray-800/50">
              <td class="px-4 py-2">분당 호출</td><td class="text-center">100</td><td class="text-center">500</td><td class="text-center">2,000</td>
            </tr>
            <tr class="border-b border-gray-800/50">
              <td class="px-4 py-2">프리매치</td><td class="text-center text-green-400">O</td><td class="text-center text-green-400">O</td><td class="text-center text-green-400">O</td>
            </tr>
            <tr class="border-b border-gray-800/50">
              <td class="px-4 py-2">인플레이</td><td class="text-center text-gray-600">X</td><td class="text-center text-green-400">O</td><td class="text-center text-green-400">O</td>
            </tr>
            <tr class="border-b border-gray-800/50">
              <td class="px-4 py-2">스페셜</td><td class="text-center text-gray-600">X</td><td class="text-center text-gray-600">X</td><td class="text-center text-green-400">O</td>
            </tr>
            <tr class="border-b border-gray-800/50">
              <td class="px-4 py-2">갱신 주기</td><td class="text-center">30초</td><td class="text-center">5초</td><td class="text-center">1초</td>
            </tr>
            <tr>
              <td class="px-4 py-2">기술 지원</td><td class="text-center">이메일</td><td class="text-center">이메일+채팅</td><td class="text-center">전담 매니저</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="mt-3 text-xs text-gray-500">
        요금제 변경: 대시보드 또는 <code class="text-gray-400">support@matchdata.net</code>
      </div>
    </section>

    <!-- 문제 해결 -->
    <section id="troubleshooting" class="mb-12">
      <h2 class="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <span class="w-7 h-7 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-400 text-sm">11</span>
        문제 해결
      </h2>

      <div class="bg-[#111827] rounded-xl border border-gray-800 overflow-hidden">
        <table class="w-full text-xs">
          <thead><tr class="text-gray-500 border-b border-gray-800">
            <th class="text-left px-4 py-2">문제</th><th class="text-left px-4 py-2">원인</th><th class="text-left px-4 py-2">해결</th>
          </tr></thead>
          <tbody class="text-gray-300">
            <tr class="border-b border-gray-800/50">
              <td class="px-4 py-2">401 Unauthorized</td><td class="px-4 py-2 text-gray-400">토큰 만료/형식 오류</td><td class="px-4 py-2 text-gray-400">/auth/refresh 호출</td>
            </tr>
            <tr class="border-b border-gray-800/50">
              <td class="px-4 py-2">403 Forbidden</td><td class="px-4 py-2 text-gray-400">미승인/권한 부족</td><td class="px-4 py-2 text-gray-400">계정 상태 확인 or 업그레이드</td>
            </tr>
            <tr class="border-b border-gray-800/50">
              <td class="px-4 py-2">429 Too Many Requests</td><td class="px-4 py-2 text-gray-400">호출 빈도 초과</td><td class="px-4 py-2 text-gray-400">retryAfter 대기 후 재시도</td>
            </tr>
            <tr class="border-b border-gray-800/50">
              <td class="px-4 py-2">CORS 에러</td><td class="px-4 py-2 text-gray-400">브라우저 정책</td><td class="px-4 py-2 text-gray-400">서버 CORS 헤더 설정</td>
            </tr>
            <tr>
              <td class="px-4 py-2">배당 불일치</td><td class="px-4 py-2 text-gray-400">갱신 지연</td><td class="px-4 py-2 text-gray-400">5초 대기 후 재조회</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- 지원 종목 -->
    <div class="bg-[#111827] rounded-xl p-4 border border-gray-800">
      <div class="text-sm text-gray-300 font-medium mb-3">지원 종목</div>
      <div class="flex flex-wrap gap-2">
        {#each ['soccer', 'basketball', 'baseball', 'volleyball', 'icehockey', 'americanfootball', 'tennis', 'handball', 'tabletennis', 'esports', 'boxingufc'] as sport}
          <span class="px-3 py-1.5 bg-gray-800 rounded-lg text-xs text-gray-300">{sport}</span>
        {/each}
      </div>
    </div>

    <div class="mt-8 text-center text-xs text-gray-600">
      &copy; 2024 MatchData. All rights reserved. Contact: support@matchdata.net
    </div>
  </main>
</div>
