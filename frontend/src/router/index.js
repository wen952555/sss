import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import LoginView from '../views/LoginView.vue'
import RegisterView from '../views/RegisterView.vue'
import RoomListView from '../views/RoomListView.vue'
import GameView from '../views/GameView.vue'
import { useAuthStore } from '../store/authStore';


const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'Home',
      component: HomeView
    },
    {
      path: '/login',
      name: 'Login',
      component: LoginView,
      meta: { requiresGuest: true }
    },
    {
      path: '/register',
      name: 'Register',
      component: RegisterView,
      meta: { requiresGuest: true }
    },
    {
      path: '/rooms',
      name: 'RoomList',
      component: RoomListView,
      meta: { requiresAuth: true }
    },
    {
      path: '/game/:gameId', // Changed from roomId to gameId for clarity
      name: 'Game',
      component: GameView,
      props: true, // Pass route.params as props to GameView
      meta: { requiresAuth: true }
    }
    // Add other routes: CreateRoom, GameRoom, etc.
  ]
})

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();
  // Make sure auth status is resolved before navigation
  if (!authStore.isAuthStatusResolved) {
    await authStore.checkAuthStatus();
  }

  if (to.meta.requiresAuth && !authStore.isLoggedIn) {
    next({ name: 'Login', query: { redirect: to.fullPath } });
  } else if (to.meta.requiresGuest && authStore.isLoggedIn) {
    next({ name: 'Home' });
  } else {
    next();
  }
});

export default router
