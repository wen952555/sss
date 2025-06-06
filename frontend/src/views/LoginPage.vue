<template>
  <div class="login-page container">
    <div class="form-container">
      <LoginForm @success="onLoginSuccess" />
      <p>还没有账户? <router-link :to="{ name: 'Register' }">立即注册</router-link></p>
       <!-- <RegisterForm @success="onRegisterSuccess" /> -->
    </div>
  </div>
</template>

<script setup lang="ts">
import LoginForm from '@/components/auth/LoginForm.vue';
// import RegisterForm from '@/components/auth/RegisterForm.vue';
import { useRouter, useRoute } from 'vue-router';

const router = useRouter();
const route = useRoute();

const onLoginSuccess = () => {
  const redirectPath = route.query.redirect as string | undefined;
  router.push(redirectPath || { name: 'Home' });
};

// const onRegisterSuccess = () => {
//   alert('注册成功，请登录！');
//   // router.push({ name: 'Login' });
// }
</script>

<style scoped>
.login-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 80vh;
}
.form-container {
  width: 100%;
  max-width: 400px;
  padding: 20px;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}
.form-container p {
  text-align: center;
  margin-top: 15px;
}
</style>
