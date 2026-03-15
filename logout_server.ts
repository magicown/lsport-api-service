/**
 * 로그아웃 API 엔드포인트
 */

import type { RequestHandler } from './$types';
import { redirect } from '@sveltejs/kit';
import { logout } from '$lib/auth';

export const POST: RequestHandler = async ({ cookies }) => {
  const sessionId = cookies.get('session_id');
  if (sessionId) {
    logout(sessionId);
    cookies.delete('session_id', { path: '/' });
  }
  throw redirect(303, '/login');
};
