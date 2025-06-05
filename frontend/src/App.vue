<template>
  <div id="thirteen-water-app">
    <header>
      <!-- ... (与上一版相同) ... -->
    </header>

    <main>
      <GameSetup v-if="(!gameStore.isGameActive && !gameStore.isGameFinished) || gameStore.isGameWaiting"/>

      <div v-if="gameStore.isGameActive || gameStore.isGameFinished" class="game-board">
        <h2 v-if="gameStore.gameCode && gameStore.gameState"> 
          <!-- ... (与上一版相同) ... -->
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
          v-if="gameStore.gameState?.status === 'playing' && gameStore.myPlayerDetails && gameStore.myCards && gameStore.myCards.length > 0" 
          :initial-cards="gameStore.myCards" 
          :is-submitted="myPlayerIsReady" <!-- 确保传递 isSubmitted -->
        />
        <div v-if="gameStore.gameState?.status === 'playing' && myPlayerIsReady && !gameStore.allPlayersReady" class="waiting-others">
            <p>你的牌型已提交，请等待其他玩家...</p>
        </div>
         <div v-else-if="gameStore.gameState?.status === 'playing' && !gameStore.myPlayerDetails && gameStore.isGameActive && !gameStore.isGameLoading">
            <p>正在加载您的手牌信息...</p> <!-- 玩家详情还未加载时的提示 -->
        </div>
        
        <div v-if="gameStore.isGameFinished" class="game-over-section">
          <!-- ... (与上一版相同) ... -->
        </div>
      </div>
    </main>
    <footer>
      <p>简易十三水游戏 - Vue & PHP</p>
    </footer>
  </div>
</template>

<script setup>
// ... (与上一版相同，确保 myPlayerIsReady 计算属性存在) ...
import { computed, onMounted, onUnmounted } from 'vue';
import { useGameStore } from './stores/gameStore';
import GameSetup from './components/GameSetup.vue';
import PlayerHandInput from './components/PlayerHandInput.vue';
import PlayerStatus from './components/PlayerStatus.vue';

const gameStore = useGameStore();
const localizedGameStatus = computed(() => { /* ... */ });
const myPlayerIsReady = computed(() => gameStore.myPlayerDetails?.is_ready || false); // 这个用于 isSubmitted
const canStartNewRound = computed(() => gameStore.myPlayerDetails?.order === 1 && gameStore.isGameFinished);
// ... (其他方法)
onMounted(async () => { await gameStore.tryRestoreSession(); });
onUnmounted(() => { gameStore.stopPolling(); });
</script>

<style>
/* 样式与上一版相同 */
</style>
