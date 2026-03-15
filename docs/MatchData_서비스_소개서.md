# MatchData - 실시간 스포츠 배당 데이터 API 서비스

---

## 1. 서비스 개요

### 1.1 서비스 소개

**MatchData**는 전 세계 스포츠 경기의 **실시간 배당(Odds) 데이터**를 RESTful API로 제공하는 B2B 데이터 서비스입니다.

프리매치(경기 전), 인플레이(실시간), 스페셜 마켓 등 다양한 유형의 배당 데이터를 단일 API 엔드포인트를 통해 JSON 형식으로 제공하며, 스포츠 분석 플랫폼, 배팅 서비스, 데이터 시각화 서비스 등 다양한 비즈니스에 활용할 수 있습니다.

### 1.2 핵심 가치

| 항목 | 설명 |
|------|------|
| **실시간 데이터** | 프리매치 30초, 인플레이 5초 주기로 자동 갱신되는 최신 배당 데이터 |
| **11개 종목 지원** | 축구, 농구, 야구, 배구, 아이스하키, 미식축구, 테니스, 핸드볼, 탁구, e스포츠, 격투기 |
| **효율적 데이터 전송** | 전체 데이터 + 변경분만 받는 Delta Updates 지원 (트래픽 최소화) |
| **즉시 사용 가능** | 회원가입 → 승인 → API Key 발급 → 바로 데이터 호출 |
| **다국어 데이터** | 리그명, 팀명 한국어/영어 동시 제공 |

### 1.3 서비스 URL

| 구분 | URL |
|------|-----|
| **API 엔드포인트** | `https://api.matchdata.net/api` |
| **웹 대시보드** | `https://matchdata.net` |
| **API 문서** | `https://matchdata.net/docs` |

---

## 2. 지원 종목 및 데이터 유형

### 2.1 지원 종목 (11개)

| 종목 코드 | 종목명 (한국어) | 종목명 (영어) |
|-----------|-----------------|---------------|
| `soccer` | 축구 | Soccer / Football |
| `basketball` | 농구 | Basketball |
| `baseball` | 야구 | Baseball |
| `volleyball` | 배구 | Volleyball |
| `icehockey` | 아이스하키 | Ice Hockey |
| `americanfootball` | 미식축구 | American Football |
| `tennis` | 테니스 | Tennis |
| `handball` | 핸드볼 | Handball |
| `tabletennis` | 탁구 | Table Tennis |
| `esports` | e스포츠 | Esports |
| `boxingufc` | 격투기 (복싱/UFC) | Boxing / UFC |

### 2.2 데이터 유형

#### Prematch (프리매치) - 경기 시작 전 배당
- 경기 시작 전 확정된 배당 데이터
- 갱신 주기: **30초**
- 페이지네이션 지원 (최대 100건/페이지)
- 리그별 필터링 가능

#### InPlay (인플레이) - 실시간 라이브 배당
- 진행 중인 경기의 실시간 배당 변동
- 갱신 주기: **5초**
- 실시간 스코어, 경기 시간, 경기 상태 포함
- 배당 변동 즉시 반영

#### Special (스페셜) - 특수 마켓 배당
- 메인 마켓(승무패, 핸디캡, 언오버) 외의 특수 배당
- 코너킥, 카드, 득점자 등 세부 마켓
- 프리매치 기반 데이터에서 자동 필터링

### 2.3 제공 마켓 유형

| 마켓 유형 | 설명 | 예시 |
|-----------|------|------|
| **1X2 (승무패)** | 홈 승 / 무승부 / 원정 승 | Home: 1.85, Draw: 3.40, Away: 4.20 |
| **Handicap (핸디캡)** | 핸디캡 기준선 적용 승부 | Line: -1.5, Home: 2.10, Away: 1.75 |
| **Over/Under (언오버)** | 총 득점 기준선 초과/미달 | Line: 2.5, Over: 1.90, Under: 1.95 |
| **Special (스페셜)** | 기타 특수 마켓 | 코너킥, 카드, 양팀 득점 등 |

---

