export default {
  async fetch(request, env) {
    try {
      // 核心修复点：使用 request.url 字符串
      const url = new URL(request.url);

      // 1. 拦截 API 请求
      if (url.pathname.startsWith('/api/')) {
        // 修正路径拼接逻辑：确保不出现双斜杠或非法格式
        const apiPath = url.pathname.replace(/^\/api/, '');
        const backendUrl = `https://wen76674.serv00.net${apiPath}${url.search}`;

        // 构造转发请求
        const init = {
          method: request.method,
          headers: request.headers,
          redirect: 'follow'
        };

        // 只有非 GET/HEAD 请求才透传 body
        if (request.method !== 'GET' && request.method !== 'HEAD') {
          // 直接使用 request.body 进行透传，效率最高且最稳健
          init.body = request.body;
        }

        // 转发到 Serv00
        return await fetch(backendUrl, init);
      }

      // 2. 正常处理静态资源 (HTML, JS, CSS, 扑克牌图片)
      return await env.ASSETS.fetch(request);

    } catch (err) {
      // 捕获异常，防止 1101 错误，输出具体信息
      return new Response(`Worker Logic Error: ${err.message}`, { 
        status: 500,
        headers: { 'Content-Type': 'text/plain; charset=UTF-8' }
      });
    }
  }
};