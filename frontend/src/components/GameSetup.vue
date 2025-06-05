<template>
  <div class="game-setup-panel">
    <div v-if="!gameStore.gameId && !gameStore.gameCode && !gameStore.isGameLoading">
      <h3>创建或加入房间</h3>
      <div class="form-group">
        <label for="playerName">你的昵称:</label>
        <input type="text" id="playerName" v-model="playerName" placeholder="例如：赌神阿三" />
      </div>
      <button @click="handleCreateGame" :disabled="gameStore.isGameLoading" class="btn-primary">创建新房间</button>
      <hr />
      <!-- ... (加入房间表单与上一轮相同) ... -->
    </div>

    <!-- ... (等待界面与上一轮相同) ... -->
    <div v-if="gameStore.isGameWaiting" class="waiting-room-interface">
        <!-- ... -->
    </div>
    
    <div v-if="gameStore.error && !gameStore.isGameLoading" class="error-message">{{ gameStore.error }}</div>
    <div v-if="(!gameStore.gameId || !gameStore.gameCode) && gameStore.isGameLoading" class="loading-message">操作中，请稍候...</div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'; // 确保导入 computed
import { useGameStore } from '../stores/gameStore';

const gameStore = useGameStore();
const gameCodeToJoin = ref('');
const playerName = ref(localStorage.getItem('playerName') || `玩家${Math.random().toString(36).substring(2, 6)}`);

const showWaitingInterface = computed(() => { /* ... */ });

async function handleCreateGame() {
  console.log("[GameSetup.vue DEBUG] handleCreateGame called. Player name:", playerName.value);
  if (!playerName.value.trim()) { alert('请输入你的昵称！'); return; }
  localStorage.setItem('playerName', playerName.value.trim());
  await gameStore.createGame(); // 默认4人
  console.log(`[GameSetup.vue DEBUG] gameStore.createGame() finished. Game ID: ${gameStore.gameId}, Game Code: ${gameStore.gameCode}, Error: ${gameStore.error}`);
}
async function handleJoinGame() { /* ... (与上一轮相同，可加入日志) ... */ }
async function triggerStartGame() { /* ... (与上一轮相同，可加入日志) ... */ }
async function handleLeaveGame() { /* ... (与上一版相同，可加入日志) ... */ }
async function copyGameCode() { /* ... (与上一版相同) ... */ }

onMounted(async () => {
    console.log(`[GameSetup.vue DEBUG] onMounted. GameId: ${gameStore.gameId}, GameCode: ${gameStore.gameCode}, PlayerSessionId: ${gameStore.playerSessionId}`);
    // ... (onMounted 逻辑与上一轮相同)
});
</script>

<style scoped>
/* 样式与上一版相同 */
</style>
