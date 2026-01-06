export default {
  async fetch(request, env) {
    const url = new URL(request);

    // 1. 代理所有 /api 开头的请求到 Serv00
    if (url.pathname.startsWith('/api/')) {
      const targetUrl = 'https://wen76674.serv00.net' + url.pathname.replace('/api/', '/') + url.search;
      
      const modifiedRequest = new Request(targetUrl, {
        method: request.method,
        headers: request.headers,
        body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : null,
        redirect: 'follow'
      });

      return fetch(modifiedRequest);
    }

    // 2. 其余请求直接走静态资源
    return env.ASSETS.fetch(request);
  }
};