/**
 * SvelteKit Server Hooks - 3중 인증 + CSRF 보호 + 보안 헤더 + 레이트 리미팅 + 사용량 추적
 * API: API Key -> JWT -> Cookie
 */

import type { Handle, HandleServerError } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { validateSession, trackUsage } from '$lib/auth';
import { authenticateRequest, createErrorResponse } from '$lib/middleware';
import { checkPlanAccess } from '$lib/plan-limits';
import { checkRateLimit, getRateLimitHeaders } from '$lib/rate-limiter';
import { checkIpWhitelist } from '$lib/ip-whitelist';
import { trackRequest } from '$lib/usage-tracker';
import { getCacheInfo } from '$lib/api-cache';
import { createLogger } from '$lib/logger';
import type { PlanType } from '$lib/plan-limits';

const log = createLogger('hooks');

// 데이터 엔드포인트에서 종목 추출 정규식
const SPORT_REGEX = /\/api\/(?:prematch|inplay|special|match|leagues)\/([^/]+)/;

// 인증 없이 접근 가능한 경로
const PUBLIC_PATHS = [
  '/login',
  '/register',
  '/api/health',
  '/api/auth/register',
  '/api/auth/login',
  '/api/auth/refresh',
];

// 상태 변경 HTTP 메서드 (CSRF 체크 대상)
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// 허용된 Origin 목록
const ALLOWED_ORIGINS = [
  'https://matchdata.net',
  'https://www.matchdata.net',
  ...(process.env.NODE_ENV === 'production' ? [] : ['http://localhost:5173', 'http://localhost:4173']),
];

// ─── 보안 헤더 (Helmet.js 대체) ───
const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '0',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

// ─── CSRF 보호 ───
function checkCsrf(event: any): boolean {
  const method = event.request.method;
  if (!MUTATING_METHODS.has(method)) return true;

  // API Key / JWT 인증은 CSRF 면제 (쿠키 기반이 아님)
  const hasApiKey = event.request.headers.get('x-api-key') || event.url.searchParams.get('api_key');
  const hasBearer = event.request.headers.get('authorization')?.startsWith('Bearer ');
  if (hasApiKey || hasBearer) return true;

  // 쿠키 세션 사용 시 Origin 헤더 검증
  const origin = event.request.headers.get('origin');
  if (!origin) {
    // Origin 헤더 없음 (동일 출처 요청이 아닌 경우 차단)
    // 단, fetch API에서 same-origin 요청은 Origin을 보내지 않을 수 있음
    // Referer로 폴백 체크
    const referer = event.request.headers.get('referer');
    if (referer) {
      try {
        const refUrl = new URL(referer);
        const reqUrl = event.url;
        return refUrl.origin === reqUrl.origin || ALLOWED_ORIGINS.includes(refUrl.origin);
      } catch {
        return false;
      }
    }
    // SvelteKit 내부 요청은 통과 (SSR에서의 서버 사이드 fetch)
    return true;
  }

  // Origin이 허용 목록 또는 자기 자신
  return ALLOWED_ORIGINS.includes(origin) || origin === event.url.origin;
}

// ─── 글로벌 에러 핸들러 ───
export const handleError: HandleServerError = ({ error, event, status, message }) => {
  const errorId = crypto.randomUUID().slice(0, 8);
  const path = event?.url?.pathname || 'unknown';

  log.error('Unhandled error', {
    errorId,
    path,
    status,
    message,
    stack: (error as Error)?.stack?.split('\n').slice(0, 3).join(' | '),
  });

  return {
    message: `서버 오류가 발생했습니다. (ID: ${errorId})`,
    errorId,
  };
};

