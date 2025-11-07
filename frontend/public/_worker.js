export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);

      // 特殊处理 /favicon.ico 请求，直接返回 204 No Content
      if (url.pathname === '/favicon.ico') {
        return new Response(null, { status: 204 });
      }

      // 只代理对 /api/ 的请求
      if (url.pathname.startsWith('/api/')) {
        // 后端域名
        const backendUrl = 'https://9525.ip-ddns.com'; 
        
        const newUrl = new URL(backendUrl + url.pathname + url.search);

        // 构造一个新的请求，发往后端
        const newRequest = new Request(newUrl, {
          method: request.method,
          headers: request.headers,
          body: request.body,
          redirect: 'follow',
        });
        
        // 添加一些自定义头信息，可选
        newRequest.headers.set('X-Forwarded-For', request.headers.get('CF-Connecting-IP'));

        try {
          const response = await fetch(newRequest);
          
          // 需要创建一个新的Response来修改CORS头
          const newHeaders = new Headers(response.headers);
          newHeaders.set('Access-Control-Allow-Origin', url.origin);
          newHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
          newHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

          return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: newHeaders,
          });

        } catch (e) {
          console.error('Inner catch (API proxy) error:', e);
          return new Response(`Backend server error: ${e.message}`, { status: 502 });
        }
      }

      // 对于非 /api/ 请求，让Cloudflare Pages正常处理静态文件
      return env.fetch(request);

    } catch (e) {
      // 这是一个全局的catch块，用于捕获任何未被捕获的异常
      console.error('Global catch (Worker top-level) error:', e);
      return new Response(`A critical error occurred in the Worker: ${e.message}`, { status: 500 });
    }
  },
};