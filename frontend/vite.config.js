import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    port: 5173, // 开发服务器端口，默认是 5173
    // open: true, // 启动时自动在浏览器中打开
    // proxy: { // 用于开发时代理后端API请求，避免CORS问题
    //   // 例如，如果你的后端API在 http://localhost:8888/api/
    //   // 并且你在前端请求 /api/create_game.php
    //   '/api': {
    //     target: 'http://localhost:8888', // 你的本地PHP服务器地址
    //     changeOrigin: true,
    //     // 可选：如果你的PHP文件不在 target 的根目录，可能需要重写路径
    //     // rewrite: (path) => path.replace(/^\/api/, '/your_php_folder/api/')
    //   }
    //   // 如果你的后端API是 https://9525.ip-ddns.com/backend/api/
    //   // 并且你想在本地开发时直接调用它，但遇到CORS (虽然我们后端已经配置了CORS)
    //   // 也可以这样配置，但通常后端配置好CORS后，本地开发可以直接请求远程API
    //   // '/backend/api': {
    //   //   target: 'https://9525.ip-ddns.com',
    //   //   changeOrigin: true,
    //   //   secure: false, // 如果目标是HTTPS且证书有问题（不推荐用于生产目标）
    //   // }
    // }
  },
  build: {
    outDir: 'dist', // 构建输出目录，Cloudflare Pages 默认会查找这个
    assetsDir: 'assets', // 静态资源存放目录 (在 outDir 内)
    // 可选：如果构建文件较大，可以调整 chunkSizeWarningLimit
    // chunkSizeWarningLimit: 1000, // 单位 kB
    rollupOptions: {
      // 可选：配置 Rollup 的更高级选项
      // output: {
      //   manualChunks(id) {
      //     // 例如，将 vue 和 vue-router 打包到单独的 chunk
      //     if (id.includes('node_modules/vue')) {
      //       return 'vue-vendor';
      //     }
      //     if (id.includes('node_modules/vue-router')) {
      //       return 'vue-router-vendor';
      //     }
      //     if (id.includes('node_modules/pinia')) {
      //       return 'pinia-vendor';
      //     }
      //   }
      // }
    }
  },
  // base: './', // 如果部署到子目录，可能需要设置 base。对于 Cloudflare Pages 根部署，通常不需要或为 '/'
})
