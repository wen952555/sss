// frontend/vite.config.js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  // server: { // 这是本地开发服务器的代理配置，部署到 Cloudflare Pages 时通常不需要
  //   proxy: {
  //     // 例如，如果你本地 PHP 后端运行在 localhost:8000
  //     // 并且你的 API 请求路径是 /api/something.php
  //     '/api': {
  //       target: 'http://localhost:8000', // 你的本地PHP服务器地址
  //       changeOrigin: true,
  //       // 可选：如果你的 PHP 文件不在根目录，可能需要重写路径
  //       // rewrite: (path) => path.replace(/^\/api/, '/your_php_backend_folder/api')
  //     }
  //   }
  // }
})
