import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  
  // 构建配置
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      output: {
        // 手动分块优化
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // React 核心库
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor-react'
            }
            // UI 相关库
            if (id.includes('react-hot-toast') || id.includes('react-icons')) {
              return 'vendor-ui'
            }
            // 网络通信库
            if (id.includes('axios') || id.includes('socket.io-client')) {
              return 'vendor-network'
            }
            // 其他第三方库
            return 'vendor-other'
          }
        },
        // 优化文件命名
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]'
      }
    },
    // 构建目标环境
    target: 'es2020'
  },
  
  // 开发服务器配置
  server: {
    port: 3000,
    host: true,
    open: true,
    cors: true,
    proxy: {
      '/api': {
        target: 'https://wen76674.serv00.net',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  },
  
  // 预构建优化
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'react-hot-toast',
      'react-icons',
      'axios',
      'jwt-decode',
      'socket.io-client'
    ]
  },
  
  // 模块解析配置
  resolve: {
    dedupe: ['react', 'react-dom']
  },
  
  // CSS 配置
  css: {
    postcss: './postcss.config.js'
  }
})