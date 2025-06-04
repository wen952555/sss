<template>
  <div id="thirteen-water-app">
    <header>
      <h1>十三水在线对战</h1>
      <div class="header-info">
          <div v-if="gameStore.playerSessionId" class="session-info">
            会话ID: <small>{{ gameStore.playerSessionId.substring(0, 8) }}...</small>
            <button @click="copySessionId" title="复制会话ID (用于调试或恢复)" class="copy-btn">复制</button>
          </div>
          <div v-if="gameStore.gameCode" class="game-code-header-info">
            房间: 
            <strong class="game-code-display-header" title="点击复制房间码" @click="copyGameCodeHeader">
                {{ gameStore.gameCode }}
            </strong>
          </div>
      </div>
    </header>

    <main>
      <!-- 条件渲染：当游戏未激活且未结束时显示 GameSetup -->
      <!-- 当游戏激活或已结束时，显示游戏板 -->
      <GameSetup v-if="!gameStore.isGameActive && gameStore.gameState?.status !== 'finished'" />

      <div v-if="gameStore.isGameActive || gameStore.gameState?.status === 'finished'" class="game-board">
        <h2> 
          房间: {{ gameStore.gameCode }} 
          <span class="game-status">(状态: {{ localizedGameStatus }})</span>
          <button @click="handleLeaveGameApp" v-if="gameStore.gameId" class="btn-leave-game-app" :disabled="gameStore.loading">
            离开游戏
          </button>
        </h2>
        
        <div v-if="gameStore.loading && gameStore.isGameActive" class="loading-overlay"><p>加载中...</p></div>
        <div v-if="gameStore.error && gameStore.isGameActive" class="error-banner">错误: {{ gameStore.error }}</div>
        
        <div class="players-area" v-if="gameStore.players && gameStore.players.length > 0">
          <PlayerStatus 
            v-for="player in gameStore.players" 
            :key="player.id" 
            :player="player" 
            :game-status="gameStore.gameState?.status || 'unknown'" 
          />
        </div>
        <p v-else-if="gameStore.isGameActive && !gameStore.loading">等待其他玩家信息...</p> <!-- 如果游戏活跃但没有玩家数据显示 -->
        
        <PlayerHandInput 
          v-if="gameStore.isMyTurnToSubmit && gameStore.myCards && gameStore.myCards.length > 0" 
          :initial-cards="gameStore.myCards" 
          :is-submitted="myPlayerIsReady"
        />
        <div v-if="gameStore.gameState?.status === 'playing' && myPlayerIsReady && !gameStore.allPlayersReady" class="waiting-others">
            <p>你的牌型已提交，请等待其他玩家...</p>
        </div>
        
        <div v-if="gameStore.gameState?.status === 'finished'" class="game-over-section">
          <h3>本局结束！</h3>
          <button @click="handleNewRound" v-if="canStartNewRound" :disabled="gameStore.loading" class="btn-new-round">开始新一局</button>
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
import PlayerHandInput from './components/PlayerHandInput.vue'; // 确保这个组件是移除了拖拽的版本
import PlayerStatus from './components/PlayerStatus.vue';

const gameStore = useGameStore();

const localizedGameStatus = computed(() => { /* ... (与上一版相同) ... */ });
const myPlayerIsReady = computed(() => gameStore.myPlayerDetails?.is_ready || false);
const canStartNewRound = computed(() => gameStore.myPlayerDetails?.order === 1 && gameStore.gameState?.status === 'finished');

async function handleNewRound() { await gameStore.resetForNewRound(); }
async function copySessionId() { /* ... */ }
async function handleLeaveGameApp() { await gameStore.leaveGame(); }
async function copyGameCodeHeader() { /* ... */ }

onMounted(async () => {
    // console.log("[App.vue] onMounted. Calling tryRestoreSession.");
    // tryRestoreSession 会处理 localStorage 中的 gameId, gameCode, playerSessionId
    // 并调用 fetchGameState
    await gameStore.tryRestoreSession();
});
onUnmounted(() => {
  gameStore.stopPolling();
});
</script>

<style>
/* 样式与上一版相同 */
</style>
