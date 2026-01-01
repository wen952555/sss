// frontend/public/_worker.js
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    // 如果请求以 /api 开头，代理到 Serv00 后端
    if (url.pathname.startsWith('/api')) {
      const newUrl = new URL(request.url);
      newUrl.hostname = 'wen76674.serv00.net'; // 后端域名
      newUrl.pathname = '/api.php'; // 对应后端入口
      
      const modifiedRequest = new Request(newUrl, request);
      return fetch(modifiedRequest);
    }
    // 否则返回静态资源
    return env.ASSETS.fetch(request);
  },
};