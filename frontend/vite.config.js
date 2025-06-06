You might want to configure the dev server proxy if you run frontend and backend locally:
```javascript
// vite.config.js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      // 如果你的PHP后端在本地运行于例如 localhost:8000/api/
      // '/api': {
      //   target: 'http://localhost:8000', // 你的本地PHP服务器地址
      //   changeOrigin: true,
      //   // rewrite: (path) => path.replace(/^\/api/, '/api') // 确保路径正确
      // }
    }
  }
})
```
但在部署时，`API_BASE_URL` 会指向你的 Serv00 域名，所以本地代理仅用于开发。
