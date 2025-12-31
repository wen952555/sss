export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const backendDomain = 'https://wen76674.serv00.net';
    
    // **关键修复：** 排除对 Worker 自身和静态资源的请求，避免递归循环
    // 如果请求路径以 /api 开头，则进行代理；否则，直接处理静态资源请求。
    if (!url.pathname.startsWith('/api/')) {
      // 对于非API请求（如静态文件、首页），由Pages正常处理
      return fetch(request);
    }
    
    // 以下是处理 /api 请求的逻辑
    const backendUrl = backendDomain + url.pathname + url.search;
    
    // 复制请求头，移除可能引起问题的来源头
    const headers = new Headers(request.headers);
    headers.delete('origin');
    headers.delete('referer');
    
    // 处理OPTIONS预检请求
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
    
    // 转发请求到后端
    try {
      const response = await fetch(backendUrl, {
        method: request.method,
        headers: headers,
        body: request.method !== 'GET' && request.method !== 'HEAD' ? await request.text() : undefined,
      });
      
      // 创建新的响应并添加CORS头
      const responseHeaders = new Headers(response.headers);
      responseHeaders.set('Access-Control-Allow-Origin', '*');
      responseHeaders.set('Access-Control-Expose-Headers', '*');
      
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });
    } catch (error) {
      // 后端连接失败
      return new Response(JSON.stringify({ 
        error: '后端服务连接失败',
        message: error.message 
      }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }
  },
};