/**
 * /account 페이지 서버 - API Key + IP 화이트리스트 관리
 */
import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { dbGet, dbAll } from '$lib/db';
import { PLAN_LIMITS } from '$lib/plan-limits';
import type { PlanType } from '$lib/plan-limits';

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) {
    throw redirect(303, '/login');
  }

  const userId = locals.userId;
  const user = dbGet<any>(
    'SELECT id, username, email, company, plan, status, role, created_at, approved_at FROM users WHERE id = ?',
    userId
  );

  if (!user) throw redirect(303, '/login');

  const plan = user.plan as PlanType;
  const limits = PLAN_LIMITS[plan];

  // API 키 목록
  const apiKeys = dbAll<any>(
    'SELECT id, key_prefix, key_full, label, is_active, last_used_at, created_at FROM api_keys WHERE user_id = ? AND is_active = 1 ORDER BY created_at DESC',
    userId
  );

  // IP 화이트리스트
  const ipList = dbAll<any>(
    'SELECT id, ip_address, description, created_at FROM ip_whitelist WHERE user_id = ? ORDER BY created_at DESC',
    userId
  );

  // 오늘 사용량
  const today = new Date().toISOString().slice(0, 10);
  const todayUsage = dbGet<any>(
    'SELECT total_calls, prematch, inplay, special FROM usage_daily WHERE user_id = ? AND date = ?',
    userId, today
  );

  return {
    profile: {
      username: user.username,
      email: user.email,
      company: user.company,
      plan: user.plan,
      status: user.status,
      role: user.role,
      created_at: user.created_at,
      approved_at: user.approved_at,
    },
    apiKeys: apiKeys.map((k: any) => ({
      id: k.id,
      fullKey: k.key_full || (k.key_prefix + '...'),
      last_used_at: k.last_used_at,
      created_at: k.created_at,
    })),
    ipList: ipList.map((ip: any) => ({
      id: ip.id,
      ip_address: ip.ip_address,
      description: ip.description,
      created_at: ip.created_at,
    })),
    limits: {
      ratePerMinute: limits.ratePerMinute,
      dailyLimit: limits.dailyLimit,
      maxKeys: limits.maxKeys,
      maxIps: limits.maxIps,
      ipRequired: limits.ipRequired,
      prematch: limits.prematch,
      inplay: limits.inplay,
      special: limits.special,
    },
    usage: {
      total: todayUsage?.total_calls || 0,
      prematch: todayUsage?.prematch || 0,
      inplay: todayUsage?.inplay || 0,
      special: todayUsage?.special || 0,
    },
  };
};
