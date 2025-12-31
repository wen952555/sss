export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      const backendUrl = 'https://wen76674.serv00.net' + url.pathname.replace('/api', '') + url.search;
      
      const newRequest = new Request(backendUrl, {
        method: request.method,
        headers: request.headers,
        body: request.method !== 'GET' ? await request.blob() : null,
        redirect: 'follow'
      });

      const response = await fetch(newRequest);
      
      // 克隆响应以修改头部
      const newResponse = new Response(response.body, response);
      newResponse.headers.set('Access-Control-Allow-Origin', url.origin);
      newResponse.headers.set('Access-Control-Allow-Credentials', 'true
      ');
      newResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      
      return newResponse;
    }
    return env.ASSETS.fetch(request);
  }
};