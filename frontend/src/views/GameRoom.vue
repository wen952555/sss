<template>
  <div class="game-room">
    <GameBoard />
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useGameStore } from '../store/game';
import GameBoard from '../components/GameBoard.vue';

const route = useRoute();
const gameStore = useGameStore();

onMounted(() => {
  const gameIdFromRoute = route.params.gameId;
  if (gameIdFromRoute && gameStore.gameId !== gameIdFromRoute) {
    // 如果 store 中的 gameId 与路由不符 (例如直接通过 URL 进入)
    // 尝试恢复或设置 gameId，并触发一次状态获取
    // Pinia store 的 gameId 应该已通过 localStorage 或路由守卫设置
    // 这里主要是确保轮询能正确启动
  }
  // GameBoard 组件的 onMounted 会处理 startPolling
});
</script>

<style scoped>
.game-room {
  padding: 10px;
}
</style>
