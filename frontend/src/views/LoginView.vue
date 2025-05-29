<template>
  <div class="login-view">
    <h2>登录</h2>
    <form @submit.prevent="handleLogin">
      <div>
        <label for="username">用户名:</label>
        <input type="text" id="username" v-model="username" required>
      </div>
      <div>
        <label for="password">密码:</label>
        <input type="password" id="password" v-model="password" required>
      </div>
      <button type="submit" :disabled="isLoading">
        {{ isLoading ? '登录中...' : '登录' }}
      </button>
      <p v-if="error" class="error">{{ error }}</p>
    </form>
    <p>还没有账户? <RouterLink :to="{ name: 'Register' }">点此注册</RouterLink></p>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter, useRoute, RouterLink } from 'vue-router';
import { useAuthStore } from '../store/authStore';

const username = ref('');
const password = ref('');
const error = ref('');
const isLoading = ref(false);

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const handleLogin = async () => {
  error.value = '';
  isLoading.value = true;
  try {
    await authStore.login({ username: username.value, password: password.value });
    const redirectPath = route.query.redirect || '/';
    router.push(redirectPath);
  } catch (err) {
    error.value = err.message || err.error || '登录失败，请检查您的凭证。';
  } finally {
    isLoading.value = false;
  }
};
</script>

<style scoped>
.login-view {
  max-width: 400px;
  margin: 2rem auto;
  padding: 1.5rem;
  border: 1px solid #ccc;
  border-radius: 8px;
}
.login-view div {
  margin-bottom: 1rem;
}
label {
  display: block;
  margin-bottom: 0.3rem;
}
input {
  width: 100%;
  padding: 0.5rem;
  box-sizing: border-box;
  border-radius: 4px;
  border: 1px solid #ddd;
}
button {
  padding: 0.7rem 1.5rem;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
button:disabled {
  background-color: #aaa;
}
.error {
  color: red;
  margin-top: 1rem;
}
</style>
