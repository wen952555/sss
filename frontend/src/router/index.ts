import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import HomePage from '@/views/HomePage.vue';
import GameTableView from '@/views/GameTableView.vue';
import LoginPage from '@/views/LoginPage.vue';
import NotFoundPage from '@/views/NotFoundPage.vue';
// import { useAuthStore } from '@/store/modules/authStore'; // 如果需要路由守卫

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'Home',
    component: HomePage,
  },
  {
    path: '/game/:roomId?', // 可选的房间ID
    name: 'GameTable',
    component: GameTableView,
    // meta: { requiresAuth: true } // 示例：需要登录才能访问
  },
  {
    path: '/login',
    name: 'Login',
    component: LoginPage,
    // meta: { guestOnly: true } // 示例：已登录用户不应访问
  },
  // 以后可以添加 /register, /profile, /lobby 等路由
  {
    path: '/:pathMatch(.*)*', // 捕获所有未匹配的路由
    name: 'NotFound',
    component: NotFoundPage,
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL), // 通常是 '/'
  routes,
});

// 示例：全局前置守卫
// router.beforeEach((to, from, next) => {
//   const authStore = useAuthStore(); // Pinia store 必须在 setup 或 router 实例创建后使用
//   const isAuthenticated = authStore.isAuthenticated;

//   if (to.meta.requiresAuth && !isAuthenticated) {
//     next({ name: 'Login', query: { redirect: to.fullPath } });
//   } else if (to.meta.guestOnly && isAuthenticated) {
//     next({ name: 'Home' });
//   } else {
//     next();
//   }
// });

export default router;
