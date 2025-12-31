export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // 如果请求是以 /api 开头，转发到 Serv00 后端
    if (url.pathname.startsWith('/api/')) {
      const backendUrl = 'https://wen76674.serv00.net' + url.pathname.replace('/api', '') + url.search;
      
      const newRequest = new Request(backendUrl, {
        method: request.method,
        headers: request.headers,
        body: request.body,
      });

      return fetch(newRequest);
    }

    // 否则返回静态资源
    return env.ASSETS.fetch(request);
  },
};