import axios from 'axios';

/**
 * 这里的 URL 是你部署在 Cloudflare Pages 上的域名。
 * APK 会通过这个地址访问 _worker.js 代理，从而解决跨域问题。
 */
const PROD_API_URL = 'https://sss.wen952555.me'; // 请确保这是你的真实部署域名

const api = axios.create({
  // 如果是原生环境 (Capacitor) 或者是生产环境构建，指向 Cloudflare 代理
  // 如果是本地开发环境 (npm run dev)，通常 Vite 会处理代理，或者直接指向 /api
  baseURL: (typeof window !== 'undefined' && (window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')))
    ? '/api' 
    : `${PROD_API_URL}/api`,
  withCredentials: true 
});

// 请求拦截器：方便调试
api.interceptors.request.use(config => {
  console.log('Sending request to:', config.url);
  return config;
});

export default api;