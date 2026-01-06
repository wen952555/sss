export default {
  async fetch(request, env) {
    const url = new URL(request);

    // 1. 只拦截 /api/ 开头的请求转发到后端
    if (url.pathname.startsWith('/api/')) {
      const targetUrl = 'https://wen76674.serv00.net' + url.pathname.replace('/api/', '/') + url.search;
      
      // 使用基础请求透传
      return fetch(new Request(targetUrl, {
        method: request.method,
        headers: request.headers,
        body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : null,
        redirect: 'manual'
      }));
    }

    // 2. 其余所有请求（图片、JS、HTML、Favicon）通通交给 Pages 托管
    // 不要加任何 try-catch 逻辑，直接返回原生资源
    return env.ASSETS.fetch(request);
  }
};