export const handle: Handle = async ({ event, resolve }) => {
  const path = event.url.pathname;

  // 정적 파일 통과
  if (path.startsWith('/_app/') || path.startsWith('/favicon')) {
    return resolve(event);
  }

  // CSRF 체크 (모든 상태 변경 요청)
  if (!checkCsrf(event)) {
    log.warn('CSRF check failed', {
      path,
      method: event.request.method,
      origin: event.request.headers.get('origin') || 'none',
      ip: getClientIp(event),
    });
    return createErrorResponse('CSRF_REJECTED', '잘못된 요청 출처입니다.', 403);
  }

  // 공개 경로 통과 (정확한 경로 매칭만)
  if (PUBLIC_PATHS.includes(path)) {
    if (path.startsWith('/api/')) {
      const response = await resolve(event);
      return addHeaders(response, event);
    }
    return addSecurityHeaders(await resolve(event));
  }

  // CORS Preflight
  if (event.request.method === 'OPTIONS' && path.startsWith('/api/')) {
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(event),
    });
  }

  // ── API 요청 처리 ──
  if (path.startsWith('/api/')) {
    return handleApiRequest(event, resolve);
  }

  // ── 웹 페이지 요청 처리 ──
  return handleWebRequest(event, resolve);
};

/**
 * 클라이언트 IP 안전 추출 (역방향 프록시 고려)
 */
function getClientIp(event: any): string {
  // Cloudflare
  const cfIp = event.request.headers.get('cf-connecting-ip');
  if (cfIp) return cfIp;

  // nginx/로드밸런서
  const realIp = event.request.headers.get('x-real-ip');
  if (realIp) return realIp;

  // x-forwarded-for (첫 번째 IP만 = 원본 클라이언트)
  const forwarded = event.request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();

  try {
    return event.getClientAddress();
  } catch {
    return '0.0.0.0';
  }
}

/**
 * API 요청 핸들러
 */
async function handleApiRequest(
  event: any,
  resolve: (event: any) => Promise<Response>
): Promise<Response> {
  const path = event.url.pathname;
  const clientIp = getClientIp(event);

  // 1. 인증
  const auth = await authenticateRequest(event);
  if (!auth.authenticated) {
    return createErrorResponse(
      auth.error!.code,
      auth.error!.message,
      auth.error!.status
    );
  }

  // event.locals에 인증 정보 저장
  event.locals.user = {
    id: auth.username!,
    email: auth.email!,
    company: '',
    plan: auth.plan!,
  };
  event.locals.sessionId = '';
  event.locals.authMethod = auth.method!;
  event.locals.userId = auth.userId!;
  event.locals.keyId = auth.keyId || null;
  event.locals.role = auth.role!;

  // 2. IP 화이트리스트 체크 (API Key 인증일 때만)
  if (auth.method === 'api_key') {
    const ipError = checkIpWhitelist(auth.userId!, auth.plan!, auth.role!, clientIp);
    if (ipError) {
      return createErrorResponse('PLAN_ACCESS_DENIED', ipError, 403);
    }
  }

  // 3. 데이터 엔드포인트 판별 및 종목 추출
  const isData = isDataEndpoint(path);
  const sportMatch = isData ? path.match(SPORT_REGEX) : null;
  const sport = sportMatch?.[1] || '';

  // 4. 플랜 접근 체크 (데이터 API만)
  if (isData) {
    const access = checkPlanAccess(auth.plan!, path, sport || undefined);
    if (!access.allowed) {
      return createErrorResponse(access.code, access.message, 403);
    }
  }

  // 5. 레이트 리밋 체크
  // 웹 내부 요청 (Cookie 세션)은 레이트 리밋 면제
  const isWebInternal = auth.method === 'cookie';
  let rateResult: any = { allowed: true, limit: 0, remaining: 0, resetAt: 0 };

  if (!isWebInternal) {
    const identifier = auth.keyId ? `key:${auth.keyId}` : `user:${auth.userId}`;
    rateResult = checkRateLimit(identifier, auth.plan!, auth.userId!);
    if (!rateResult.allowed) {
      const headers = getRateLimitHeaders(rateResult);
      log.warn('Rate limit exceeded', { userId: auth.userId, plan: auth.plan, path });
      return createErrorResponse(
        rateResult.code!,
        rateResult.message!,
        429,
        { limit: rateResult.limit, remaining: rateResult.remaining, retryAfter: rateResult.retryAfter },
        headers
      );
    }
  }

  // 6. 요청 처리
  const response = await resolve(event);

  // 7. 성공 시 사용량 추적 (외부 API만)
  if (!isWebInternal && response.status >= 200 && response.status < 400 && isData) {
    trackRequest(auth.userId!, auth.keyId || null, path, sport);
  }

  // 8. 헤더 추가
  const newResponse = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: new Headers(response.headers),
  });

  // 레이트 리밋 헤더 (외부 API만)
  if (!isWebInternal) {
    const rateLimitHeaders = getRateLimitHeaders(rateResult);
    for (const [k, v2] of Object.entries(rateLimitHeaders)) {
      newResponse.headers.set(k, v2);
    }
  }

  // 캐시 나이 헤더
  if (isData) {
    const cacheSport = sport || 'soccer';
    const type = path.includes('/inplay/') ? 'inplay' : 'prematch';
    const cacheInfo = getCacheInfo(cacheSport, type);
    if (cacheInfo.age >= 0) {
      newResponse.headers.set('X-Cache-Age', String(Math.round(cacheInfo.age / 1000)));
    }
  }

  // CORS + 보안 헤더
  const corsHeaders = getCorsHeaders(event);
  for (const [k, v2] of Object.entries(corsHeaders)) {
    newResponse.headers.set(k, v2);
  }
  for (const [k, v2] of Object.entries(SECURITY_HEADERS)) {
    newResponse.headers.set(k, v2);
  }

  return newResponse;
}

