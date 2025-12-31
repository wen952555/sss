import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'automatic',
      babel: {
        plugins: [
          ['babel-plugin-react-compiler', {}]
        ]
      }
    })
  ],
  
  // 构建配置
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    
    // Rollup 配置
    rollupOptions: {
      // 确保这些依赖被打包进来，而不是作为外部依赖
      external: [],
      
      output: {
        // 手动分块策略
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // React 相关库
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'vendor-react'
            }
            // UI 相关库
            if (id.includes('react-hot-toast') || id.includes('react-icons')) {
              return 'vendor-ui'
            }
            // 工具库
            if (id.includes('axios') || id.includes('jwt-decode')) {
              return 'vendor-utils'
            }
            // 其他 node_modules
            return 'vendor-other'
          }
          
          // 源码按目录分块
          if (id.includes('/src/components/')) {
            return 'components'
          }
          if (id.includes('/src/pages/')) {
            return 'pages'
          }
          if (id.includes('/src/utils/')) {
            return 'utils'
          }
        },
        
        // 优化 chunk 命名
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    
    // 构建目标
    target: 'es2020',
    
    // 模块转换限制
    commonjsOptions: {
      transformMixedEsModules: true
    }
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
  
  // 预构建配置
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'react-hot-toast',
      'react-icons',
      'axios',
      'jwt-decode'
    ],
    exclude: []
  },
  
  // 模块解析
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@assets': path.resolve(__dirname, './src/assets')
    },
    dedupe: ['react', 'react-dom', 'react-router-dom']
  },
  
  // CSS 配置
  css: {
    postcss: './postcss.config.js',
    preprocessorOptions: {
      scss: {
        additionalData: `@import "@/styles/variables.scss";`
      }
    }
  },
  
  // 环境变量
  envPrefix: 'VITE_',
  
  // 基础路径
  base: '/',
  
  // 预览服务器
  preview: {
    port: 4173,
    host: true,
    open: true
  }
})