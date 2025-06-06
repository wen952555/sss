import { defineStore } from 'pinia';
import type { User } from '@/types';
import * as authService from '@/services/authService';
// import router from '@/router'; // 如果需要在action中跳转

interface AuthState {
  user: User | null;
  token: string | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    user: JSON.parse(localStorage.getItem('user') || 'null'),
    token: localStorage.getItem('token'),
    status: 'idle',
    error: null,
  }),
  getters: {
    isAuthenticated: (state) => !!state.token && !!state.user,
    currentUser: (state) => state.user,
    isLoading: (state) => state.status === 'loading',
  },
  actions: {
    async login(credentials: any) {
      this.status = 'loading';
      this.error = null;
      try {
        const response = await authService.login(credentials);
        this.user = response.user;
        this.token = response.token;
        localStorage.setItem('user', JSON.stringify(response.user));
        localStorage.setItem('token', response.token);
        this.status = 'succeeded';
        // router.push(router.currentRoute.value.query.redirect as string || '/'); // 登录后跳转
      } catch (err: any) {
        this.status = 'failed';
        this.error = err.message || 'Login failed';
        this.user = null;
        this.token = null;
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        throw err; // 让组件知道出错了
      }
    },
    async register(userData: any) {
      this.status = 'loading';
      this.error = null;
      try {
        const user = await authService.register(userData);
        // 通常注册后不会自动登录，或者后端会返回token让其自动登录
        // this.user = user;
        this.status = 'succeeded';
        // router.push('/login'); // 跳转到登录页
      } catch (err: any) {
        this.status = 'failed';
        this.error = err.message || 'Registration failed';
        throw err;
      }
    },
    logout() {
      // await authService.logout(); // 可选：通知后端token失效
      this.user = null;
      this.token = null;
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      this.status = 'idle';
      // router.push('/login');
      console.log('Logged out');
    },
    // 可以在这里添加一个 action 来从 localStorage 初始化状态，如果 main.ts 中不方便做
    // checkAuthStatus() {
    //   const token = localStorage.getItem('token');
    //   const userString = localStorage.getItem('user');
    //   if (token && userString) {
    //     this.token = token;
    //     this.user = JSON.parse(userString);
    //     // 可以在这里加一个API调用来验证token的有效性
    //   } else {
    //     this.logout(); //确保状态一致
    //   }
    // }
  },
});