## 3. API 구조 및 엔드포인트

### 3.1 Base URL

```
https://api.matchdata.net/api
```

### 3.2 데이터 조회 엔드포인트

| Method | 엔드포인트 | 설명 | 인증 |
|--------|-----------|------|------|
| `GET` | `/prematch/{sport}` | 프리매치 경기 목록 + 배당 | API Key / JWT |
| `GET` | `/inplay/{sport}` | 인플레이 실시간 경기 + 배당 | API Key / JWT |
| `GET` | `/special/{sport}` | 스페셜 마켓 데이터 | API Key / JWT |
| `GET` | `/match/{sport}/{id}` | 경기 상세 (전체 마켓) | API Key / JWT |
| `GET` | `/sports` | 종목 목록 + 경기 수 | API Key / JWT |
| `GET` | `/leagues/{sport}` | 리그 목록 | API Key / JWT |

### 3.3 인증/계정 엔드포인트

| Method | 엔드포인트 | 설명 | 인증 |
|--------|-----------|------|------|
| `POST` | `/auth/register` | 회원가입 | 불필요 |
| `POST` | `/auth/login` | 로그인 (JWT 발급) | 불필요 |
| `POST` | `/auth/refresh` | 토큰 갱신 | Refresh Token |
| `GET` | `/auth/me` | 내 정보 + 사용량 | JWT |
| `GET/POST` | `/keys` | API Key 목록 / 생성 | JWT |
| `DELETE` | `/keys/{keyId}` | API Key 삭제 | JWT |
| `GET/POST` | `/account/ips` | IP 화이트리스트 관리 | JWT |
| `DELETE` | `/account/ips/{id}` | 등록 IP 삭제 | JWT |
| `GET` | `/account/usage` | 사용량 조회 | JWT |

### 3.4 관리자 엔드포인트

| Method | 엔드포인트 | 설명 | 인증 |
|--------|-----------|------|------|
| `GET` | `/admin/users` | 사용자 목록 | Admin JWT |
| `GET/PATCH` | `/admin/users/{id}` | 사용자 상세/승인/정지/플랜 변경 | Admin JWT |
| `GET` | `/admin/stats` | 전체 통계 | Admin JWT |
| `GET` | `/admin/usage` | 사용량 리포트 | Admin JWT |

---

## 4. 데이터 조회 모드 (Full / Updates)

### 4.1 개념

MatchData API는 **두 가지 데이터 조회 모드**를 제공합니다:

```
┌──────────────────────────────────────────────────────────────┐
│                    데이터 조회 흐름                            │
│                                                              │
│  [1단계] 전체 데이터 요청 (Full Mode)                          │
│  GET /api/prematch/soccer                                    │
│  → 전체 경기 데이터 반환                                       │
│  → 응답에 server_time 포함                                    │
│                                                              │
│  [2단계] 변경분만 요청 (Updates Mode) - 반복                    │
│  GET /api/prematch/soccer?since={server_time}                │
│  → 변경된 경기 + 삭제된 경기 ID만 반환                          │
│  → 새로운 server_time으로 다음 요청                             │
│                                                              │
│  ┌─────────┐    30초    ┌──────────┐    30초    ┌──────────┐ │
│  │Full Data│ ────────→ │Updates #1│ ────────→ │Updates #2│ │
│  │ 1000건  │           │  15건    │           │   3건    │  │
│  └─────────┘           └──────────┘           └──────────┘  │
│                                                              │
│  ★ 트래픽 절감: 첫 요청만 전체, 이후는 변경분만                   │
└──────────────────────────────────────────────────────────────┘
```

### 4.2 Full Mode (전체 데이터)

**요청:**
```
GET /api/prematch/soccer?page=1&limit=50
```

**응답 구조:**
```json
{
  "success": true,
  "mode": "full",
  "data": {
    "matches": [...],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 1000,
      "total_pages": 20,
      "has_next": true
    },
    "server_time": 1710500000000,
    "meta": {
      "sport": "soccer",
      "cache_age_seconds": 5,
      "hint": "server_time을 since 파라미터로 사용하면 업데이트분만 조회할 수 있습니다."
    }
  }
}
```

