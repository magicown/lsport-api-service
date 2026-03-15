/**
 * 요금제별 제한 상수 정의
 * 모든 모듈에서 참조하는 단일 소스
 */

export type PlanType = 'free' | 'standard' | 'premium' | 'enterprise';
export type UserStatus = 'pending' | 'active' | 'suspended' | 'rejected';
export type UserRole = 'user' | 'admin';

export interface PlanLimit {
  ratePerMinute: number;
  dailyLimit: number;
  maxKeys: number;
  maxIps: number;
  ipRequired: boolean;      // 유료 플랜은 IP 화이트리스트 필수
  cidrSupport: boolean;
  allowedSports: string[] | 'all';
  prematch: boolean;
  inplay: boolean;
  special: boolean;
  matchDetail: boolean;
  monthlyPrice: number;     // USD
}

export const PLAN_LIMITS: Record<PlanType, PlanLimit> = {
  free: {
    ratePerMinute: 10,
    dailyLimit: 1000,
    maxKeys: 1,
    maxIps: 3,
    ipRequired: false,
    cidrSupport: false,
    allowedSports: ['soccer', 'basketball', 'baseball'],
    prematch: true,
    inplay: false,
    special: false,
    matchDetail: false,
    monthlyPrice: 0,
  },
  standard: {
    ratePerMinute: 30,
    dailyLimit: 10000,
    maxKeys: 3,
    maxIps: 5,
    ipRequired: true,
    cidrSupport: false,
    allowedSports: 'all',
    prematch: true,
    inplay: true,
    special: true,
    matchDetail: false,
    monthlyPrice: 49,
  },
  premium: {
    ratePerMinute: 60,
    dailyLimit: 50000,
    maxKeys: 5,
    maxIps: 10,
    ipRequired: true,
    cidrSupport: true,
    allowedSports: 'all',
    prematch: true,
    inplay: true,
    special: true,
    matchDetail: true,
    monthlyPrice: 149,
  },
  enterprise: {
    ratePerMinute: 120,
    dailyLimit: 200000,
    maxKeys: 10,
    maxIps: 9999,  // 사실상 무제한
    ipRequired: true,
    cidrSupport: true,
    allowedSports: 'all',
    prematch: true,
    inplay: true,
    special: true,
    matchDetail: true,
    monthlyPrice: 499,
  },
};

// 모든 지원 종목
export const ALL_SPORTS = [
  'soccer', 'basketball', 'baseball', 'volleyball', 'icehockey',
  'americanfootball', 'tennis', 'handball', 'tabletennis', 'esports', 'boxingufc'
] as const;

/**
 * 플랜이 특정 엔드포인트에 접근 가능한지 체크
 */
export function checkPlanAccess(
  plan: PlanType,
  endpoint: string,
  sport?: string
): { allowed: boolean; code: string; message: string } {
  const limits = PLAN_LIMITS[plan];

  // 종목 접근 체크
  if (sport && limits.allowedSports !== 'all') {
    if (!limits.allowedSports.includes(sport)) {
      return {
        allowed: false,
        code: 'PLAN_ACCESS_DENIED',
        message: `${plan} 플랜에서는 ${sport} 종목에 접근할 수 없습니다. Standard 이상 플랜으로 업그레이드해주세요.`,
      };
    }
  }

  // 엔드포인트 유형별 접근 체크
  if (endpoint.includes('/inplay/') && !limits.inplay) {
    return {
      allowed: false,
      code: 'PLAN_ACCESS_DENIED',
      message: '인플레이 데이터는 Standard 이상 플랜에서 이용 가능합니다.',
    };
  }
  if (endpoint.includes('/special/') && !limits.special) {
    return {
      allowed: false,
      code: 'PLAN_ACCESS_DENIED',
      message: '스페셜 마켓 데이터는 Standard 이상 플랜에서 이용 가능합니다.',
    };
  }
  if (endpoint.includes('/match/') && !limits.matchDetail) {
    return {
      allowed: false,
      code: 'PLAN_ACCESS_DENIED',
      message: '경기 상세 데이터는 Premium 이상 플랜에서 이용 가능합니다.',
    };
  }

  return { allowed: true, code: '', message: '' };
}

/**
 * 일일 사용량 120% 초과 여부
 */
export function isDailyLimitExceeded(plan: PlanType, dailyCount: number): boolean {
  const limit = PLAN_LIMITS[plan].dailyLimit;
  return dailyCount >= Math.floor(limit * 1.2);
}
