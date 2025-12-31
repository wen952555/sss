export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const backendDomain = 'https://wen76674.serv00.net';
    
    // 如果请求是以 /api 开头的，则代理到后端服务
    if (url.pathname.startsWith('/api/')) {
      const backendUrl = backendDomain + url.pathname + url.search;
      
      const headers = new Headers(request.headers);
      // 移除可能引起验证问题的头部
      headers.delete('origin');
      headers.delete('referer');
      
      // 处理跨域预检请求
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Max-Age': '86400',
          },
        });
      }
      
      try {
        const response = await fetch(backendUrl, {
          method: request.method,
          headers: headers,
          body: request.method !== 'GET' && request.method !== 'HEAD' ? await request.text() : undefined,
        });
        
        const responseHeaders = new Headers(response.headers);
        responseHeaders.set('Access-Control-Allow-Origin', '*');
        
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: responseHeaders,
        });
      } catch (error) {
        return new Response(JSON.stringify({ 
          error: '后端连接失败',
          message: error.message 
        }), {
          status: 502,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }
    }
    
    // **修复 1019 错误的关键**：
    // 对于非 API 请求，使用 env.ASSETS 提供的静态资源，而不是 fetch(request) 造成循环调用
    return env.ASSETS.fetch(request);
  },
};