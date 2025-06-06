// LoginForm.vue
<template>
  <form @submit.prevent="handleLogin" class="auth-form">
    <h3>登录</h3>
    <div>
      <label for="username">用户名:</label>
      <input type="text" id="username" v-model="username" required />
    </div>
    <div>
      <label for="password">密码:</label>
      <input type="password" id="password" v-model="password" required />
    </div>
    <AppButton type="submit">登录</AppButton>
    <p v-if="errorMsg">{{ errorMsg }}</p>
  </form>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import AppButton from '@/components/common/AppButton.vue';
// import { useAuthStore } from '@/store/modules/authStore';

// const authStore = useAuthStore();
const username = ref('');
const password = ref('');
const errorMsg = ref('');

const handleLogin = async () => {
  errorMsg.value = '';
  console.log('Login attempt:', username.value);
  // try {
  //   await authStore.login({ username: username.value, password: password.value });
  //   // router.push('/'); // or to game lobby
  // } catch (err: any) {
  //   errorMsg.value = err.message || '登录失败';
  // }
  alert(`模拟登录: ${username.value}`);
};
</script>

<style scoped>
.auth-form { /* Add some basic styling */
  max-width: 300px; margin: auto; padding: 20px; border: 1px solid #ccc; border-radius: 5px;
}
.auth-form div { margin-bottom: 10px; }
.auth-form label { display: block; margin-bottom: 5px; }
.auth-form input { width: calc(100% - 12px); padding: 8px; border: 1px solid #ddd; border-radius: 3px;}
</style>
