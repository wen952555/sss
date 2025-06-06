import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      // 将 /api 的请求代理到你的PHP后端
      // 例如：/api/initial-deck.php -> https://9525.ip-ddns.com/initial-deck.php
      '/api': {
        target: 'https://9525.ip-ddns.com', // 你的PHP后端域名
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '') // 去掉 /api 前缀
      }
    }
  }
})
