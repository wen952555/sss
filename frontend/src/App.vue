<template>
  <div id="thirteen-water-app">
    <header>
      <h1>十三水在线对战</h1>
      <div v-if="gameStore.playerSessionId" class="session-info">
        会话ID: <small>{{ gameStore.playerSessionId.substring(0, 8) }}...</small>
        <button @click="copySessionId" title="复制会话ID (用于调试或恢复)">复制</button>
      </div>
    </header>

    <main>
      <!-- GameSetup 组件只在游戏未激活且未结束时显示 -->
      <GameSetup v-if="!gameStore.isGameActive && gameStore.gameState?.status !== 'finished'" />

      <div v-if="gameStore.isGameActive || gameStore.gameState?.status === 'finished'" class="game-board">
        <h2>
          房间: {{ gameStore.gameCode }}
          <span class="game-status">(状态: {{ localizedGameStatus }})</span>
          <!-- 新增：在游戏板内也提供离开按钮 -->
          <button @click="handleLeaveGameApp" v-if="gameStore.gameId" class="btn-leave-game-app" :disabled="gameStore.loading">
            离开游戏
          </button>
        </h2>
        <!-- ... (其他游戏板内容与上一版相同) ... -->
        <div v-if="gameStore.loading && gameStore.isGameActive" class="loading-overlay"><p>加载中...</p></div>
        <div v-if="gameStore.error && gameStore.isGameActive" class="error-banner">错误: {{ gameStore.error }}</div>
        <div class="players-area">
          <PlayerStatus v-for="player in gameStore.players" :key="player.id" :player="player" :game-status="gameStore.gameState?.status || 'unknown'" />
        </div>
        <PlayerHandInput v-if="gameStore.isMyTurnToSubmit && gameStore.myCards.length > 0" :initial-cards="gameStore.myCards" :is-submitted="myPlayerIsReady" />
        <div v-if="gameStore.gameState?.status === 'playing' && myPlayerIsReady && !gameStore.allPlayersReady" class="waiting-others"><p>你的牌型已提交，请等待其他玩家...</p></div>
        <div v-if="gameStore.gameState?.status === 'finished'" class="game-over-section">
          <h3>本局结束！</h3>
          <button @click="handleNewRound" v-if="canStartNewRound" :disabled="gameStore.loading" class="btn-new-round">开始新一局</button>
          <!-- 这里的离开按钮可以移除，因为上面已经有一个更通用的了 -->
          <!-- <button @click="gameStore.clearGameData()" class="btn-leave-game">离开房间</button> -->
        </div>

      </div>
    </main>
    <footer>
      <p>简易十三水游戏 - Vue & PHP</p>
    </footer>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted } from 'vue';
import { useGameStore } from './stores/gameStore';
import GameSetup from './components/GameSetup.vue';
import PlayerHandInput from './components/PlayerHandInput.vue'; // 确保这个组件已经移除了拖拽
import PlayerStatus from './components/PlayerStatus.vue';

const gameStore = useGameStore();

const localizedGameStatus = computed(() => { /* ... (与上一版相同) ... */ });
const myPlayerIsReady = computed(() => { /* ... (与上一版相同) ... */ });
const canStartNewRound = computed(() => { /* ... (与上一版相同) ... */ });

async function handleNewRound() { /* ... (与上一版相同) ... */ }
async function copySessionId() { /* ... (与上一版相同) ... */ }

// 新增：App.vue 中的离开游戏处理函数
async function handleLeaveGameApp() {
    // console.log("App.vue: Attempting to leave game...");
    await gameStore.leaveGame();
}

onMounted(async () => { /* ... (与上一版相同) ... */ });
onUnmounted(() => { /* ... (与上一版相同) ... */ });
</script>

<style>
/* ... (样式与上一版相同) ... */
.btn-leave-game-app {
  padding: 6px 12px;
  font-size: 0.85em;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  background-color: #6c757d;
  color: white;
  transition: background-color 0.2s;
  margin-left: 15px; /* 与房间状态信息隔开 */
  vertical-align: middle;
}
.btn-leave-game-app:hover:not(:disabled) {
  background-color: #545b62;
}
.btn-leave-game-app:disabled {
    background-color: #ccc; cursor: not-allowed; color: #666;
}
</style>
