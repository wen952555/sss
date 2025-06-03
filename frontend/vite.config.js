import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  // 如果你的后端和前端开发时不在同一个域，并且后端没有正确配置CORS
  // 你可以在开发环境下配置 Vite 的代理来避免CORS问题
  // 注意：这只在 `npm run dev` 时生效，对生产构建无效。
  // 生产环境的CORS问题必须在后端服务器上解决。
  /*
  server: {
    proxy: {
      // 字符串简写写法
      // '/api': 'http://localhost:14722', // 如果你的后端API有 /api 前缀
      // 带选项写法
      '/socket.io': { // 代理 Socket.IO 的请求
        target: 'ws://localhost:14722', // 注意这里是 ws 或 wss
        ws: true, // 必须开启 WebSocket 代理
        changeOrigin: true, // 建议开启，应对一些后端服务的源检查
        // 如果你的后端 Socket.IO 路径不是根路径，可能需要 rewrite
        // rewrite: (path) => path.replace(/^\/socket.io/, '')
      },
      // 如果你有 HTTP API
      // '/api-prefix': { // 假设你的API请求都以 /api-prefix 开头
      //   target: 'http://localhost:14722',
      //   changeOrigin: true,
      //   rewrite: (path) => path.replace(/^\/api-prefix/, '')
      // }
    }
  }
  */
})
