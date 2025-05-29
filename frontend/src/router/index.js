import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../store/authStore'; // Import store

// Route components
import HomeView from '../views/HomeView.vue';
import LoginView from '../views/LoginView.vue';
import RegisterView from '../views/RegisterView.vue';
import RoomListView from '../views/RoomListView.vue';
import GameView from '../views/GameView.vue';

const routes = [
  { path: '/', name: 'Home', component: HomeView },
  { path: '/login', name: 'Login', component: LoginView, meta: { requiresGuest: true } },
  { path: '/register', name: 'Register', component: RegisterView, meta: { requiresGuest: true } },
  {
    path: '/rooms',
    name: 'RoomList',
    component: RoomListView,
    meta: { requiresAuth: true }
  },
  {
    path: '/game/:gameId', // gameId prop will be passed to GameView
    name: 'Game',
    component: GameView,
    props: true,
    meta: { requiresAuth: true }
  },
  // Fallback route for unmatched paths
  { path: '/:pathMatch(.*)*', name: 'NotFound', redirect: '/' }
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
});

router.beforeEach(async (to, from, next) => {
  console.log(`[RouterGuard] Navigating from '${from.fullPath}' to '${to.fullPath}'`);
  const authStore = useAuthStore();

  // Ensure initial auth status check is complete before proceeding with route guards.
  // The checkAuthStatus action now sets isAuthStatusResolved correctly.
  if (!authStore.authReady) { // Use the getter for clarity
    console.log("[RouterGuard] Auth status not yet resolved. Awaiting checkAuthStatus...");
    await authStore.checkAuthStatus(); // This will set isAuthStatusResolved to true
    console.log(`[RouterGuard] checkAuthStatus completed. isLoggedIn: ${authStore.isAuthenticated}, User: ${authStore.currentUser?.username}`);
  } else {
    console.log(`[RouterGuard] Auth status was already resolved. isLoggedIn: ${authStore.isAuthenticated}, User: ${authStore.currentUser?.username}`);
  }

  const requiresAuth = to.matched.some(record => record.meta.requiresAuth);
  const requiresGuest = to.matched.some(record => record.meta.requiresGuest);

  if (requiresAuth && !authStore.isAuthenticated) {
    console.log("[RouterGuard] Route requires auth, but user not authenticated. Redirecting to Login.");
    next({ name: 'Login', query: { redirect: to.fullPath } });
  } else if (requiresGuest && authStore.isAuthenticated) {
    console.log("[RouterGuard] Route requires guest, but user is authenticated. Redirecting to Home.");
    next({ name: 'Home' });
  } else {
    console.log("[RouterGuard] Proceeding with navigation to target route.");
    next();
  }
});

export default router;
