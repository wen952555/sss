import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    // Proxy for local development.
    // Requests from frontend (e.g. http://localhost:5173/api/auth/login)
    // will be proxied to https://9526.ip-ddns.com/backend/auth/login
    proxy: {
      '/api': {
        target: 'https://9526.ip-ddns.com/backend/', // Your PRODUCTION backend base URL
        changeOrigin: true, // Needed for virtual hosted sites and CORS
        secure: false, // If backend SSL cert is self-signed or problematic for Vite proxy (dev only)
                       // For valid certs, true or remove this line is fine.
        rewrite: (path) => path.replace(/^\/api/, ''), // Remove /api prefix
                                                      // So /api/auth/login becomes /auth/login
                                                      // which is appended to target.
      }
    }
  }
})
