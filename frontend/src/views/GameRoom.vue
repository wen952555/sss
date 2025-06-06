<template>
  <div class="game-room-view">
    <GameBoard v-if="gameStore.gameId" />
    <div v-else class="no-game-message">
      <p>没有有效的游戏房间信息。</p>
      <p>请返回<router-link to="/">首页</router-link>创建或加入游戏。</p>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, watch } from 'vue';
import { useRoute, useRouter }셔'; // 引入 useRouter
import { useGameStore } from '../store/game';
import GameBoard from '../components/GameBoard.vue';

const route = useRoute();
const router = useRouter(); // 获取 router 实例
const gameStore = useGameStore();

// 当组件挂载或路由参数变化时，确保 store 中的 gameId 与路由同步
// 并且如果 store 中没有 gameId，尝试从 localStorage 恢复
function syncGameIdWithRoute() {
  const gameIdFromRoute = route.params.gameId;

  if (gameIdFromRoute) {
    if (gameStore.gameId !== gameIdFromRoute) {
      // 如果 store 的 gameId 与路由不符，可能是直接通过 URL 访问
      // 尝试从 localStorage 恢复会话，如果 gameId 匹配
      const storedGameId = localStorage.getItem('thirteen_gameId');
      const storedPlayerId = localStorage.getItem('thirteen_playerId');

      if (storedGameId === gameIdFromRoute && storedPlayerId) {
        gameStore.gameId = storedGameId;
        gameStore.playerId = storedPlayerId;
        gameStore.playerName = localStorage.getItem('thirteen_playerName') || '玩家';
        // 确保在设置了 gameId 后启动轮询和获取状态
        // gameStore.startPolling(); // fetchGameState 会在 startPolling 中调用
      } else {
        // 如果 localStorage 与路由不符，或者没有 localStorage，
        // 清理旧的 store 数据，并将 store 的 gameId 设置为路由的 gameId
        // 这样后续的 fetchGameState 会尝试加入或获取这个游戏的状态
        gameStore.clearGameData(); // 清理可能存在的旧游戏数据
        gameStore.gameId = gameIdFromRoute; // 设置新的 gameId
        // 此时 playerName 可能是默认的，用户可能需要重新设置或后端处理
        // gameStore.fetchGameState(); // fetchGameState 会在 startPolling 中调用
      }
    }
    // 确保轮询已启动 (如果 gameId 有效)
    if(gameStore.gameId && !gameStore.pollingIntervalId) {
        gameStore.startPolling();
    }
  } else if (gameStore.gameId) {
    // 如果路由中没有 gameId，但 store 中有，可能是用户从游戏室导航走了
    // 这种情况下，通常由导航守卫或组件卸载时处理，这里可以不用做
  } else {
    // 既没有路由 gameId，也没有 store gameId，重定向到首页
    router.push('/');
  }
}

onMounted(() => {
  syncGameIdWithRoute();
});

// 监听路由参数变化，以应对用户在浏览器地址栏直接修改 gameId 的情况
watch(() => route.params.gameId, (newGameId, oldGameId) => {
  if (newGameId && newGameId !== oldGameId) {
    console.log(`GameRoom: Route gameId changed from ${oldGameId} to ${newGameId}`);
    syncGameIdWithRoute();
  } else if (!newGameId && gameStore.gameId) {
    // 如果从有 gameId 的路由导航到没有 gameId 的路由（例如返回首页）
    // GameBoard 的 onUnmounted 会停止轮询，clearGameData 应该在离开时由 store 或 GameBoard 调用
  }
});

onBeforeUnmount(() => {
  // 组件卸载前，确保停止轮询
  // 虽然 GameBoard 内部也有，但这里多一层保险，特别是如果 GameBoard 条件性渲染
  // gameStore.stopPolling(); // GameBoard的onUnmounted会处理这个
});

</script>

<style scoped>
.game-room-view {
  width: 100%;
  min-height: calc(100vh - 60px); /* 假设有一个60px高的header/footer */
  /* GameBoard 本身会处理其内部 padding 和 background */
}

.no-game-message {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 70vh;
  text-align: center;
  color: #555;
  font-size: 1.2rem;
}

.no-game-message p {
  margin: 10px 0;
}

.no-game-message a {
  color: #007bff;
  text-decoration: none;
  font-weight: bold;
}

.no-game-message a:hover {
  text-decoration: underline;
}
</style>
