import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy API requests to the backend
      '/auth': {
        target: 'http://localhost:14722',
        changeOrigin: true,
      },
      '/games': {
        target: 'http://localhost:14722',
        changeOrigin: true,
      },
       '/user': {
        target: 'http://localhost:14722',
        changeOrigin: true,
      },
       '/points': {
        target: 'http://localhost:14722',
        changeOrigin: true,
      },
      '/test-db': {
        target: 'http://localhost:14722',
        changeOrigin: true,
      },
      // Proxy WebSocket requests
      '/socket.io': {
        target: 'ws://localhost:14722',
        ws: true,
      },
    },
  },
})
