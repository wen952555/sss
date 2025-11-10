export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    console.log(`Incoming request: ${pathname}`);

    // 只代理 /api/ 开头的请求
    if (pathname.startsWith('/api/')) {
      // 提取 action 名称（移除 /api/ 前缀）
      const action = pathname.replace('/api/', '');
      
      // 构建后端URL - 使用查询参数方式
      const backendUrl = `https://9525.ip-ddns.com/api.php?action=${action}`;

      console.log(`Proxying to backend: ${backendUrl}`);

      try {
        // 构造新的请求到后端
        const backendRequest = new Request(backendUrl, {
          method: request.method,
          headers: {
            'Content-Type': 'application/json',
            ...Object.fromEntries(request.headers)
          },
          body: request.body,
          redirect: 'follow'
        });

        // 发送请求到后端
        const response = await fetch(backendRequest);

        console.log(`Backend response status: ${response.status}`);

        // 创建新的响应头，允许跨域
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