### 4.3 Updates Mode (변경분만)

**요청:**
```
GET /api/prematch/soccer?since=1710500000000
```

**응답 구조:**
```json
{
  "success": true,
  "mode": "updates",
  "data": {
    "updated": [...],
    "removed": [12345, 67890],
    "counts": {
      "updated": 15,
      "removed": 2
    },
    "since": 1710500000000,
    "server_time": 1710500030000
  },
  "meta": {
    "sport": "soccer",
    "cache_age_seconds": 2,
    "hint": "다음 요청 시 server_time을 since 파라미터로 사용하세요."
  }
}
```

### 4.4 변경 감지 방식

- 서버는 각 경기의 **배당값, 스코어, 상태**를 해시로 관리
- 30초(프리매치) / 5초(인플레이) 주기로 원본 API에서 데이터 갱신
- 해시가 변경된 경기만 `updated`에 포함
- 이전 갱신에 있었지만 현재 없는 경기는 `removed`에 ID 포함
- 삭제 기록은 **10분간 유지** (지연 조회에도 누락 방지)

---

## 5. 인증 시스템

### 5.1 3중 인증 체계

MatchData는 **3가지 인증 방식**을 지원하며, 우선순위에 따라 자동 적용됩니다:

```
┌─────────────────────────────────────────────────┐
│              인증 우선순위                         │
│                                                   │
│  1순위: API Key (x-api-key 헤더)                   │
│  ├── 서버 간 통신에 최적                            │
│  ├── IP 화이트리스트 체크 적용                       │
│  └── 만료 없음 (삭제 전까지 유효)                    │
│                                                   │
│  2순위: JWT Bearer Token (Authorization 헤더)      │
│  ├── 클라이언트 앱에 적합                           │
│  ├── 15분 만료, Refresh Token으로 갱신              │
│  └── IP 화이트리스트 미적용                         │
│                                                   │
│  3순위: Cookie Session                             │
│  ├── 웹 대시보드 전용                               │
│  └── 중복 로그인 감지 (마지막 세션만 유효)            │
└─────────────────────────────────────────────────┘
```

### 5.2 API Key 인증 (권장)

```bash
# 헤더 방식 (권장)
curl -H "x-api-key: YOUR_API_KEY" \
  https://api.matchdata.net/api/prematch/soccer

# 쿼리 파라미터 방식 (대안)
curl "https://api.matchdata.net/api/prematch/soccer?api_key=YOUR_API_KEY"
```

### 5.3 JWT 인증

```bash
# 1. 로그인으로 토큰 발급
curl -X POST https://api.matchdata.net/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"dev@example.com","password":"SecurePass123!"}'

# 응답: { "accessToken": "eyJ...", "refreshToken": "eyJ...", "expiresIn": 900 }

# 2. API 호출
curl -H "Authorization: Bearer eyJ..." \
  https://api.matchdata.net/api/prematch/soccer

# 3. 토큰 만료 시 갱신
curl -X POST https://api.matchdata.net/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refresh_token":"eyJ..."}'
```

### 5.4 API Key 발급 절차

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ 1. 가입   │ →  │ 2. 심사   │ →  │ 3. 승인   │ →  │ 4. 로그인 │ →  │ 5. 키 생성│
│ /register │    │ 관리자    │    │ 계정 활성 │    │ 대시보드  │    │ /account │
│ 정보 입력 │    │ 수동 검토 │    │ 이메일    │    │ 접속     │    │ API Key  │
└──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
                                                                     │
                                                               ┌─────┴─────┐
                                                               │ 6. IP 등록 │
                                                               │ 유료 플랜  │
                                                               │ 필수       │
                                                               └───────────┘
