import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // --- Proxy all API requests to the Node.js server ---
      '/api': {
        target: 'http://localhost:14722', // Target the Node.js server
        changeOrigin: true,
        // Rewrite the path to the format expected by the Node.js backend
        rewrite: (path) => path.replace(/^\/api/, '/php_backend'),
      },
      // --- Keep existing Node.js proxies ---
      '/games': {
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