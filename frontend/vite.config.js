import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://wen76674.serv00.net',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/api.php')
      }
    }
  }
})