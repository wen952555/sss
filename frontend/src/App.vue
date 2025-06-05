<template>
  <div id="thirteen-water-app">
    <header> <!-- ... (与上一版相同) ... --> </header>
    <main>
      <GameSetup v-if="(!gameStore.isGameActive && !gameStore.isGameFinished) || gameStore.isGameWaiting"/>
      <div v-if="gameStore.isGamePlaying || gameStore.isGameFinished" class="game-board">
        <!-- ... (h2 和其他部分与上一版相同) ... -->
        
        <PlayerHandInput 
          v-if="gameStore.isGamePlaying && gameStore.myPlayerDetails && !gameStore.myPlayerDetails.is_ready && gameStore.myCards && gameStore.myCards.length > 0" 
          :initial-cards="gameStore.myCards" 
          :is-submitted="myPlayerIsReady" <!-- myPlayerIsReady computed prop -->
        />
        <!-- 提示：如果正在游戏，但手牌未加载 (myCards为空数组，但游戏已开始) -->
        <div v-else-if="gameStore.isGamePlaying && gameStore.myPlayerDetails && !gameStore.myPlayerDetails.is_ready && (!gameStore.myCards || gameStore.myCards.length === 0) && !gameStore.isLoading">
            <p class="loading-message">正在加载您的手牌...</p>
        </div>

        <div v-if="gameStore.isGamePlaying && myPlayerIsReady && !gameStore.allPlayersReady" class="waiting-others">
            <p>你的牌型已提交，请等待其他玩家...</p>
        </div>
        <!-- ... (其他部分与上一版相同) ... -->
      </div>
    </main>
    <footer> <!-- ... (与上一版相同) ... --> </footer>
  </div>
</template>

<script setup>
// ... (与上一版相同，确保 myPlayerIsReady 计算属性正确) ...
import { computed, onMounted, onUnmounted } from 'vue';
import { useGameStore } from './stores/gameStore';
import GameSetup from './components/GameSetup.vue';
import PlayerHandInput from './components/PlayerHandInput.vue';
import PlayerStatus from './components/PlayerStatus.vue';

const gameStore = useGameStore();
const myPlayerIsReady = computed(() => gameStore.myPlayerDetails?.is_ready || false);
// ... (其他计算属性和方法)
onMounted(async () => { await gameStore.tryRestoreSession(); });
onUnmounted(() => { gameStore.stopPolling(); });
</script>

<style> /* ... (与上一版相同) ... */ </style>
