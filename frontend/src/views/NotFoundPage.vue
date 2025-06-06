<template>
  <div class="not-found-page container">
    <h1>404 - 页面未找到</h1>
    <p>抱歉，您访问的页面不存在。</p>
    <router-link :to="{ name: 'Home' }">
      <AppButton>返回首页</AppButton>
    </router-link>
  </div>
</template>

<script setup lang="ts">
import AppButton from '@/components/common/AppButton.vue';
</script>

<style scoped>
.not-found-page {
  text-align: center;
  padding-top: 50px;
}
.not-found-page h1 {
  font-size: 3em;
  color: #dc3545; /* A danger color */
}
.not-found-page p {
  font-size: 1.2em;
  margin-bottom: 20px;
}
</style>
