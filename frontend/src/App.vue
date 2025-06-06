<template>
  <div id="app-layout">
    <header class="app-header">
      <div class="header-content">
        <img src="/logo.png" alt="十三水 Logo" class="app-logo" @click="goToHome" />
        <h1 @click="goToHome">十三水在线</h1>
        <!-- 可以添加其他导航项或用户信息 -->
      </div>
    </header>

    <main class="app-main">
      <router-view v-slot="{ Component, route }">
        <transition name="fade" mode="out-in">
          <component :is="Component" :key="route.path" />
        </transition>
      </router-view>
    </main>

    <footer class="app-footer">
      <p>© {{ currentYear }} 多人十三水游戏. (AI Demo Version)</p>
      <!-- <p>
        <a href="/privacy-policy">隐私政策</a> | 
        <a href="/terms-of-service">服务条款</a>
      </p> -->
    </footer>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const currentYear = computed(() => new Date().getFullYear());

function goToHome() {
  router.push('/');
}

// 可以在这里监听 store 中的全局错误，并使用一个全局通知组件来显示
// import { useGameStore } from './store/game';
// const gameStore = useGameStore();
// watch(() => gameStore.error, (newError) => {
//   if (newError) {
//     // 调用全局通知服务显示 newError
//     // e.g., toast.error(newError);
//     // 记得在适当的时候清除 store.error，例如当通知被关闭时
//   }
// });
</script>

<style>
/* 全局基础样式 - 也可以放在 main.css 中 */
:root {
  --primary-color: #3498db; /* 主题蓝 */
  --secondary-color: #2c3e50; /* 深蓝灰 */
  --accent-color: #e67e22; /* 橙色点缀 */
  --light-bg: #f4f7f9; /* 浅背景 */
  --dark-text: #333333;
  --light-text: #f2f2f2;
  --border-color: #dfe6ec;
  --card-shadow: 0 4px 8px rgba(0,0,0,0.1);
  --header-height: 60px; /* 定义头部高度变量 */
}

body {
  margin: 0;
  font-family: 'Roboto', -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
  background-color: var(--light-bg);
  color: var(--dark-text);
  line-height: 1.6;
  font-size: 16px; /* 基础字号 */
}

#app-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.app-header {
  background-color: var(--secondary-color);
  color: var(--light-text);
  padding: 0 20px; /* 左右内边距 */
  height: var(--header-height);
  display: flex;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  position: sticky; /* 页眉固定 */
  top: 0;
  z-index: 1001; /* 比 GameBoard 的 banner 高 */
}

.header-content {
  width: 100%;
  max-width: 1200px; /* 内容最大宽度 */
  margin: 0 auto;
  display: flex;
  align-items: center;
}

.app-logo {
  height: 40px;
  margin-right: 15px;
  cursor: pointer;
  transition: transform 0.2s ease-in-out;
}
.app-logo:hover {
    transform: scale(1.1);
}

.app-header h1 {
  margin: 0;
  font-size: 1.6rem; /* 调整标题大小 */
  font-weight: 500;
  cursor: pointer;
}

.app-main {
  flex-grow: 1;
  /* padding-top: var(--header-height); /* 如果 header 不是 sticky，则需要这个避免内容被遮挡 */
  /* GameBoard 等视图组件自己处理其内边距 */
}

.app-footer {
  background-color: #34495e; /* 页脚颜色，比页眉稍浅或不同 */
  color: #bdc3c7; /* 页脚文字颜色 */
  text-align: center;
  padding: 15px 20px;
  font-size: 0.85rem;
  border-top: 1px solid #4a627a;
}

.app-footer p {
  margin: 5px 0;
}
.app-footer a {
  color: #ecf0f1;
  text-decoration: none;
}
.app-footer a:hover {
  text-decoration: underline;
}

/* 全局按钮样式 (可选，也可以在各自组件中定义) */
button {
  font-family: inherit; /* 继承字体 */
}

/* Vue Router 路由过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 全局卡片样式 (如果需要统一，但 Card.vue 已有自己的) */
/*
.card-global {
  background-color: white;
  border-radius: 6px;
  box-shadow: var(--card-shadow);
  padding: 15px;
}
*/
</style>
