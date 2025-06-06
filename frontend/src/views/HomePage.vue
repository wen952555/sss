<template>
  <div class="home-page container">
    <header class="hero-section">
      <h1>欢迎来到十三水游戏!</h1>
      <p>与朋友一起享受策略与运气的较量。</p>
      <AppButton @click="goToGameLobby" size="large">开始游戏</AppButton>
      <AppButton v-if="!authStore.isAuthenticated" @click="goToLogin" variant="outline" size="large">登录/注册</AppButton>
      <AppButton v-if="authStore.isAuthenticated" @click="handleLogout" variant="danger" size="large">退出登录 ({{ authStore.currentUser?.name }})</AppButton>
    </header>

    <section class="features-section">
      <h2>游戏特色</h2>
      <!-- Add feature descriptions here -->
    </section>

    <!-- <AppModal :show="showLoginModal" @close="showLoginModal = false">
      <template #header>登录</template>
      <template #body><LoginForm @success="showLoginModal = false" /></template>
    </AppModal> -->
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import AppButton from '@/components/common/AppButton.vue';
// import AppModal from '@/components/common/AppModal.vue';
// import LoginForm from '@/components/auth/LoginForm.vue';
import { useAuthStore } from '@/store/modules/authStore';

const router = useRouter();
const authStore = useAuthStore();

// const showLoginModal = ref(false);

const goToGameLobby = () => {
  // 实际应用中可能会先去一个房间列表或创建房间的页面
  router.push({ name: 'GameTable' }); // 直接跳转到游戏桌示例
};

const goToLogin = () => {
  router.push({ name: 'Login' });
  // showLoginModal.value = true;
};

const handleLogout = () => {
  authStore.logout();
  // 可选：提示用户已退出
};
</script>

<style scoped>
.home-page {
  text-align: center;
}
.hero-section {
  padding: 40px 20px;
  background-color: #e9ecef; /* A light grey background */
  border-radius: 8px;
  margin-bottom: 30px;
}
.hero-section h1 {
  font-size: 2.5em;
  margin-bottom: 0.5em;
  color: #333;
}
.hero-section p {
  font-size: 1.2em;
  color: #555;
  margin-bottom: 1.5em;
}
.hero-section .app-button {
  margin: 0 10px;
}

.features-section {
  padding: 20px;
}
/* Add more styling */
</style>
