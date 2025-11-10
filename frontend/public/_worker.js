export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 只代理 /api/ 开头的请求
    if (url.pathname.startsWith('/api/')) {
      // 移除 /api 前缀，直接转发到后端
      const backendPath = url.pathname.replace(/^\/api/, '');
      const backendUrl = 'https://9525.ip-ddns.com' + backendPath + url.search;

      console.log(`Proxying request to: ${backendUrl}`);

      try {
        // 构造一个新的请求到后端
        const backendRequest = new Request(backendUrl, {
          method: request.method,
          headers: request.headers,
          body: request.body,
          redirect: 'follow'
        });

        // 发送请求到后端，设置超时
        const response = await Promise.race([
          fetch(backendRequest),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), 10000)
          )
        ]);

        // 创建一个新的响应头，允许跨域
        const headers = new Headers(response.headers);
        headers.set('Access-Control-Allow-Origin', '*');
        headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
        headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: headers
        });
      } catch (error) {
        console.error('Proxy error:', error);
        return new Response(JSON.stringify({
          success: false,
          message: '无法连接到服务器，请稍后重试'
        }), {
          status: 503,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
    }

    // 对于非 API 请求，让 Cloudflare Pages 正常处理 (返回静态文件)
    return env.ASSETS.fetch(request);
  },
};