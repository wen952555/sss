import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://wen76674.serv00.net',
        changeOrigin: true,
        // 将 /api/auth 或 /api/game 重写为 /api.php
        rewrite: (path) => path.replace(/^\/api\/[^\/]+/, '/api.php'),
      },
    },
  },
})
