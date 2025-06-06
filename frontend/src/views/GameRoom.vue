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
import { useRoute, useRouter } from 'vue-router'; // 修正了此处的乱码
import { useGameStore } from '../store/game';
import GameBoard from '../components/GameBoard.vue';

const route = useRoute();
const router = useRouter();
const gameStore = useGameStore();

function syncGameIdWithRoute() {
  const gameIdFromRoute = route.params.gameId;

  if (gameIdFromRoute) {
    if (gameStore.gameId !== gameIdFromRoute) {
      const storedGameId = localStorage.getItem('thirteen_gameId');
      const storedPlayerId = localStorage.getItem('thirteen_playerId');

      if (storedGameId === gameIdFromRoute && storedPlayerId) {
        gameStore.gameId = storedGameId;
        gameStore.playerId = storedPlayerId;
        gameStore.playerName = localStorage.getItem('thirteen_playerName') || '玩家';
      } else {
        gameStore.clearGameData();
        gameStore.gameId = gameIdFromRoute;
      }
    }
    if(gameStore.gameId && !gameStore.pollingIntervalId) { // 确保在有 gameId 时启动轮询
        gameStore.startPolling();
    }
  } else if (!gameStore.gameId) { // 如果路由和 store 都没有 gameId
    router.push('/');
  }
  // 如果路由没有 gameId 但 store 有，则让 App.vue 或其他导航守卫处理，或保持当前状态
}

onMounted(() => {
  syncGameIdWithRoute();
});

watch(() => route.params.gameId, (newGameId, oldGameId) => {
  if (newGameId && newGameId !== oldGameId) {
    // console.log(`GameRoom: Route gameId changed from ${oldGameId} to ${newGameId}`);
    syncGameIdWithRoute();
  } else if (!newGameId && gameStore.gameId) {
    // 导航离开 GameRoom 时，全局后置守卫或组件卸载时处理清理
  }
});

// onBeforeUnmount 通常由 GameBoard.vue 内部的 onUnmounted 来停止轮询，
// 但如果 GameBoard 不是 GameRoomView 的直接唯一子组件，或者有其他需要清理的，可以在这里添加。
// onBeforeUnmount(() => {
//   // gameStore.stopPolling(); // 确保轮询停止
// });

</script>

<style scoped>
.game-room-view {
  width: 100%;
  min-height: calc(100vh - 60px); /* 假设有一个60px高的header/footer */
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
