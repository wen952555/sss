import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  // 如果你的后端API在开发时需要代理 (例如为了解决CORS问题)
  // server: {
  //   proxy: {
  //     '/api-proxy': { // 所有以 /api-proxy 开头的请求都会被代理
  //       target: 'https://9525.ip-ddns.com', // 你的后端域名
  //       changeOrigin: true,
  //       rewrite: (path) => path.replace(/^\/api-proxy/, '/thirteen-water-api/api') // 重写路径
  //     }
  //   }
  // }
})
