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
            房间: <strong class="game-code-display-header" title="点击复制房间码" @click="copyGameCodeHeader">{{ gameStore.gameCode }}</strong>
          </div>
      </div>
    </header>

    <main>
      <!-- 条件渲染：当游戏未激活且未结束时显示 GameSetup -->
      <GameSetup v-if="(!gameStore.isGameActive && !gameStore.isGameFinished) || gameStore.isGameWaiting"/>

      <!-- 当游戏已激活(例如 'playing')或已结束时，显示游戏板 -->
      <div v-if="gameStore.isGameActive || gameStore.isGameFinished" class="game-board">
        <h2 v-if="gameStore.gameCode && gameStore.gameState"> 
          房间: {{ gameStore.gameCode }} 
          <span class="game-status">(状态: {{ localizedGameStatus }})</span>
          <button @click="handleLeaveGameApp" v-if="gameStore.gameId" class="btn-leave-game-app" :disabled="gameStore.isGameLoading">
            离开游戏
          </button>
        </h2>
        <h2 v-else-if="gameStore.isGameLoading">正在加载房间...</h2>
        
        <div v-if="gameStore.isGameLoading && (gameStore.isGameActive || gameStore.isGameFinished)" class="loading-overlay"><p>加载中...</p></div>
        <div v-if="gameStore.error && (gameStore.isGameActive || gameStore.isGameFinished)" class="error-banner">错误: {{ gameStore.error }}</div>
        
        <div class="players-area" v-if="gameStore.players && gameStore.players.length > 0">
          <PlayerStatus 
            v-for="player in gameStore.players" :key="player.id" :player="player" 
            :game-status="gameStore.gameState?.status || 'unknown'" 
          />
        </div>
        <p v-else-if="(gameStore.isGameActive || gameStore.isGameFinished) && !gameStore.isGameLoading">等待玩家信息...</p>
        
        <PlayerHandInput 
          v-if="gameStore.isMyTurnToSubmit && gameStore.myCards && gameStore.myCards.length > 0" 
          :initial-cards="gameStore.myCards" :is-submitted="myPlayerIsReady"
        />
        <div v-if="gameStore.gameState?.status === 'playing' && myPlayerIsReady && !gameStore.allPlayersReady" class="waiting-others">
            <p>你的牌型已提交，请等待其他玩家...</p>
        </div>
        
        <div v-if="gameStore.isGameFinished" class="game-over-section">
          <h3>本局结束！</h3>
          <button @click="handleNewRound" v-if="canStartNewRound" :disabled="gameStore.isGameLoading" class="btn-new-round">开始新一局</button>
        </div>

      </div>
    </main>
    <footer>
      <p>简易十三水游戏 - Vue & PHP</p>
    </footer>
  </div>
</template>

<script setup>
// ... (与上一版相同，确保 onMounted 调用 tryRestoreSession) ...
import { computed, onMounted, onUnmounted } from 'vue';
import { useGameStore } from './stores/gameStore';
import GameSetup from './components/GameSetup.vue';
import PlayerHandInput from './components/PlayerHandInput.vue';
import PlayerStatus from './components/PlayerStatus.vue';

const gameStore = useGameStore();
const localizedGameStatus = computed(() => { /* ... */ });
const myPlayerIsReady = computed(() => gameStore.myPlayerDetails?.is_ready || false);
const canStartNewRound = computed(() => gameStore.myPlayerDetails?.order === 1 && gameStore.isGameFinished);
async function handleNewRound() { await gameStore.resetForNewRound(); }
async function copySessionId() { /* ... */ }
async function handleLeaveGameApp() { await gameStore.leaveGame(); }
async function copyGameCodeHeader() { /* ... */ }

onMounted(async () => {
    await gameStore.tryRestoreSession();
});
onUnmounted(() => { gameStore.stopPolling(); });
</script>

<style>
/* 样式与上一版相同 */
</style>