```

---

## 6. 요금제 (Pricing Plans)

### 6.1 요금제 비교표

| 항목 | Free | Standard | Premium | Enterprise |
|------|------|----------|---------|------------|
| **월 요금** | **$0** | **$49/월** | **$149/월** | **$499/월** |
| **분당 호출** | 10회 | 30회 | 60회 | 120회 |
| **일일 호출** | 1,000회 | 10,000회 | 50,000회 | 200,000회 |
| **API Key** | 1개 | 3개 | 5개 | 10개 |
| **IP 등록** | 3개 (선택) | 5개 (필수) | 10개 (필수) | 무제한 (필수) |
| **CIDR 지원** | - | - | O | O |
| | | | | |
| **Prematch** | O | O | O | O |
| **InPlay** | **X** | O | O | O |
| **Special** | **X** | O | O | O |
| **Match Detail** | **X** | **X** | O | O |
| | | | | |
| **지원 종목** | 3개 (축구, 농구, 야구) | **전체 11개** | **전체 11개** | **전체 11개** |
| **기술 지원** | 이메일 | 이메일+채팅 | 전담 매니저 | 전담 매니저 |

### 6.2 플랜별 적합한 사용 사례

| 플랜 | 적합한 사용 사례 |
|------|-----------------|
| **Free** | API 평가, 개발/테스트 환경, 소규모 개인 프로젝트 |
| **Standard** | 중소규모 서비스, 실시간 배당 필요한 서비스, 전체 종목 필요 시 |
| **Premium** | 대규모 서비스, 경기 상세 분석, 높은 호출량 필요 시 |
| **Enterprise** | 대형 플랫폼, 사실상 무제한 호출, 최우선 기술 지원 |

### 6.3 초과 사용 정책

- 분당 호출 초과: **429 Too Many Requests** 응답 + `Retry-After` 헤더
- 일일 호출 120% 초과: 호출 차단 (KST 자정 리셋)
- 응답 헤더에 항상 사용량 정보 포함:
  ```
  X-RateLimit-Limit: 30
  X-RateLimit-Remaining: 25
  X-RateLimit-Reset: 1710500060
  ```

---

## 7. 응답 데이터 구조

### 7.1 경기(Match) 데이터 구조

```json
{
  "id": 12345678,
  "sport": "soccer",
  "league": {
    "id": 100,
    "name": "프리미어 리그",
    "country": "잉글랜드",
    "image": "https://..."
  },
  "home": {
    "name": "맨체스터 시티",
    "image": "https://..."
  },
  "away": {
    "name": "리버풀",
    "image": "https://..."
  },
  "start_time": "2024-03-15 21:00",
  "start_time_unix": 1710536400,
  "status": "",
  "score": {
    "home": "",
    "away": ""
  },
  "odds": {
    "1x2": {
      "market_id": 10001,
      "home": "1.85",
      "draw": "3.60",
      "away": "4.20"
    },
    "handicap": {
      "market_id": 10008,
      "line": "-0.5",
      "home": "1.90",
      "away": "1.95"
    },
    "over_under": {
      "market_id": 10013,
      "line": "2.5",
      "over": "1.85",
      "under": "2.00"
    }
  },
  "markets_count": 45
}
```

### 7.2 인플레이 추가 필드

인플레이 데이터에는 경기 진행 정보가 추가됩니다:

```json
{
  "...": "...(기본 경기 데이터)",
  "live": {
    "match_minute": "67",
    "match_time_str": "67:23",
    "match_time_seconds": 4043,
    "status_id": 6
  },
  "score": {
    "home": "2",
    "away": "1"
  }
}
```

### 7.3 스페셜 마켓 데이터 구조

```json
{
  "id": 12345678,
  "sport": "soccer",
  "league": { "..." },
  "home": { "..." },
  "away": { "..." },
  "start_time": "2024-03-15 21:00",
  "markets": [
    {
      "market_id": 10050,
      "market_name": "양팀 득점",
      "lines": [
        {
          "name": "",
          "odds": [
            { "name": "Yes", "value": "1.72" },
            { "name": "No", "value": "2.10" }
          ]
        }
      ]
    },
    {
      "market_id": 10051,
      "market_name": "코너킥 합계 Over/Under",
      "lines": [
        {
          "name": "9.5",
          "odds": [
            { "name": "Over", "value": "1.85" },
            { "name": "Under", "value": "1.95" }
          ]
        }
      ]
    }
  ],
  "markets_count": 12
}
```

---

## 8. 보안 체계

### 8.1 IP 화이트리스트

| 플랜 | IP 등록 | 필수 여부 | CIDR 지원 |
|------|---------|----------|-----------|
| Free | 최대 3개 | 선택 | X |
| Standard | 최대 5개 | **필수** | X |
| Premium | 최대 10개 | **필수** | **O** |
| Enterprise | 무제한 | **필수** | **O** |

- 유료 플랜은 반드시 IP를 등록해야 API Key로 데이터 조회 가능
- `POST /api/account/ips`에서 `ip: "auto"` 전송 시 현재 접속 IP 자동 등록
- CIDR 표기법 지원: `203.0.113.0/24` (Premium 이상)
- IPv4 / IPv6 모두 지원

### 8.2 API Key 보안

- API Key는 **SHA-256 해시**로 저장 (원본 키는 생성 시 1회만 표시)
- Key Prefix로 식별: `lso_a1b2c3d4...` 형태
- 비활성화(Soft Delete) 방식 삭제 → 감사 추적 가능
- 사용 시마다 `last_used_at` 갱신

### 8.3 CORS 설정

```
Access-Control-Allow-Origin: (등록된 도메인)
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, X-API-Key
Access-Control-Max-Age: 86400
```

- Cloudflare를 통한 SSL/TLS 종단 (HTTPS 필수)
- OPTIONS Preflight 자동 처리

---

## 9. 기술 아키텍처

### 9.1 시스템 구성도

```
┌────────────────────────────────────────────────────────────────────┐
│                        클라이언트                                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │ 웹 앱    │  │ 모바일 앱 │  │ 서버     │  │ 스크립트  │           │
│  │ (React)  │  │ (Flutter)│  │ (Node)   │  │ (Python) │           │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘           │
│       └──────────────┴──────────────┴──────────────┘               │
│                          │ HTTPS                                    │
└──────────────────────────┼─────────────────────────────────────────┘
                           │
                    ┌──────┴──────┐
                    │ Cloudflare  │  ← SSL 종단, DDoS 방어, CDN
                    │   Proxy     │
                    └──────┬──────┘
                           │ HTTP
                    ┌──────┴──────┐
                    │   Nginx     │  ← 리버스 프록시, CORS, 로드밸런싱
                    │  (Port 80)  │
                    └──────┬──────┘
                           │
                    ┌──────┴──────┐
                    │  SvelteKit  │  ← API 서버 (Node.js)
                    │  (Port 3001)│
                    │  + PM2      │  ← 프로세스 관리, 무중단 운영
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
       ┌──────┴──────┐ ┌──┴───┐ ┌──────┴──────┐
       │ SQLite (WAL)│ │Memory│ │ 원본 API    │
       │  사용자 DB   │ │Cache │ │ (api-77.com)│
       │  API Key    │ │배당   │ │ 배당 데이터  │
       │  사용량     │ │데이터 │ │ 소스        │
       └─────────────┘ └──────┘ └─────────────┘
