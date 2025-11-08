// public/_worker.js

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 只代理 /api/ 开头的请求
    if (url.pathname.startsWith('/api/')) {
      const backendUrl = 'https://9525.ip-ddns.com' + url.pathname + url.search;
      
      // 构造一个新的请求到后端
      const backendRequest = new Request(backendUrl, {
        method: request.method,
        headers: request.headers,
        body: request.body,
        redirect: 'follow'
      });

      // 发送请求到后端
      const response = await fetch(backendRequest);

      // 创建一个新的响应头，允许跨域
      const headers = new Headers(response.headers);
      headers.set('Access-Control-Allow-Origin', '*'); // 或者你的前端域名
      headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
      headers.set('Access-control-allow-headers', 'Content-Type, Authorization');

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: headers
      });
    }

    // 对于非 API 请求，让 Cloudflare Pages 正常处理 (返回静态文件)
    return env.ASSETS.fetch(request);
  },
};