<template>
  <div class="home">
    <h1>欢迎来到十三水游戏</h1>
    <p>在这里，您可以创建房间或加入现有房间开始游戏。</p>
    <div v-if="!authStore.isLoggedIn">
      <RouterLink :to="{ name: 'Login' }">登录</RouterLink> 或
      <RouterLink :to="{ name: 'Register' }">注册</RouterLink> 以开始。
    </div>
    <div v-else>
      <p>
        <RouterLink :to="{ name: 'RoomList' }">前往房间列表</RouterLink>
      </p>
    </div>
  </div>
</template>

<script setup>
import { RouterLink } from 'vue-router';
import { useAuthStore } from '../store/authStore'; // 确认路径

const authStore = useAuthStore();
</script>

<style scoped>
.home {
  text-align: center;
  padding: 2rem;
}
.home h1 {
  margin-bottom: 1.5rem;
}
.home p {
  margin-bottom: 1rem;
  font-size: 1.1rem;
}
.home div a {
  margin: 0 0.5rem;
}
</style>
