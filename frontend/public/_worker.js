export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');

    // --- 1. API 代理逻辑 ---
    if (url.pathname.startsWith('/api/')) {
      const backendUrl = 'https://wen76674.serv00.net' + url.pathname.replace('/api', '') + url.search;

      // --- 处理预检 (OPTIONS) 请求 ---
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': origin || '*',
            'Access-Control-Allow-Credentials': 'true',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
            'Access-Control-Max-Age': '86400', // 将预检请求缓存 1 天
          },
        });
      }

      // --- 将实际请求转发到后端 ---
      
      // 从原始请求复制 headers
      const requestHeaders = new Headers(request.headers);
      // 设置 Host header 以匹配后端域
      requestHeaders.set('Host', 'wen76674.serv00.net');

      try {
        const backendResponse = await fetch(backendUrl, {
          method: request.method,
          headers: requestHeaders,
          body: request.body,
          redirect: 'follow',
        });

        // 创建一个新的、可变的响应
        const response = new Response(backendResponse.body, backendResponse);

        // --- 为返回给客户端的最终响应设置 CORS headers ---
        response.headers.set('Access-Control-Allow-Origin', origin || '*');
        response.headers.set('Access-Control-Allow-Credentials', 'true');
        // 允许客户端读取所有 headers，方便调试
        response.headers.set('Access-Control-Expose-Headers', '*');

        return response;

      } catch (error) {
        // 如果 fetch() 失败 (例如 DNS 错误、连接被拒)，则为代理错误。
        // `ERR_CONNECTION_CLOSED` 这类错误很可能在这里被 worker 捕获。
        return new Response(JSON.stringify({
          success: false,
          message: '代理错误：无法连接到后端服务。',
          details: error.message
        }), {
          status: 502, // Bad Gateway
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': origin || '*',
            'Access-Control-Allow-Credentials': 'true',
          }
        });
      }
    }

    // --- 2. 静态资源逻辑 ---
    // 对于任何其他请求，提供 Pages 部署中的静态资源。
    return env.ASSETS.fetch(request);
  }
};
