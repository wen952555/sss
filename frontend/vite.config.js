import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteStaticCopy } from 'vite-plugin-static-copy'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        {
          src: 'functions',
          dest: '.',
        },
      ],
    }),
  ],
  server: {
    proxy: {
      // These are placeholder targets. The user should replace them with the actual API endpoints.
      '/proxy49': {
        target: 'https://api.example.com/49',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy49/, ''),
      },
      '/proxymacau': {
        target: 'https://api.example.com/macau',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxymacau/, ''),
      },
    },
  },
})
