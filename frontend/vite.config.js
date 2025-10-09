import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // --- NEW: Proxy PHP API requests ---
      '/api': {
        target: 'http://localhost:8000', // Target the PHP built-in server
        changeOrigin: true,
        // Rewrite the path to remove the /api prefix before forwarding
        rewrite: (path) => path.replace(/^\/api/, ''),
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