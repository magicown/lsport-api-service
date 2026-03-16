/**
 * 3중 인증 미들웨어: API Key → JWT → Cookie
 * 에러 응답 헬퍼
 */

import type { RequestEvent } from '@sveltejs/kit';
import { validateApiKey } from '$lib/api-key';
import { verifyToken } from '$lib/jwt';
import type { JwtPayload } from '$lib/jwt';
import { dbGet, dbRun } from '$lib/db';
import { createLogger } from '$lib/logger';
import type { PlanType, UserRole } from '$lib/plan-limits';

const log = createLogger('middleware');

export interface AuthResult {
  authenticated: boolean;
  method?: 'api_key' | 'jwt' | 'cookie';
  userId?: number;
  keyId?: number | null;
  username?: string;
  email?: string;
  plan?: PlanType;
  role?: UserRole;
  error?: { code: string; message: string; status: number };
}

/**
 * 요청에서 인증 정보 추출 (API Key → JWT → Cookie)
 */
export async function authenticateRequest(event: RequestEvent): Promise<AuthResult> {
  // 1. API Key (헤더 또는 쿼리)
  const apiKey = event.request.headers.get('x-api-key') || event.url.searchParams.get('api_key');
  if (apiKey) {
    const result = validateApiKey(apiKey);
    if (!result) {
      return {
        authenticated: false,
        error: { code: 'API_KEY_INVALID', message: '유효하지 않은 API 키입니다.', status: 401 },
      };
    }
    if (result.status !== 'active') {
      const code = result.status === 'pending' ? 'ACCOUNT_PENDING' : 'ACCOUNT_SUSPENDED';
      const msg = result.status === 'pending'
        ? '계정 승인 대기 중입니다. 관리자 승인 후 이용 가능합니다.'
        : '계정이 정지되었습니다. 관리자에게 문의해주세요.';
      return { authenticated: false, error: { code, message: msg, status: 403 } };
    }
    return {
      authenticated: true,
      method: 'api_key',
      userId: result.userId,
      keyId: result.keyId,
      username: result.username,
      email: result.email,
      plan: result.plan as PlanType,
      role: result.role as UserRole,
    };
  }

  // 2. JWT Bearer Token
  const authHeader = event.request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const payload = await verifyToken(token);
    if (!payload) {
      return {
        authenticated: false,
        error: { code: 'TOKEN_INVALID', message: '유효하지 않거나 만료된 토큰입니다.', status: 401 },
      };
    }

    // DB에서 최신 상태 확인
    const user = dbGet<any>('SELECT status, plan, role FROM users WHERE id = ?', payload.sub);
    if (!user) {
      return {
        authenticated: false,
        error: { code: 'AUTH_UNAUTHORIZED', message: '사용자를 찾을 수 없습니다.', status: 401 },
      };
    }
    if (user.status !== 'active') {
      const code = user.status === 'pending' ? 'ACCOUNT_PENDING' : 'ACCOUNT_SUSPENDED';
      return { authenticated: false, error: { code, message: '계정이 활성 상태가 아닙니다.', status: 403 } };
    }

    return {
      authenticated: true,
      method: 'jwt',
      userId: payload.sub,
      keyId: null,
      username: payload.username,
      email: payload.email,
      plan: user.plan as PlanType,
      role: user.role as UserRole,
    };
  }

  // 3. Cookie Session
  const sessionId = event.cookies.get('session_id');
  if (sessionId) {
    const session = dbGet<any>(`
      SELECT s.id, s.user_id, s.expires_at, s.created_at,
             u.username, u.email, u.plan, u.role, u.status
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = ?
    `, sessionId);

    if (session && session.expires_at > Date.now() && session.status === 'active') {
      // 중복 로그인 체크: 같은 유저의 최신 세션인지 확인
      const latestSession = dbGet<any>(
        'SELECT id FROM sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
        session.user_id
      );
      if (latestSession && latestSession.id !== sessionId) {
        // 이전 세션 → kicked
        event.cookies.delete('session_id', { path: '/' });
        return {
          authenticated: false,
          error: { code: 'AUTH_UNAUTHORIZED', message: '다른 곳에서 로그인되어 세션이 종료되었습니다.', status: 401 },
        };
      }

      // last_access_at 갱신
      dbRun('UPDATE sessions SET last_access_at = ? WHERE id = ?', Date.now(), sessionId);

      return {
        authenticated: true,
        method: 'cookie',
        userId: session.user_id,
        keyId: null,
        username: session.username,
        email: session.email,
        plan: session.plan as PlanType,
        role: session.role as UserRole,
      };
    }
  }

  return {
    authenticated: false,
    error: { code: 'AUTH_UNAUTHORIZED', message: '인증이 필요합니다.', status: 401 },
  };
}

/**
 * 에러 JSON Response 생성
 */
export function createErrorResponse(
  code: string,
  message: string,
  status: number,
  details?: any,
  headers?: Record<string, string>
): Response {
  const body: any = {
    error: { code, message },
  };
  if (details) body.error.details = details;

  const responseHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  return new Response(JSON.stringify(body), { status, headers: responseHeaders });
}

/**
 * 성공 JSON Response 생성
 */
export function createSuccessResponse(data: any, status = 200, headers?: Record<string, string>): Response {
  return new Response(JSON.stringify({ success: true, ...data }), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}
