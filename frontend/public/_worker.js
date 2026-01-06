export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    // 如果请求是以 /api 开头，转发到 Serv00
    if (url.pathname.startsWith('/api')) {
      // Change the hostname to your Serv00 instance
      const newUrl = new URL(url.pathname + url.search, 'https://wen76674.serv00.net');
      
      // Create a new request with the updated URL, but preserve the original request's properties
      const newRequest = new Request(newUrl, {
        method: request.method,
        headers: request.headers,
        body: request.body,
        redirect: request.redirect
      });

      return fetch(newRequest);
    }
    // 否则返回静态资源（React App）
    return env.ASSETS.fetch(request);
  },
};
