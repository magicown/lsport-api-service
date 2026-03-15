/**
 * JWT 토큰 발급 및 검증 - jose 라이브러리 사용
 * Access Token: 15분, Refresh Token: 7일
 */

import { SignJWT, jwtVerify } from 'jose';
import type { PlanType, UserRole } from '$lib/plan-limits';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-default-secret-do-not-use-in-production-32!';
if (!process.env.JWT_SECRET) {
  console.warn('[JWT] ⚠️ JWT_SECRET 미설정. 운영 환경에서는 반드시 환경변수를 설정해주세요.');
}
const secret = new TextEncoder().encode(JWT_SECRET);

let _jwtSecretChecked = false;
function ensureJwtSecret() {
  if (_jwtSecretChecked) return;
  _jwtSecretChecked = true;
  if (!process.env.JWT_SECRET) {
    console.error('[JWT] ⚠️ WARNING: JWT_SECRET 환경변수가 설정되지 않았습니다. 기본값 사용 중 - 토큰 위조 위험!');
  }
}

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

export const ACCESS_TOKEN_MAX_AGE = 15 * 60;         // 15분 (초)
export const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60; // 7일 (초)

export interface JwtPayload {
  sub: number;        // user id
  username: string;
  email: string;
  plan: PlanType;
  role: UserRole;
}

/**
 * Access Token 발급
 */
export async function signAccessToken(payload: JwtPayload): Promise<string> {
  ensureJwtSecret();
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .setIssuer('matchdata')
    .sign(secret);
}

/**
 * Refresh Token 발급
 */
export async function signRefreshToken(userId: number): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .setIssuer('matchdata')
    .sign(secret);
}

/**
 * JWT 검증 - 성공 시 payload 반환, 실패 시 null
 */
export async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret, { issuer: 'matchdata' });
    return payload as unknown as JwtPayload;
  } catch {
    return null;
  }
}
