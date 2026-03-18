/**
 * SvelteKit Server Hooks - 3중 인증 + 레이트 리미팅 + 사용량 추적
 * API: API Key → JWT → Cookie
 * 웹 페이지: Cookie 세션 검증
 */

import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { validateSession, trackUsage } from '$lib/auth';
import { authenticateRequest, createErrorResponse } from '$lib/middleware';
import { checkPlanAccess } from '$lib/plan-limits';
import { checkRateLimit, getRateLimitHeaders } from '$lib/rate-limiter';
import { checkIpWhitelist } from '$lib/ip-whitelist';
import { trackRequest } from '$lib/usage-tracker';
import { getCacheInfo } from '$lib/api-cache';
import type { PlanType } from '$lib/plan-limits';

// 데이터 엔드포인트에서 종목 추출 정규식
const SPORT_REGEX = /\/api\/(?:prematch|inplay|special|match|leagues)\/([^/]+)/;

// 인증 없이 접근 가능한 경로
const PUBLIC_PATHS = [
  '/login',
  '/register',
  '/docs',
  '/api/health',
  '/api/auth/register',
  '/api/auth/login',
  '/api/auth/refresh',
];

export const handle: Handle = async ({ event, resolve }) => {
  const path = event.url.pathname;

  // 정적 파일 통과
  if (path.startsWith('/_app/') || path.startsWith('/favicon')) {
    return resolve(event);
  }

  // 공개 경로 통과 (정확한 경로 매칭만)
  if (PUBLIC_PATHS.includes(path)) {
    // API 공개 경로에는 CORS 헤더 추가
    if (path.startsWith('/api/')) {
      const response = await resolve(event);
      return addCorsHeaders(response, event);
    }
    return resolve(event);
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

  // ── 기존 웹 페이지 요청 처리 ──
  return handleWebRequest(event, resolve);
};

/**
 * API 요청 핸들러
 */
async function handleApiRequest(
  event: any,
  resolve: (event: any) => Promise<Response>
): Promise<Response> {
  const path = event.url.pathname;
  const clientIp = event.request.headers.get('x-real-ip') || event.request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';

  // 1. 인증
  const auth = await authenticateRequest(event);
  if (!auth.authenticated) {
    return addStandardHeaders(createErrorResponse(
      auth.error!.code,
      auth.error!.message,
      auth.error!.status
    ), event);
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

  // 웹 UI 내부 fetch (쿠키 세션)는 플랜 제한/레이트 리밋 면제
  const isWebInternal = auth.method === 'cookie';

  // 2. IP 화이트리스트 체크 (API Key 인증일 때만)
  if (auth.method === 'api_key') {
    const ipError = checkIpWhitelist(auth.userId!, auth.plan!, auth.role!, clientIp);
    if (ipError) {
      return addStandardHeaders(createErrorResponse('PLAN_ACCESS_DENIED', ipError, 403), event);
    }
  }

  // 3. 데이터 엔드포인트 판별 및 종목 추출 (1회만)
  const isData = isDataEndpoint(path);
  const sportMatch = isData ? path.match(SPORT_REGEX) : null;
  const sport = sportMatch?.[1] || '';

  // 4. 플랜 접근 체크 (외부 API만 - 웹 UI 내부 fetch 면제)
  if (isData && !isWebInternal) {
    const access = checkPlanAccess(auth.plan!, path, sport || undefined);
    if (!access.allowed) {
      return addStandardHeaders(createErrorResponse(access.code, access.message, 403), event);
    }
  }

  // 5. 레이트 리밋 체크 (외부 API만 - 웹 UI 내부 fetch 면제)
  let rateResult: any = { allowed: true };
  if (!isWebInternal) {
    const identifier = auth.keyId ? `key:${auth.keyId}` : `user:${auth.userId}`;
    rateResult = checkRateLimit(identifier, auth.plan!, auth.userId!);
    if (!rateResult.allowed) {
      const headers = getRateLimitHeaders(rateResult);
      return addStandardHeaders(createErrorResponse(
        rateResult.code!,
        rateResult.message!,
        429,
        { limit: rateResult.limit, remaining: rateResult.remaining, retryAfter: rateResult.retryAfter },
        headers
      ), event);
    }
  }

  // 6. 요청 처리
  const response = await resolve(event);

  // 7. 성공 시 사용량 추적 (외부 API만)
  if (!isWebInternal && response.status >= 200 && response.status < 400 && isData) {
    trackRequest(auth.userId!, auth.keyId || null, path, sport);
  }

  // 8. 레이트 리밋 + CORS 헤더 추가
  const rateLimitHeaders = isWebInternal ? {} : getRateLimitHeaders(rateResult);
  const newResponse = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: new Headers(response.headers),
  });

  for (const [k, v] of Object.entries(rateLimitHeaders)) {
    newResponse.headers.set(k, v);
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
  for (const [k, v] of Object.entries(corsHeaders)) {
    newResponse.headers.set(k, v);
  }
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
    newResponse.headers.set(k, v);
  }

  return newResponse;
}

/**
 * 기존 웹 페이지 요청 핸들러 (하위 호환)
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

  return resolve(event);
}

function isDataEndpoint(path: string): boolean {
  return /\/api\/(sports|prematch|inplay|special|match|leagues|relay_service)(\/|$)/.test(path);
}

// 허용된 Origin 목록
const ALLOWED_ORIGINS = [
  'https://matchdata.net',
  'https://www.matchdata.net',
  ...(process.env.NODE_ENV === 'production' ? [] : ['http://localhost:5173', 'http://localhost:4173']),
];

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

/** 보안 헤더 */
const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '0',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

function addStandardHeaders(response: Response, event: any): Response {
  const newResponse = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: new Headers(response.headers),
  });
  // 보안 헤더
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
    newResponse.headers.set(k, v);
  }
  // CORS 헤더
  const cors = getCorsHeaders(event);
  for (const [k, v] of Object.entries(cors)) {
    newResponse.headers.set(k, v);
  }
  return newResponse;
}

function addCorsHeaders(response: Response, event: any): Response {
  return addStandardHeaders(response, event);
}
