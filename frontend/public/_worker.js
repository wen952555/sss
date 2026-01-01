export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // 如果是 API 请求
    if (url.pathname.startsWith('/api/')) {
      const backendUrl = 'https://wen76674.serv00.net' + url.pathname.replace('/api', '') + url.search;
      
      // 处理跨域预检请求 (OPTIONS)
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': request.headers.get('Origin') || '*',
            'Access-Control-Allow-Credentials': 'true',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
            'Access-Control-Allow-Headers': request.headers.get('Access-Control-Request-Headers') || 'Content-Type, Authorization, X-Requested-With',
            'Access-Control-Max-Age': '86400',
          },
        });
      }

      // 准备转发到后端的请求
      const newHeaders = new Headers(request.headers);
      // 可以在这里添加或修改发往后端的 Header，例如 Host
      // newHeaders.set('Host', 'wen76674.serv00.net');

      const fetchOptions = {
        method: request.method,
        headers: newHeaders,
        redirect: 'follow'
      };

      // 只有非 GET/HEAD 请求才读取 body
      if (!['GET', 'HEAD'].includes(request.method)) {
        fetchOptions.body = await request.blob();
      }

      try {
        const response = await fetch(backendUrl, fetchOptions);
        
        // 构造新的响应以添加 CORS 头部
        const newResponse = new Response(response.body, response);
        newResponse.headers.set('Access-Control-Allow-Origin', request.headers.get('Origin') || '*');
        newResponse.headers.set('Access-Control-Allow-Credentials', 'true');
        newResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
        newResponse.headers.set('Access-Control-Expose-Headers', '*');
        
        return newResponse;
      } catch (err) {
        return new Response(JSON.stringify({ error: 'Proxy Error', details: err.message }), {
          status: 502,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
    }

    // 否则返回静态资源
    return env.ASSETS.fetch(request);
  }
};