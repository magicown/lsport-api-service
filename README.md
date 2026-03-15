# MatchData - Real-time Sports Odds Data API

**MatchData**는 전 세계 스포츠 경기의 실시간 배당(Odds) 데이터를 RESTful API로 제공하는 B2B 데이터 서비스입니다.

## Features

- **11개 종목 지원** - 축구, 농구, 야구, 배구, 아이스하키, 미식축구, 테니스, 핸드볼, 탁구, e스포츠, 격투기
- **3가지 데이터 유형** - Prematch(경기 전), InPlay(실시간), Special(특수 마켓)
- **Delta Updates** - 전체 데이터 + 변경분만 받는 효율적 데이터 전송
- **3중 인증** - API Key, JWT Bearer Token, Cookie Session
- **요금제별 접근 제어** - Free / Standard / Premium / Enterprise
- **레이트 리미팅** - 분당/일일 호출 한도 + IP 화이트리스트

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/prematch/{sport}` | 프리매치 경기 + 배당 |
| `GET` | `/api/inplay/{sport}` | 인플레이 실시간 데이터 |
| `GET` | `/api/special/{sport}` | 스페셜 마켓 데이터 |
| `GET` | `/api/sports` | 종목 목록 + 경기 수 |
| `GET` | `/api/leagues/{sport}` | 리그 목록 |
| `GET` | `/api/match/{sport}/{id}` | 경기 상세 (전체 마켓) |

## Quick Start

```bash
# 전체 데이터 가져오기
curl -H "x-api-key: YOUR_API_KEY" \
  "https://api.matchdata.net/api/prematch/soccer?limit=50"

# 변경분만 가져오기 (server_time을 since로 사용)
curl -H "x-api-key: YOUR_API_KEY" \
  "https://api.matchdata.net/api/prematch/soccer?since=1710500000000"
```

## Data Flow

```
1. 전체 데이터 요청  →  GET /api/prematch/soccer
                        응답: matches[] + server_time

2. 변경분만 요청     →  GET /api/prematch/soccer?since={server_time}
   (30초마다 반복)       응답: updated[] + removed[] + new server_time
```

## Authentication

```bash
# API Key (권장)
curl -H "x-api-key: YOUR_API_KEY" https://api.matchdata.net/api/prematch/soccer

# JWT Bearer Token
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" https://api.matchdata.net/api/prematch/soccer
```

## Pricing Plans

| | Free | Standard | Premium | Enterprise |
|---|---|---|---|---|
| **Price** | $0 | $49/mo | $149/mo | $499/mo |
| **Rate** | 10/min | 30/min | 60/min | 120/min |
| **Daily** | 1,000 | 10,000 | 50,000 | 200,000 |
| **Prematch** | O | O | O | O |
| **InPlay** | X | O | O | O |
| **Special** | X | O | O | O |
| **Sports** | 3 | All 11 | All 11 | All 11 |

## Tech Stack

- **Framework**: SvelteKit (Svelte 5) + Node.js
- **Database**: SQLite (WAL mode)
- **Cache**: In-memory Map (hash-based change detection)
- **Auth**: JWT (jose) + bcrypt + API Key (SHA-256)
- **Proxy**: Nginx + Cloudflare SSL
- **Process**: PM2

## Response Example

```json
{
  "success": true,
  "mode": "full",
  "data": {
    "matches": [
      {
        "id": 12345678,
        "sport": "soccer",
        "league": { "id": 100, "name": "프리미어 리그", "country": "잉글랜드" },
        "home": { "name": "맨체스터 시티" },
        "away": { "name": "리버풀" },
        "odds": {
          "1x2": { "home": "1.85", "draw": "3.60", "away": "4.20" },
          "handicap": { "line": "-0.5", "home": "1.90", "away": "1.95" },
          "over_under": { "line": "2.5", "over": "1.85", "under": "2.00" }
        }
      }
    ],
    "pagination": { "page": 1, "total": 1000, "has_next": true },
    "server_time": 1710500000000
  }
}
```

## Links

- **API Docs**: https://matchdata.net/docs
- **Dashboard**: https://matchdata.net
- **Support**: support@matchdata.net

## License

Proprietary - All rights reserved.
