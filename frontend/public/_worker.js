export default {
  async fetch(request, env) {
    const url = new URL(request);

    // 1. 处理 API 请求转发
    if (url.pathname.startsWith('/api/')) {
      // 构造 Serv00 的真实后端地址
      // 移除 /api/ 前缀，直接拼接到后端域名
      const backendPath = url.pathname.replace(/^\/api/, '');
      const backendUrl = `https://wen76674.serv00.net${backendPath}${url.search}`;

      // 复制原始请求的 Headers，但修改 Host
      const newHeaders = new Headers(request.headers);
      newHeaders.set('Host', 'wen76674.serv00.net');

      try {
        const backendRequest = new Request(backendUrl, {
          method: request.method,
          headers: newHeaders,
          body: request.method !== 'GET' && request.method !== 'HEAD' ? await request.blob() : null,
          redirect: 'follow'
        });

        return await fetch(backendRequest);
      } catch (err) {
        return new Response(JSON.stringify({ msg: 'Proxy Error', error: err.message }), {
          status: 502,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // 2. 静态资源回退
    // 如果不是 API 请求，尝试从 Pages 静态资源库中读取
    try {
      const response = await env.ASSETS.fetch(request);
      
      // 如果静态资源不存在 (404)，对于 SPA (React) 应用，应该返回 index.html
      if (response.status === 404 && !url.pathname.includes('.')) {
        return await env.ASSETS.fetch(new URL('/index.html', request.url));
      }
      
      return response;
    } catch (e) {
      return new Response("Internal Server Error: " + e.message, { status: 500 });
    }
  }
};