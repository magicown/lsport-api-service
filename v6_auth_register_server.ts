/**
 * POST /api/auth/register - 회원가입
 * 승인 대기(pending) 상태로 생성
 */

import type { RequestHandler } from './$types';
import { hashSync } from 'bcryptjs';
import { dbGet, dbRun, auditLog } from '$lib/db';

// 회원가입 시도 제한 (IP 기반, 시간당 20회 - 성공한 가입만 카운트)
const REGISTER_ATTEMPTS = new Map<string, { count: number; firstAttempt: number }>();
const REGISTER_MAX = 20;
const REGISTER_WINDOW = 60 * 60 * 1000; // 1시간

setInterval(() => {
  const now = Date.now();
  for (const [key, record] of REGISTER_ATTEMPTS) {
    if (now - record.firstAttempt > REGISTER_WINDOW) {
      REGISTER_ATTEMPTS.delete(key);
    }
  }
}, 10 * 60 * 1000);

export const POST: RequestHandler = async ({ request }) => {
  try {
    const clientIp = request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
    const regKey = `reg:${clientIp}`;
    const regRecord = REGISTER_ATTEMPTS.get(regKey);
    if (regRecord && Date.now() - regRecord.firstAttempt < REGISTER_WINDOW && regRecord.count >= REGISTER_MAX) {
      return Response.json({
        error: { code: 'TOO_MANY_ATTEMPTS', message: '회원가입 시도 횟수를 초과했습니다. 1시간 후 다시 시도해주세요.' }
      }, { status: 429 });
    }

    const body = await request.json();
    const { username, email, password, company } = body;

    // 입력 검증
    const errors: string[] = [];
    if (!username || !/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      errors.push('username은 3-20자의 영문, 숫자, 언더스코어만 사용 가능합니다.');
    }
    if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push('올바른 이메일 주소를 입력해주세요.');
    }
    if (!password || password.length < 8 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      errors.push('비밀번호는 8자 이상, 대소문자와 숫자를 포함해야 합니다.');
    }
    if (errors.length > 0) {
      return Response.json({
        error: { code: 'VALIDATION_ERROR', message: errors.join(' '), details: errors }
      }, { status: 400 });
    }

    // 중복 체크 (열거 공격 방지: 통일된 메시지)
    const existingUsername = dbGet('SELECT id FROM users WHERE username = ?', username);
    const existingEmail = dbGet('SELECT id FROM users WHERE email = ?', email);
    if (existingUsername || existingEmail) {
      return Response.json({
        error: { code: 'DUPLICATE_ACCOUNT', message: '이미 사용 중인 username 또는 이메일입니다.' }
      }, { status: 409 });
    }

    // 사용자 생성
    const hash = hashSync(password, 12);
    const result = dbRun(
      'INSERT INTO users (username, email, password_hash, company, plan, status, role) VALUES (?, ?, ?, ?, ?, ?, ?)',
      username, email, hash, company || '', 'free', 'pending', 'user'
    );

    const userId = Number(result.lastInsertRowid);

    // 회원가입 성공 시 시도 기록
    if (!regRecord) {
      REGISTER_ATTEMPTS.set(regKey, { count: 1, firstAttempt: Date.now() });
    } else {
      regRecord.count++;
    }

    auditLog(userId, 'register', { username, email, company }, clientIp);

    return Response.json({
      success: true,
      message: '회원가입 완료. 관리자 승인 후 이용 가능합니다.',
      user: { id: userId, username, email, status: 'pending' }
    }, { status: 201 });

  } catch (e: any) {
    console.error('[Register Error]', e);
    return Response.json({
      error: { code: 'SYS_INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' }
    }, { status: 500 });
  }
};
