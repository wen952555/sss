import axios from 'axios';

const api = axios.create({
  baseURL: 'https://9526.ip-ddns.com/backend/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true
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
api.interceptors.response.use(
  response => response.data,
  error => {
    if (error.code === 'ECONNABORTED') {
      return Promise.reject({ message: '请求超时，请重试' });
    }
    
    const errorResponse = {
      status: error.response?.status || 0,
      message: error.response?.data?.error || 
               error.message || 
               '网络错误，请稍后重试',
      data: error.response?.data
    };
    
    // 未授权处理
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    
    return Promise.reject(errorResponse);
  }
);

export default api;