```

### 9.2 데이터 흐름

```
원본 API (api-77.com)
    │
    │  30초/5초 주기 자동 갱신
    ▼
메모리 캐시 (Map 구조)
    │
    │  해시 비교로 변경 감지
    │  변경된 경기만 changedAt 갱신
    ▼
API 응답 (JSON)
    │
    ├── Full Mode: 전체 데이터 + 페이지네이션
    │
    └── Updates Mode: 변경분 + 삭제 ID
```

### 9.3 기술 스택

| 계층 | 기술 | 역할 |
|------|------|------|
| **프론트엔드** | SvelteKit (Svelte 5) | 웹 대시보드, API 문서 |
| **백엔드** | SvelteKit + Node.js | API 서버, 인증, 라우팅 |
| **데이터베이스** | SQLite (WAL mode) | 사용자, API Key, 사용량 |
| **캐시** | In-memory Map | 배당 데이터 (해시 기반 변경 감지) |
| **인증** | JWT (jose) + bcrypt | 토큰 기반 인증 |
| **SSL** | Cloudflare | HTTPS 종단 |
| **프록시** | Nginx | 리버스 프록시, CORS |
| **프로세스** | PM2 | 무중단 운영, 자동 재시작 |

---

## 10. 사용자 여정 (User Journey)

### 10.1 전체 플로우

```
[가입] → [심사 대기] → [승인] → [로그인] → [API Key 생성] → [IP 등록] → [API 호출]
```

### 10.2 단계별 상세

#### Step 1: 회원가입
```
URL: https://matchdata.net/register

