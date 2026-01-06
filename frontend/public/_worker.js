export default {
  async fetch(request, env) {
    const url = new URL(request);

    // 1. 如果是 API 请求，转发到 Serv00
    if (url.pathname.startsWith('/api/')) {
      const backendUrl = 'https://wen76674.serv00.net' + url.pathname.replace('/api/', '/') + url.search;
      
      // 极其稳健的转发：不修改 body，直接透传请求
      return fetch(new Request(backendUrl, request));
    }

    // 2. 只有不是 API 的请求，才交给 Cloudflare Pages 静态资源
    // 这样 favicon.ico 和其他脚本就不会触发 Worker 逻辑，也就不会 500
    return env.ASSETS.fetch(request);
  }
};