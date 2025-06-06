import axios from 'axios';
import { API_BASE_URL } from '@/config';
// import { useAuthStore } from '@/store/modules/authStore'; // 如果需要添加token

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    // 'X-Requested-With': 'XMLHttpRequest', // 有些后端框架可能需要
  },
});

// 示例：请求拦截器，用于添加认证Token
// apiClient.interceptors.request.use(
//   (config) => {
//     const authStore = useAuthStore();
//     const token = authStore.token;
//     if (token && config.headers) {
//       config.headers.Authorization = `Bearer ${token}`;
//     }
//     return config;
//   },
//   (error) => {
//     return Promise.reject(error);
//   }
// );

// 示例：响应拦截器，用于统一处理错误或刷新Token
// apiClient.interceptors.response.use(
//   (response) => response,
//   (error) => {
//     if (error.response && error.response.status === 401) {
//       // 处理未授权，例如跳转到登录页
//       const authStore = useAuthStore();
//       authStore.logout();
//       router.push('/login'); // 需要引入router实例
//       console.error('Unauthorized, redirecting to login.');
//     }
//     return Promise.reject(error);
//   }
// );


export default apiClient;