입력 항목:
- Username (필수): 3-20자, 영문/숫자
- Email (필수): 유효한 이메일
- Password (필수): 최소 6자
- Company (선택): 회사/서비스명
- 이용약관 동의 (필수)
```

#### Step 2: 관리자 심사
- 가입 즉시 계정 상태: `pending` (승인 대기)
- 관리자가 `/admin` 에서 확인 후 `active` 승인
- 기본 플랜: `free`

#### Step 3: 로그인 → 대시보드
```
URL: https://matchdata.net/login

로그인 후 대시보드에서 확인 가능:
- 프리매치 / 인플레이 실시간 데이터 미리보기
- 오늘 사용량 현황
- 종목별 경기 수
```

#### Step 4: API Key 생성
```
URL: https://matchdata.net/account

"+ 새 키 생성" 버튼 클릭
→ API Key 자동 생성 (중복 없는 고유 키)
→ 키가 화면에 표시됨 (항상 확인 가능)
→ "복사" 버튼으로 클립보드 복사
```

#### Step 5: IP 등록 (유료 플랜)
```
URL: https://matchdata.net/account

두 가지 등록 방식:
1. "현재 IP" 버튼: 접속 중인 IP 자동 등록
2. "직접 입력": 서버 IP 수동 입력

설명 필드로 어떤 서버인지 메모 가능
```

#### Step 6: API 호출
```bash
curl -H "x-api-key: YOUR_API_KEY" \
  "https://api.matchdata.net/api/prematch/soccer?limit=50"
```

---

## 11. 클라이언트 구현 가이드

### 11.1 JavaScript (Node.js / Browser)

```javascript
const API_KEY = 'YOUR_API_KEY';
const BASE = 'https://api.matchdata.net/api';

// 1. 전체 데이터 가져오기
async function getFullData(sport = 'soccer', page = 1) {
  const res = await fetch(
    `${BASE}/prematch/${sport}?page=${page}&limit=50`,
    { headers: { 'x-api-key': API_KEY } }
  );
  const json = await res.json();
  console.log(`전체 경기: ${json.data.pagination.total}건`);
  return json;
}

// 2. 변경분만 가져오기
let lastServerTime = 0;

async function getUpdates(sport = 'soccer') {
  if (!lastServerTime) {
    const full = await getFullData(sport);
    lastServerTime = full.data.server_time;
    return full;
  }

  const res = await fetch(
    `${BASE}/prematch/${sport}?since=${lastServerTime}`,
    { headers: { 'x-api-key': API_KEY } }
  );
  const json = await res.json();
  lastServerTime = json.data.server_time;
  console.log(`변경: ${json.data.counts.updated}건, 삭제: ${json.data.counts.removed}건`);
  return json;
}

// 3. 30초마다 자동 업데이트
setInterval(() => getUpdates('soccer'), 30000);
```

### 11.2 Python

```python
import requests
import time

API_KEY = 'YOUR_API_KEY'
BASE = 'https://api.matchdata.net/api'
HEADERS = {'x-api-key': API_KEY}

def get_full_data(sport='soccer', page=1, limit=50):
    res = requests.get(
        f'{BASE}/prematch/{sport}',
        headers=HEADERS,
        params={'page': page, 'limit': limit}
    )
    data = res.json()
    print(f"전체 경기: {data['data']['pagination']['total']}건")
    return data

