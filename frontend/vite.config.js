import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  // build: {  // <--- 通常不需要显式配置 outDir，Vite 默认为 'dist'
  //   outDir: 'dist'
  // },
  // 如果你在本地开发时需要代理后端 API (仅开发时有效)
  /*
  server: {
    proxy: {
      '/socket.io': {
        target: 'ws://localhost:14722', // 开发时后端的 WebSocket 地址
        ws: true,
        changeOrigin: true,
      },
      // 如果有 HTTP API
      // '/api': {
      //   target: 'http://localhost:14722', // 开发时后端的 HTTP API 地址
      //   changeOrigin: true,
      //   rewrite: (path) => path.replace(/^\/api/, '')
      // }
    }
  }
  */
})
