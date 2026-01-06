export default {
  async fetch(request, env) {
    try {
      const url = new URL(request);

      // 1. 代理 API 请求
      if (url.pathname.startsWith('/api/')) {
        const backendUrl = 'https://wen76674.serv00.net' + url.pathname.replace('/api/', '/') + url.search;
        
        // 构造新请求，确保 GET/HEAD 请求不带 body
        const init = {
          method: request.method,
          headers: request.headers,
          redirect: 'follow'
        };

        if (request.method !== 'GET' && request.method !== 'HEAD') {
          init.body = await request.blob();
        }

        const proxyRequest = new Request(backendUrl, init);
        return await fetch(proxyRequest);
      }

      // 2. 正常处理静态资源
      // env.ASSETS 是 Cloudflare Pages 的内置对象
      const response = await env.ASSETS.fetch(request);
      
      // 如果静态资源 404，且不是文件请求，回退到 index.html (SPA 路由支持)
      if (response.status === 404 && !url.pathname.includes('.')) {
        return await env.ASSETS.fetch(new URL('/index.html', request.url));
      }

      return response;

    } catch (err) {
      // 如果 Worker 崩溃，返回具体的错误信息而不是 1101
      return new Response(`Worker Error: ${err.message}\n${err.stack}`, { 
        status: 500,
        headers: { 'Content-Type': 'text/plain; charset=UTF-8' }
      });
    }
  }
};