<template>
  <div id="app-container">
    <header>
      <h1>十三水</h1>
      <!-- 确保这里是 v-if，并且与下面的 v-else 是直接兄弟节点 -->
      <nav v-if="authStore.isLoggedIn">
        <RouterLink to="/">首页</RouterLink> |
        <RouterLink :to="{ name: 'RoomList' }">房间列表</RouterLink> |
        <!-- 内部的 v-if 不影响外部 v-if/v-else 结构 -->
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
import { RouterLink, RouterView, useRouter } from 'vue-router';
import { useAuthStore } from './store/authStore'; // 确保路径正确
import api from './services/api'; // 确保路径正确

const authStore = useAuthStore();
const router = useRouter();

// 检查登录状态 on app load
// 如果 authStore.checkAuthStatus 是异步的，并且你希望在它完成前做些什么，
// 可以考虑将其放在 onMounted 钩子或者一个立即执行的异步函数中。
// 但通常 Pinia store 初始化时会自行处理。
// 为确保在模板渲染前状态已尽可能更新，可以这样调用：
authStore.checkAuthStatus();

const handleLogout = async () => {
  try {
    await api.logout();
    authStore.logout(); // 更新 Pinia store
    router.push({ name: 'Login' });
  } catch (error) {
    console.error("Logout failed:", error);
    // 根据需要处理登出错误的用户提示
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
  color: blue; /* 或其他适合的颜色 */
  text-decoration: underline;
  cursor: pointer;
  padding: 0; /* 移除默认 padding */
  font-size: inherit; /* 继承父级字体大小 */
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
