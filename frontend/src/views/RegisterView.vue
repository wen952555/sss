<template>
  <div class="register-view">
    <h2>注册新账户</h2>
    <form @submit.prevent="handleRegister">
      <div>
        <label for="username">用户名:</label>
        <input type="text" id="username" v-model="username" required>
      </div>
      <div>
        <label for="password">密码:</label>
        <input type="password" id="password" v-model="password" required>
      </div>
      <div>
        <label for="confirmPassword">确认密码:</label>
        <input type="password" id="confirmPassword" v-model="confirmPassword" required>
      </div>
      <button type="submit" :disabled="isLoading">
        {{ isLoading ? '注册中...' : '注册' }}
      </button>
      <p v-if="error" class="error">{{ error }}</p>
      <p v-if="successMessage" class="success">{{ successMessage }}</p>
    </form>
    <p>已有账户? <RouterLink :to="{ name: 'Login' }">点此登录</RouterLink></p>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter, RouterLink } from 'vue-router';
import { useAuthStore } from '../store/authStore'; // 确认路径
import api from '../services/api'; // 我们直接使用api服务

const username = ref('');
const password = ref('');
const confirmPassword = ref('');
const error = ref('');
const successMessage = ref('');
const isLoading = ref(false);

const router = useRouter();
const authStore = useAuthStore(); // 虽然注册后可能不直接登录，但可能需要authStore做其他事

const handleRegister = async () => {
  error.value = '';
  successMessage.value = '';
  if (password.value !== confirmPassword.value) {
    error.value = '两次输入的密码不一致。';
    return;
  }
  isLoading.value = true;
  try {
    const response = await api.register({ username: username.value, password: password.value });
    successMessage.value = response.data.message + " 您现在可以登录了。";
    // 清空表单或根据需要重定向
    username.value = '';
    password.value = '';
    confirmPassword.value = '';
    // 可选: 延迟后跳转到登录页
    // setTimeout(() => {
    //   router.push({ name: 'Login' });
    // }, 2000);
  } catch (err) {
    error.value = err.response?.data?.error || err.message || '注册失败，请稍后再试。';
  } finally {
    isLoading.value = false;
  }
};
</script>

<style scoped>
.register-view {
  max-width: 400px;
  margin: 2rem auto;
  padding: 1.5rem;
  border: 1px solid #ccc;
  border-radius: 8px;
}
.register-view div {
  margin-bottom: 1rem;
}
label {
  display: block;
  margin-bottom: 0.3rem;
}
input[type="text"], input[type="password"] {
  width: 100%;
  padding: 0.5rem;
  box-sizing: border-box;
  border-radius: 4px;
  border: 1px solid #ddd;
}
button {
  padding: 0.7rem 1.5rem;
  background-color: #28a745; /* Green color for register */
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
.success {
  color: green;
  margin-top: 1rem;
}
</style>