def poll_updates(sport='soccer', interval=30):
    result = get_full_data(sport)
    server_time = result['data']['server_time']

    while True:
        time.sleep(interval)
        res = requests.get(
            f'{BASE}/prematch/{sport}',
            headers=HEADERS,
            params={'since': server_time}
        )
        result = res.json()
        server_time = result['data']['server_time']
        counts = result['data']['counts']
        print(f"변경: {counts['updated']}건, 삭제: {counts['removed']}건")
```

### 11.3 PHP

```php
<?php
$API_KEY = 'YOUR_API_KEY';
$BASE = 'https://api.matchdata.net/api';

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

// 전체 데이터
$data = apiRequest("{$BASE}/prematch/soccer?page=1&limit=50", $API_KEY);
$serverTime = $data['data']['server_time'];

// 30초 후 변경분만
sleep(30);
$updates = apiRequest("{$BASE}/prematch/soccer?since={$serverTime}", $API_KEY);
echo "변경: {$updates['data']['counts']['updated']}건\n";
?>
```

---

## 12. 에러 코드 및 문제 해결

### 12.1 에러 코드 목록

| 에러 코드 | HTTP | 설명 | 해결 방법 |
|-----------|------|------|-----------|
| `AUTH_UNAUTHORIZED` | 401 | 인증 정보 없음 | API Key 또는 JWT 토큰 확인 |
| `API_KEY_INVALID` | 401 | 잘못된 API Key | Key 재확인 또는 새 Key 생성 |
| `TOKEN_INVALID` | 401 | JWT 만료/무효 | `/api/auth/refresh`로 갱신 |
| `ACCOUNT_PENDING` | 403 | 승인 대기 계정 | 관리자 승인 대기 |
| `ACCOUNT_SUSPENDED` | 403 | 정지된 계정 | 관리자 문의 |
| `PLAN_ACCESS_DENIED` | 403 | 플랜 권한 부족 | 상위 플랜 업그레이드 |
| `RATE_LIMIT_EXCEEDED` | 429 | 호출 한도 초과 | `Retry-After` 초 후 재시도 |
| `INVALID_SPORT` | 400 | 지원하지 않는 종목 | 종목 코드 확인 |
| `INVALID_PARAM` | 400 | 잘못된 파라미터 | 파라미터 형식 확인 |

### 12.2 에러 응답 형식

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "분당 30회 요청 한도를 초과했습니다. 15초 후 재시도해주세요.",
    "details": {
      "limit": 30,
      "remaining": 0,
      "retryAfter": 15
    }
  }
}
```

### 12.3 일반적인 문제와 해결

| 문제 | 원인 | 해결 |
|------|------|------|
| 401 응답 | API Key 미설정 또는 오류 | `x-api-key` 헤더 확인 |
| 403 + PLAN_ACCESS_DENIED | Free 플랜으로 InPlay 접근 | Standard 이상 업그레이드 |
| 403 + IP 관련 | IP 미등록 (유료 플랜) | `/account`에서 IP 등록 |
| 429 응답 | 분당 호출 초과 | `Retry-After` 헤더 값만큼 대기 |
| 빈 matches 배열 | 해당 종목 경기 없음 (시즌 오프 등) | 다른 종목 시도 |
| CORS 에러 | 브라우저 보안 정책 | 서버 사이드에서 호출 권장 |

---

## 13. 웹 대시보드 기능

### 13.1 주요 페이지

| 페이지 | URL | 설명 |
|--------|-----|------|
| **대시보드** | `/` | 실시간 경기 데이터 미리보기, 종목 탭 전환 |
| **계정 관리** | `/account` | API Key 생성/삭제, IP 등록/삭제, 사용량 확인 |
| **API 문서** | `/docs` | 인터랙티브 API 문서 (엔드포인트, 샘플 코드) |
| **로그인** | `/login` | 이메일/비밀번호 로그인 |
| **회원가입** | `/register` | 신규 계정 등록 |
| **관리자** | `/admin` | 사용자 관리, 승인/정지, 통계 (관리자 전용) |

