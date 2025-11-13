export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const backendBase = 'https://9525.ip-ddns.com';

    // 代理API请求到后端
    if (url.pathname.startsWith('/api/')) {
      const targetUrl = backendBase + url.pathname + url.search;
      
      const modifiedRequest = new Request(targetUrl, {
        headers: request.headers,
        method: request.method,
        body: request.body,
        redirect: 'follow'
      });

      // 添加CORS头
      const response = await fetch(modifiedRequest);
      const modifiedResponse = new Response(response.body, response);
      modifiedResponse.headers.set('Access-Control-Allow-Origin', '*');
      modifiedResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      modifiedResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      
      return modifiedResponse;
    }

    // 静态资源请求，直接返回
    return env.ASSETS.fetch(request);
  }
};