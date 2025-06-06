<template>
  <div class="home-container">
    <h1 class="home-title">欢迎来到十三水</h1>
    <p class="home-subtitle">与AI对战或加入朋友的房间</p>

    <div v-if="gameStore.isLoading" class="loading-indicator">处理中...</div>
    <div v-if="apiError" class="error-message">{{ apiError }}</div>

    <div class="action-box">
      <label for="playerName" class="input-label">你的昵称 (1-10字符):</label>
      <input type="text" id="playerName" v-model.trim="playerNameInput" @input="updatePlayerName" placeholder="例如: 牌神无双"/>
    </div>

    <div class="action-box create-game-box">
      <h3 class="action-title">开始新游戏 (与AI对战)</h3>
      <p class="game-mode-info">默认创建4人牌局：您 vs 3个AI对手。</p>
      <!-- 暂时移除玩家人数选择，固定为4人（1人+3AI） -->
      <!--
      <label for="numPlayers" class="input-label">玩家人数:</label>
      <select id="numPlayers" v-model.number="numPlayersToCreate">
        <option value="2">2人 (您 vs 1 AI)</option>
        <option value="4">4人 (您 vs 3 AI)</option>
      </select>
      -->
      <button @click="createGameWithAi" :disabled="gameStore.isLoading || !isPlayerNameValid" class="action-button primary-button">
        开始4人AI局
      </button>
    </div>

    <div class="action-box join-game-box">
      <h3 class="action-title">加入已有游戏</h3>
      <label for="gameIdToJoin" class="input-label">游戏房间ID:</label>
      <input type="text" id="gameIdToJoin" v-model.trim="gameIdToJoin" placeholder="输入朋友给的房间ID"/>
      <button @click="joinGameHandler" :disabled="gameStore.isLoading || !gameIdToJoin || !isPlayerNameValid" class="action-button secondary-button">
        加入游戏房间
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useGameStore } from '../store/game';

const gameStore = useGameStore();
const playerNameInput = ref(gameStore.playerName || '');
// const numPlayersToCreate = ref(4); // 固定为4人局
const gameIdToJoin = ref('');
const apiError = ref(null);

const isPlayerNameValid = computed(() => playerNameInput.value.length > 0 && playerNameInput.value.length <= 10);

function updatePlayerName() {
  if (playerNameInput.value.length > 10) {
    playerNameInput.value = playerNameInput.value.substring(0, 10);
  }
}

async function performApiAction(actionFn) {
  apiError.value = null; gameStore.error = null;
  try {
    await actionFn();
    if (gameStore.error) apiError.value = gameStore.error;
  } catch (err) {
    apiError.value = err.message || '操作失败，请检查网络或稍后再试。';
  }
}

async function createGameWithAi() {
  if (!isPlayerNameValid.value) {
    apiError.value = "请输入1-10个字符的昵称。";
    return;
  }
  gameStore.setPlayerName(playerNameInput.value);
  // 固定创建4人局
  await performApiAction(() => gameStore.createGame(4));
}

async function joinGameHandler() {
  if (!isPlayerNameValid.value) {
    apiError.value = "请输入1-10个字符的昵称。"; return;
  }
  if (!gameIdToJoin.value) {
    apiError.value = "请输入要加入的游戏房间ID。"; return;
  }
  gameStore.setPlayerName(playerNameInput.value);
  await performApiAction(() => gameStore.joinGame(gameIdToJoin.value));
}
</script>

<style scoped>
/* ... (样式与上一版本 Home.vue 相同，可根据需要调整文字和按钮) ... */
.home-container { /* ... */ }
.home-title { /* ... */ }
.home-subtitle { /* ... */ }
.loading-indicator { /* ... */ }
.error-message { /* ... */ }
.action-box { /* ... */ }
.action-title { /* ... */ }
.input-label { /* ... */ }
input[type="text"], select { /* ... */ }
.action-button { /* ... */ }
.primary-button { /* ... */ }
.secondary-button { /* ... */ }
.action-button:disabled { /* ... */ }
.game-mode-info {
    font-size: 0.9rem;
    color: #555;
    margin-bottom: 15px;
    text-align: center;
}
</style>
