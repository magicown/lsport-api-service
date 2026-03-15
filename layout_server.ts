/**
 * 루트 레이아웃 서버 - 사용자 정보를 모든 페이지에 전달
 */

import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
  return {
    user: locals.user || null,
    role: locals.role || null,
  };
};
