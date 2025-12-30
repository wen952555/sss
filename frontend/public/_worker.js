export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 拦截 /api 开头的请求
    if (url.pathname.startsWith('/api/')) {
      // 修正：将 /api/... 转发到 后端的 /backend/api/...
      const backendUrl = 'https://9525.ip-ddns.com'; 
      const targetPath = '/backend' + url.pathname;
      
      const newUrl = new URL(targetPath, backendUrl);
      newUrl.search = url.search; 

      const newRequest = new Request(newUrl, {
        method: request.method,
        headers: request.headers,
        body: request.body,
        redirect: 'follow'
      });
      
      return fetch(newRequest);
    }

    return env.ASSETS.fetch(request);
  },
};
