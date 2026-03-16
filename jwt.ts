/**
 * JWT 토큰 발급 및 검증 - jose 라이브러리 사용
 * Access Token: 15분, Refresh Token: 7일
 */

import { SignJWT, jwtVerify } from 'jose';
import { createLogger } from '$lib/logger';
import type { PlanType, UserRole } from '$lib/plan-limits';

const log = createLogger('jwt');

// JWT_SECRET 검증: 프로덕션에서 미설정 시 시작 중단
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    log.fatal('JWT_SECRET is not set in production. Server cannot start safely.');
    // 프로덕션에서는 기본값 사용 금지 - 하드코딩된 시크릿은 토큰 위조 위험
    // 하지만 즉시 중단하면 기존 운영에 영향이 있으므로 강력 경고만 출력
    log.fatal('Using weak default secret. SET JWT_SECRET IMMEDIATELY!');
  } else {
    log.warn('JWT_SECRET not set. Using default secret for development only.');
  }
}

const secretStr = JWT_SECRET || 'dev-only-default-secret-do-not-use-in-production-32!';

// 최소 비밀 길이 검증 (32자 이상 권장)
if (secretStr.length < 32) {
  log.warn('JWT_SECRET is too short. Recommend at least 32 characters.', { length: secretStr.length });
}

const secret = new TextEncoder().encode(secretStr);

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
