/**
 * GET /api/relay_service/[...path] - Relay Service 프록시
 * 인증은 hooks.server.ts에서 처리 완료 → Go Relay Proxy(8081)로 전달
 *
 * URL 매핑: /api/relay_service/inplay.php?sport=all → http://127.0.0.1:8081/inplay?sport=all
 */

import type { RequestHandler } from './$types';

const RELAY_PROXY_URL = 'http://127.0.0.1:8081';

export const GET: RequestHandler = async ({ params, url }) => {
  // [..path] 파라미터에서 .php 확장자 제거
  const rawPath = params.path || '';
  const endpoint = rawPath.replace(/\.php$/, '');

  if (!endpoint) {
    return new Response(
      JSON.stringify({ error: { code: 'BAD_REQUEST', message: 'endpoint가 필요합니다.' } }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 쿼리스트링 전달
  const queryString = url.search || '';
  const proxyUrl = `${RELAY_PROXY_URL}/${endpoint}${queryString}`;

  try {
    const response = await fetch(proxyUrl, {
      headers: {
        'Accept': 'application/json',
      },
    });

    const body = await response.text();

    return new Response(body, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: { code: 'RELAY_PROXY_ERROR', message: 'Relay 프록시 연결 실패' } }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
