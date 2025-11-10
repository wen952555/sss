export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    console.log(`Incoming request: ${request.method} ${pathname}`);

    // 处理 API 请求
    if (pathname.startsWith('/api/')) {
      // 提取 action（移除 /api/ 前缀）
      const action = pathname.slice(5); // 移除 '/api/'
      
      // 构建后端URL
      const backendUrl = `https://9525.ip-ddns.com/api.php?action=${action}`;
      
      console.log(`Proxying to: ${backendUrl}`);

      try {
        // 准备请求头
        const headers = new Headers();
        headers.set('Content-Type', 'application/json');
        
        // 复制原始请求的授权头
        const authHeader = request.headers.get('Authorization');
        if (authHeader) {
          headers.set('Authorization', authHeader);
        }

        // 获取请求体
        let body = null;
        if (request.method !== 'GET' && request.method !== 'HEAD') {
          body = await request.text();
        }

        // 创建后端请求
        const backendRequest = new Request(backendUrl, {
          method: request.method,
          headers: headers,
          body: body,
          redirect: 'follow'
        });

        // 发送请求
        const response = await fetch(backendRequest);
        
        console.log(`Backend response status: ${response.status}`);

        // 克隆响应以便读取和返回
        const responseClone = response.clone();
        const responseText = await responseClone.text();
        console.log(`Backend response body: ${responseText.substring(0, 200)}`);

        // 创建新的响应
        return new Response(responseText, {
          status: response.status,
          statusText: response.statusText,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
          }
        });

      } catch (error) {
        console.error('Proxy error:', error);
        return new Response(JSON.stringify({
          success: false,
          message: '无法连接到服务器: ' + error.message
        }), {
          status: 503,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
    }

    // 对于非 API 请求，返回静态文件
    return env.ASSETS.fetch(request);
  },
};