/**
 * 회원가입 페이지 서버 - Form Action 처리
 * POST /register → /api/auth/register 호출
 */

import type { Actions, PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { validateSession } from '$lib/auth';

// 이미 로그인 상태면 메인으로
export const load: PageServerLoad = async ({ cookies }) => {
  const sessionId = cookies.get('session_id');
  if (sessionId) {
    const result = validateSession(sessionId);
    if (result.valid) throw redirect(303, '/');
  }
  return {};
};

export const actions: Actions = {
  default: async ({ request, fetch }) => {
    const data = await request.formData();
    const username = data.get('username')?.toString().trim() || '';
    const email = data.get('email')?.toString().trim() || '';
    const password = data.get('password')?.toString() || '';
    const company = data.get('company')?.toString().trim() || '';
    const agree = data.get('agree');

    // 기본 검증
    if (!username || !email || !password) {
      return { error: 'Username, 이메일, 비밀번호는 필수입니다.', username, email, company };
    }
    if (!agree) {
      return { error: '이용약관에 동의해주세요.', username, email, company };
    }

    // API 호출
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password, company }),
    });

    const body = await res.json();

    if (!res.ok) {
      const msg = body?.error?.message || '회원가입에 실패했습니다.';
      return { error: msg, username, email, company };
    }

    return { success: true, username, email, company };
  },
};
