export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const backendDomain = 'https://wen76674.serv00.net';
    
    // 处理API请求代理
    if (url.pathname.startsWith('/api/')) {
      // 构建后端URL
      const backendUrl = backendDomain + url.pathname + url.search;
      
      // 复制请求头
      const headers = new Headers(request.headers);
      
      // 添加CORS头
      headers.set('Access-Control-Allow-Origin', url.origin);
      headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
      headers.set('Access-Control-Allow-Credentials', 'true');
      
      // 处理OPTIONS预检请求
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          status: 200,
          headers: {
            'Access-Control-Allow-Origin': url.origin,
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
            'Access-Control-Allow-Credentials': 'true',
            'Access-Control-Max-Age': '86400',
          },
        });
      }
      
      // 移除可能引起问题的请求头
      headers.delete('origin');
      headers.delete('referer');
      
      // 转发请求到后端
      try {
        const response = await fetch(backendUrl, {
          method: request.method,
          headers: headers,
          body: request.method !== 'GET' && request.method !== 'HEAD' ? await request.text() : undefined,
        });
        
        // 创建新的响应并添加CORS头
        const responseHeaders = new Headers(response.headers);
        responseHeaders.set('Access-Control-Allow-Origin', url.origin);
        responseHeaders.set('Access-Control-Allow-Credentials', 'true');
        responseHeaders.set('Access-Control-Expose-Headers', '*');
        
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: responseHeaders,
        });
      } catch (error) {
        console.error('Backend connection failed:', error);
        return new Response(JSON.stringify({ 
          error: 'Backend connection failed',
          message: error.message 
        }), {
          status: 502,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': url.origin,
            'Access-Control-Allow-Credentials': 'true',
          },
        });
      }
    }
    
    // 对于非API请求，继续正常处理
    return fetch(request);
  },
};