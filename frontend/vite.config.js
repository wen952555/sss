import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/', // 确保资源路径从根目录开始
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false
  }
})