/**
 * Cloudflare Worker - CORS 代理
 * 转发请求到抖音 API，添加 CORS 头
 */
export default {
  async fetch(request) {
    const url = new URL(request.url);

    // CORS 预检
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    // 首页
    if (url.pathname === '/') {
      return new Response('🟢 VideoSaver CORS Proxy', {
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // 转发到目标 API
    const targetUrl = 'https://api.douyin.wtf' + url.pathname;

    const response = await fetch(targetUrl, {
      method: request.method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: request.method === 'POST' ? await request.text() : undefined,
    });

    // 添加 CORS 头
    const newHeaders = new Headers(response.headers);
    newHeaders.set('Access-Control-Allow-Origin', '*');

    return new Response(response.body, {
      status: response.status,
      headers: newHeaders,
    });
  },
};
