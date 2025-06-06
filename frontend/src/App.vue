<template>
  <div id="app-container">
    <!-- 可以有全局导航栏 Header -->
    <!-- <GlobalHeader /> -->
    <main>
      <router-view /> <!-- 路由匹配到的组件将在这里渲染 -->
    </main>
    <!-- 可以有全局页脚 Footer -->
    <!-- <GlobalFooter /> -->

    <!-- 全局加载指示器，由 uiStore 控制 -->
    <LoadingSpinner v-if="uiStore.isLoadingGlobally" class="global-spinner" />
  </div>
</template>

<script setup lang="ts">
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import { useUIStore } from '@/store/modules/uiStore';

const uiStore = useUIStore();

// 示例：可以在这里监听路由变化，或进行其他全局设置
// import { onMounted } from 'vue';
// import { useRouter } from 'vue-router';
// const router = useRouter();
// onMounted(() => {
//   router.isReady().then(() => {
//     console.log('Router is ready.');
//     // 可以在这里执行依赖路由的初始化逻辑
//   });
// });
</script>

<style>
/* App.vue 的样式，或者通过 @import 引入其他样式表 */
#app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}
main {
  flex-grow: 1;
  /* padding: 10px; 根据需要调整 */
}
.global-spinner { /* 示例：让全局加载指示器覆盖整个页面 */
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(255,255,255,0.7);
  z-index: 9999;
}
</style>
