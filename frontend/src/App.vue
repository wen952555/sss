<template>
  <div id="thirteen-water-app">
    <header>
      <h1>十三水在线对战</h1>
      <div class="header-info">
          <div v-if="gameStore.playerSessionId" class="session-info">
            会话ID: <small>{{ gameStore.playerSessionId.substring(0, 8) }}...</small>
            <button @click="copySessionId" title="复制会话ID" class="copy-btn">复制</button>
          </div>
          <div v-if="gameStore.gameCode" class="game-code-header-info">
            房间: <strong class="game-code-display-header" title="点击复制房间码" @click="copyGameCodeHeader">{{ gameStore.gameCode }}</strong>
          </div>
      </div>
    </header>

    <main>
      <!-- 条件渲染：GameSetup 在游戏等待时显示，或者在完全没有游戏会话时显示 -->
      <GameSetup v-if="gameStore.isGameWaiting || (!gameStore.gameId && !gameStore.isLoading)"/>

      <!-- 游戏板：当游戏正在进行或已结束时显示 -->
      <div v-if="gameStore.isGamePlaying || gameStore.isGameFinished" class="game-board">
        <h2 v-if="gameStore.gameCode && gameStore.gameState"> 
          房间: {{ gameStore.gameCode }} 
          <span class="game-status">(状态: {{ localizedGameStatus }})</span>
          <!-- 离开游戏按钮，在游戏板内总是可见（如果已加入游戏） -->
          <button @click="handleLeaveGameApp" v-if="gameStore.gameId" class="btn-leave-game-app" :disabled="gameStore.isLoading">
            离开游戏
          </button>
        </h2>
        <h2 v-else-if="gameStore.isLoading && gameStore.gameId">正在加载房间...</h2> <!-- 有gameId但gameState还在加载 -->
        
        <div v-if="gameStore.isLoading && (gameStore.isGamePlaying || gameStore.isGameFinished)" class="loading-overlay"><p>加载中...</p></div>
        <div v-if="gameStore.error && (gameStore.isGamePlaying || gameStore.isGameFinished)" class="error-banner">错误: {{ gameStore.error }}</div>
        
        <div class="players-area" v-if="gameStore.players && gameStore.players.length > 0">
          <PlayerStatus 
            v-for="player in gameStore.players" :key="player.id" :player="player" 
            :game-status="gameStore.gameState?.status || 'unknown'" 
          />
        </div>
        <p v-else-if="(gameStore.isGamePlaying || gameStore.isGameFinished) && !gameStore.isLoading">等待玩家信息...</p>
        
        <PlayerHandInput 
          v-if="gameStore.isGamePlaying && gameStore.myPlayerDetails && gameStore.myCards && gameStore.myCards.length > 0" 
          :initial-cards="gameStore.myCards" 
          :is-submitted="myPlayerIsReady"
        />
        <div v-if="gameStore.isGamePlaying && myPlayerIsReady && !gameStore.allPlayersReady" class="waiting-others">
            <p>你的牌型已提交，请等待其他玩家...</p>
        </div>
         <div v-else-if="gameStore.isGamePlaying && !gameStore.myPlayerDetails && !gameStore.isLoading">
            <p>正在加载您的手牌信息...</p>
        </div>
        
        <div v-if="gameStore.isGameFinished" class="game-over-section">
          <h3>本局结束！</h3>
          <button @click="handleNewRound" v-if="canStartNewRound" :disabled="gameStore.isLoading" class="btn-new-round">开始新一局</button>
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
import PlayerHandInput from './components/PlayerHandInput.vue';
import PlayerStatus from './components/PlayerStatus.vue';

const gameStore = useGameStore();
const localizedGameStatus = computed(() => {
  const statusMap = { waiting: '等待玩家', playing: '游戏中', finished: '已结束' };
  return statusMap[gameStore.gameState?.status] || gameStore.gameState?.status || '未知';
});
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
