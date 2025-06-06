import { createApp } from 'vue';
import App from './App.vue';
import router from './router'; // 引入路由
import pinia from './store';
import './assets/main.css'; // 引入全局样式

// import { useAuthStore } from './store/modules/authStore'; // 如果需要初始化时检查登录

const app = createApp(App);

app.use(pinia);

// 可以在这里初始化一些Pinia store的状态，比如从localStorage恢复登录状态
// const authStore = useAuthStore(); // 获取store实例
// authStore.checkAuthStatus(); // 假设有这个action

app.use(router); // 使用路由

app.mount('#app');
