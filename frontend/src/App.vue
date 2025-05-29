<template>
  <div id="app-container">
    <header>
      <h1>十三水</h1>
      <nav v-if="authStore.isAuthenticated"> <!-- Use getter -->
        <RouterLink to="/">首页</RouterLink> |
        <RouterLink :to="{ name: 'RoomList' }" v-if="authStore.isAuthenticated">房间列表</RouterLink> | <!-- Conditional link -->
        <span v-if="authStore.currentUser">欢迎, {{ authStore.currentUser.username }}! (ID: {{ authStore.currentUser.userId }})</span>
        <button @click="handleLogout">登出</button>
      </nav>
      <nav v-else>
        <RouterLink :to="{ name: 'Login' }">登录</RouterLink> |
        <RouterLink :to="{ name: 'Register' }">注册</RouterLink>
      </nav>
      <div v-if="authStore.getAuthError" class="auth-error-banner">
        认证错误: {{ authStore.getAuthError }}
      </div>
    </header>
    <main>
      <RouterView />
    </main>
    <footer>
      <p>© {{ new Date().getFullYear() }} 十三水游戏</p>
    </footer>
  </div>
</template>

<script setup>
import { RouterLink, RouterView, useRouter } from 'vue-router';
import { useAuthStore } from './store/authStore';
import api from './services/api';
import { onMounted, watch } from 'vue';

const authStore = useAuthStore();
const router = useRouter();

// Call checkAuthStatus when the app component is mounted.
// This is a common place for initial auth check.
onMounted(async () => {
  console.log("[App.vue] onMounted: App component mounted. Checking auth status...");
  // Only check if not already resolved, or consider if a force check is needed on every app load.
  if (!authStore.authReady) { // Use getter
    await authStore.checkAuthStatus();
  }
  console.log("[App.vue] onMounted: Auth status check process completed. LoggedIn:", authStore.isAuthenticated, "User:", authStore.currentUser?.username);
});

// Optional: Watch for changes in login state to react if needed at App level
watch(() => authStore.isAuthenticated, (newIsLoggedIn, oldIsLoggedIn) => {
    console.log(`[App.vue] Watcher: authStore.isAuthenticated changed from ${oldIsLoggedIn} to ${newIsLoggedIn}`);
    if (newIsLoggedIn && router.currentRoute.value.name === 'Login') {
        // If user logs in while on login page, redirect them (e.g., to Home or a dashboard)
        // router.push({ name: 'Home' });
    }
});

const handleLogout = async () => {
  console.log("[App.vue] handleLogout initiated.");
  try {
    await api.logout(); // Call backend to destroy session on server
    console.log("[App.vue] API logout successful.");
  } catch (error) {
    console.error("[App.vue] Logout API call failed:", error.response?.data?.error || error.message, error.response || error);
    // Proceed to clear client state even if API call fails, to allow user to re-login
  } finally {
    authStore.processUserLogout(); // Clears user state in Pinia store
    router.push({ name: 'Login' }); // Navigate to login page
    console.log("[App.vue] Navigated to Login page after logout process.");
  }
};
</script>

<style scoped>
#app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem;
  font-family: Arial, sans-serif;
}
header {
  background-color: #f0f0f0;
  padding: 1rem;
  margin-bottom: 1rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
header h1 {
  margin: 0 0 0.5rem 0;
  text-align: center;
  color: #333;
}
nav {
  text-align: center;
  margin-top: 0.5rem;
}
nav a, nav button, nav span {
  margin: 0 0.75rem;
  color: #007bff;
  text-decoration: none;
}
nav a:hover {
  text-decoration: underline;
}
nav button {
  background: none;
  border: none;
  color: #007bff;
  text-decoration: underline;
  cursor: pointer;
  padding: 0;
  font-size: inherit; /* Match link font size */
  font-family: inherit;
}
nav button:hover {
  color: #0056b3;
}
main {
  flex-grow: 1;
}
footer {
  text-align: center;
  margin-top: 2rem;
  padding: 1rem;
  background-color: #f0f0f0;
  border-radius: 8px;
  font-size: 0.9em;
  color: #555;
}
.auth-error-banner {
  background-color: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
  padding: 0.75rem 1.25rem;
  margin-top: 1rem;
  border-radius: 0.25rem;
  text-align: center;
}
</style>
