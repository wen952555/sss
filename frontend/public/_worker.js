
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 拦截 /api 开头的请求
    if (url.pathname.startsWith('/api/')) {
      // 这里填你 Serv00 的真实域名
      const backendUrl = 'https://9525.ip-ddns.com'; 
      
      // 构造新请求
      const newUrl = new URL(url.pathname, backendUrl);
      newUrl.search = url.search; // 保留查询参数

      const newRequest = new Request(newUrl, request);
      
      // 发送给后端
      return fetch(newRequest);
    }

    // 其他请求照常处理 (返回静态资源)
    return env.ASSETS.fetch(request);
  },
};