import axios from 'axios';

const api = axios.create({
  baseURL: 'https://9526.ip-ddns.com/api',
  headers: {
    'Content-Type': 'application/json',
  }
});

// 请求拦截器
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, error => {
  return Promise.reject(error);
});

// 响应拦截器
api.interceptors.response.use(response => {
  return response.data;
}, error => {
  if (error.response.status === 401) {
    // 处理未授权
    localStorage.removeItem('token');
    window.location.href = '/login';
  }
  return Promise.reject(error);
});

export default api;