### 13.2 대시보드 기능
- 종목별 탭으로 프리매치/인플레이 전환
- 경기 리스트: 리그, 팀명, 배당(1X2, 핸디캡, 언오버) 실시간 표시
- 리그 이미지, 팀 로고 포함
- 한국어 리그명/국가명 지원
- 다크 테마 UI

---

## 14. 운영 정보

### 14.1 SLA (서비스 수준)

| 항목 | 수준 |
|------|------|
| 서비스 가용성 | 99.5% (월 기준) |
| 데이터 갱신 주기 | 프리매치 30초 / 인플레이 5초 |
| API 응답 시간 | 평균 100ms 이내 |
| 동시 접속 | 무제한 (레이트 리밋 내) |

### 14.2 데이터 소스

- 글로벌 스포츠 데이터 프로바이더로부터 실시간 수집
- 11개 종목, 전 세계 리그 커버리지
- 배당 데이터 자동 정규화 (통일된 JSON 포맷)

### 14.3 문의

| 구분 | 연락처 |
|------|--------|
| 기술 지원 | support@matchdata.net |
| 사업 문의 | contact@matchdata.net |
| 웹사이트 | https://matchdata.net |

---

## 15. FAQ (자주 묻는 질문)

### Q1. 무료 플랜으로 어디까지 사용할 수 있나요?
> Free 플랜은 프리매치 데이터만 제공하며, 축구/농구/야구 3개 종목에 한정됩니다. 분당 10회, 일일 1,000회까지 호출 가능합니다. API 평가 및 개발 테스트 용도로 적합합니다.

### Q2. 데이터 갱신 주기는 어떻게 되나요?
> 프리매치 데이터는 30초, 인플레이 데이터는 5초 주기로 자동 갱신됩니다. Updates Mode(`?since=`)를 사용하면 변경된 데이터만 효율적으로 받을 수 있습니다.

### Q3. API Key는 만료되나요?
> API Key는 만료되지 않습니다. 사용자가 직접 삭제하기 전까지 유효합니다. 보안을 위해 주기적인 키 교체를 권장합니다.

### Q4. IP 화이트리스트를 등록하지 않으면 어떻게 되나요?
> Free 플랜은 IP 등록이 선택사항이므로 미등록 상태에서도 사용 가능합니다. Standard 이상 유료 플랜은 IP 등록이 필수이며, 미등록 시 API 호출이 거부됩니다.

### Q5. 브라우저(프론트엔드)에서 직접 API를 호출할 수 있나요?
> CORS가 설정되어 있어 브라우저에서 호출 가능하지만, **API Key가 노출되므로 서버 사이드에서 호출하는 것을 강력히 권장**합니다. JWT 인증은 브라우저 환경에서도 안전하게 사용할 수 있습니다.

### Q6. 경기가 없는 종목은 어떻게 응답되나요?
> 빈 배열 `"matches": []`이 반환됩니다. HTTP 상태 코드는 200입니다.

### Q7. Updates Mode에서 삭제된 경기는 어떻게 처리하나요?
> `removed` 배열에 삭제된 경기의 ID가 포함됩니다. 클라이언트에서 해당 ID의 경기를 로컬 데이터에서 제거하면 됩니다. 삭제 기록은 서버에서 10분간 유지됩니다.

### Q8. 여러 종목을 한 번에 조회할 수 있나요?
> 현재는 종목별로 개별 호출해야 합니다. `/api/sports` 엔드포인트에서 종목 목록과 경기 수를 확인한 후, 필요한 종목만 선택적으로 호출하는 것을 권장합니다.

### Q9. 플랜 변경은 어떻게 하나요?
> 대시보드에서 요청하거나 support@matchdata.net으로 문의해주세요. 즉시 적용됩니다.

### Q10. 데이터를 재판매할 수 있나요?
> 이용약관에 따라 원본 데이터의 직접 재판매는 금지됩니다. 가공/분석 서비스로 활용하는 것은 허용됩니다. 자세한 사항은 사업 문의로 확인해주세요.

---

*최종 업데이트: 2026년 3월 15일*
*문서 버전: 1.0*
*MatchData - Real-time Sports Odds Data API*