/**
 * 웹 페이지 요청 핸들러
 */
async function handleWebRequest(
  event: any,
  resolve: (event: any) => Promise<Response>
): Promise<Response> {
  const path = event.url.pathname;
  const sessionId = event.cookies.get('session_id');
  const result = validateSession(sessionId || '');

  if (!result.valid) {
    if (result.kicked) {
      event.cookies.delete('session_id', { path: '/' });
      throw redirect(303, '/login?kicked=1');
    }
    if (path.startsWith('/api/')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    throw redirect(303, '/login');
  }

  // locals 설정
  event.locals.user = result.user!;
  event.locals.sessionId = sessionId!;
  event.locals.userId = result.userId;
  event.locals.role = (result as any).role || 'user';

  // 웹 사용량 추적
  if (!path.startsWith('/api/') && result.user) {
    const sportMatch = path.match(/\/(prematch|inplay|special)\/([^/]+)/);
    if (sportMatch) {
      const type = sportMatch[1] as 'prematch' | 'inplay' | 'special';
      const sport = sportMatch[2];
      trackUsage(result.user.id, type, sport);
    }
  }

  return addSecurityHeaders(await resolve(event));
}

function isDataEndpoint(path: string): boolean {
  return /\/api\/(sports|prematch|inplay|special|match|leagues)(\/|$)/.test(path);
}

function getCorsHeaders(event: any): Record<string, string> {
  const requestOrigin = event.request.headers.get('origin');
  const allowedOrigin = requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin)
    ? requestOrigin
    : ALLOWED_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
    'Access-Control-Max-Age': '86400',
  };
}

function addHeaders(response: Response, event: any): Response {
  const newResponse = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: new Headers(response.headers),
  });
  const cors = getCorsHeaders(event);
  for (const [k, v2] of Object.entries(cors)) newResponse.headers.set(k, v2);
  for (const [k, v2] of Object.entries(SECURITY_HEADERS)) newResponse.headers.set(k, v2);
  return newResponse;
}

function addSecurityHeaders(response: Response): Response {
  const newResponse = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: new Headers(response.headers),
  });
  for (const [k, v2] of Object.entries(SECURITY_HEADERS)) newResponse.headers.set(k, v2);
  return newResponse;
}
