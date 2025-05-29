<template>
  <div id="app-container">
    <header>
      <h1>十三水</h1>
      <nav v.if="authStore.isLoggedIn">
        <RouterLink to="/">首页</RouterLink> |
        <RouterLink :to="{ name: 'RoomList' }">房间列表</RouterLink> |
        <span v-if="authStore.user">欢迎, {{ authStore.user.username }}!</span>
        <button @click="handleLogout">登出</button>
      </nav>
      <nav v-else>
        <RouterLink :to="{ name: 'Login' }">登录</RouterLink> |
        <RouterLink :to="{ name: 'Register' }">注册</RouterLink>
      </nav>
    </header>
    <main>
      <RouterView />
    </main>
    <footer>
      <p>© 2023 十三水游戏</p>
    </footer>
  </div>
</template>

<script setup>
import { RouterLink, RouterView, useRouter } from 'vue-router'
import { useAuthStore } from './store/authStore'; // Assuming you create this
import api from './services/api';

const authStore = useAuthStore();
const router = useRouter();

// Check login status on app load
authStore.checkAuthStatus();

const handleLogout = async () => {
  try {
    await api.logout();
    authStore.logout();
    router.push({ name: 'Login' });
  } catch (error) {
    console.error("Logout failed:", error);
    // Handle logout error display if needed
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
}
header {
  background-color: #f0f0f0;
  padding: 1rem;
  margin-bottom: 1rem;
  border-radius: 8px;
}
header h1 {
  margin: 0;
  text-align: center;
}
nav {
  text-align: center;
  margin-top: 0.5rem;
}
nav a, nav button, nav span {
  margin: 0 0.5rem;
}
nav button {
  background: none;
  border: none;
  color: blue;
  text-decoration: underline;
  cursor: pointer;
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
}
</style>
