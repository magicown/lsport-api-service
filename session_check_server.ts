/**
 * 세션 체크 API - 클라이언트에서 주기적으로 호출하여 중복 로그인 감지
 */

import type { RequestHandler } from './$types';
import { validateSession } from '$lib/auth';

export const GET: RequestHandler = async ({ cookies }) => {
  const sessionId = cookies.get('session_id');
  const result = validateSession(sessionId || '');

  if (!result.valid) {
    return new Response(JSON.stringify({
      valid: false,
      kicked: result.kicked || false,
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({
    valid: true,
    user: result.user,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
