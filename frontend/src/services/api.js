import axios from 'axios';

const api = axios.create({
  baseURL: 'https://9526.ip-ddns.com/backend/api', // 确保与后端路径匹配
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
  response => {
    // 成功响应直接返回data
    return response.data?.data ?? response.data;
  },
  error => {
    // 统一错误处理
    let errorMessage = '网络错误，请稍后重试';
    let status = 0;
    let data = null;

    if (error.response) {
      // 服务器返回的错误
      status = error.response.status;
      data = error.response.data;
      errorMessage = data?.error || data?.message || `请求失败 (${status})`;
    } else if (error.request) {
      // 请求已发出但没有收到响应
      if (error.code === 'ECONNABORTED') {
        errorMessage = '请求超时，请检查网络连接';
      }
    } else {
      // 请求设置出错
      errorMessage = error.message || '请求配置错误';
    }

    // 未授权处理
    if (status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }

    return Promise.reject({
      status,
      message: errorMessage,
      data,
      originalError: error
    });
  }
);

export default api;
