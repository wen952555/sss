import axios from 'axios';

// 在本地开发时指向后端，部署后由于 _worker.js 存在，使用相对路径 /api
const api = axios.create({
  baseURL: '/api',
  withCredentials: true // 允许跨域携带 Session Cookie
});

export default api;