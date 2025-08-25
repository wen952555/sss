/**
 * Cloudflare Worker for API Proxy
 *
 * This worker intercepts requests made to paths starting with /api/
 * and forwards them to the backend server, effectively creating a reverse proxy.
 * This allows the frontend and backend to share the same domain, avoiding CORS issues.
 */
export default {
  async fetch(request, env, ctx) {
    // 1. 定义后端服务器的地址
    // =========================================================================
    // 重要：这是您后端 API 的根 URL，请确保它准确无误。
    // 它应该是不带任何路径（如 /api）的域名。
    const backendHost = 'https://9522.ip-ddns.com';
    // =========================================================================

    // 2. 解析传入请求的 URL
    const url = new URL(request.url);

    // 3. 检查请求路径是否是我们定义的 API 路径前缀（例如 /api/）
    if (url.pathname.startsWith('/api/')) {
      // 如果是 API 请求，我们将把它代理到后端

      // 3.1. 构建目标的后端 URL
      // 这会保留原始请求的路径和查询参数
      // 例如，如果原始请求是 https://your-frontend.com/api/deal_cards.php?game=eight
      // 目标 URL 将会是 https://9522.ip-ddns.com/api/deal_cards.php?game=eight
      const backendUrl = `${backendHost}${url.pathname}${url.search}`;

      // 3.2. （可选）在服务器日志中打印信息，方便调试
      console.log(`Forwarding API request from ${request.url} to ${backendUrl}`);

      // 3.3. 创建一个新的请求对象，指向后端服务器
      // 我们需要复制原始请求的所有重要属性，以确保后端能正确处理
      const backendRequest = new Request(backendUrl, {
        method: request.method,      // 复制请求方法 (GET, POST, etc.)
        headers: request.headers,    // 复制所有请求头
        body: request.body,          // 复制请求体 (如果有)
        redirect: 'follow'           // 遵循重定向
      });

      // 3.4. （重要）修改 Host 请求头
      // 默认情况下，fetch会使用目标URL的主机名作为Host头。
      // 对于某些服务器配置（特别是使用虚拟主机的），
      // 需要将Host头设置为后端服务器的域名，以确保请求被正确路由。
      // 对于DDNS域名，这通常是必要的。
      backendRequest.headers.set('Host', new URL(backendHost).hostname);

      try {
        // 3.5. 发送请求到后端，并等待响应
        const response = await fetch(backendRequest);

        // 3.6. 创建一个可修改的响应副本，以处理可能的CORS头
        // 这一步很重要，可以避免后端意外返回的CORS头与前端策略冲突
        const mutableResponse = new Response(response.body, response);

        // （可选但推荐）移除所有可能由后端设置的CORS相关的头
        // 因为现在是同源了，不再需要这些头，留着反而可能引起混乱
        mutableResponse.headers.delete('Access-Control-Allow-Origin');
        mutableResponse.headers.delete('Access-Control-Allow-Methods');
        mutableResponse.headers.delete('Access-Control-Allow-Headers');

        // 3.7. 将从后端获取的响应返回给原始请求者（浏览器）
        return mutableResponse;

      } catch (error) {
        // 如果连接后端失败，返回一个错误信息
        console.error(`Error fetching from backend: ${error.message}`);
        return new Response('API backend is currently unavailable.', { status: 503 });
      }
    }

    // 4. 如果请求路径不是 /api/ 开头，则不是 API 请求
    // 让 Cloudflare Pages 正常处理它，返回前端的静态资源（HTML, CSS, JS, 图片等）
    return env.ASSETS.fetch(request);
  }
};