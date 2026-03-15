/**
 * 로그인 페이지 서버 - Form Action 처리
 */

import type { Actions, PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { login, validateSession } from '$lib/auth';

// 이미 로그인된 상태면 메인으로 리다이렉트
export const load: PageServerLoad = async ({ cookies }) => {
  const sessionId = cookies.get('session_id');
  if (sessionId) {
    const result = validateSession(sessionId);
    if (result.valid) {
      throw redirect(303, '/');
    }
  }
  return {};
};

export const actions: Actions = {
  default: async ({ request, cookies }) => {
    const data = await request.formData();
    const email = data.get('email')?.toString().trim() || '';
    const password = data.get('password')?.toString() || '';

    if (!email || !password) {
      return { error: '이메일과 비밀번호를 입력해주세요.', email };
    }

    const ip = request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || '';

    const result = login(email, password, ip, userAgent);

    if (!result.success) {
      return { error: result.error, email };
    }

    // 세션 쿠키 설정 (24시간 유효)
    cookies.set('session_id', result.sessionId!, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: false, // HTTP 환경에서도 동작하도록
      maxAge: 60 * 60 * 24, // 24시간
    });

    throw redirect(303, '/');
  },
};
