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
  await performApiAction(() => gameStore.createGame(4)); // 固定创建4人局
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
.home-container { max-width: 550px; margin: 40px auto; padding: 30px 40px; text-align: center; background-color: #ffffff; border-radius: 12px; box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1); font-family: 'Helvetica Neue', Arial, sans-serif; }
.home-title { font-size: 2.2rem; color: #2c3e50; margin-bottom: 10px; font-weight: 600; }
.home-subtitle { font-size: 1rem; color: #7f8c8d; margin-bottom: 30px; }
.loading-indicator { color: #3498db; margin-bottom: 20px; font-weight: 500; }
.error-message { color: #e74c3c; background-color: #fdedec; border: 1px solid #f5c6cb; padding: 10px; border-radius: 6px; margin-bottom: 20px; font-size: 0.9rem; }
.action-box { margin-bottom: 25px; padding: 20px; background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; text-align: left; }
.action-title { font-size: 1.3rem; color: #34495e; margin-top: 0; margin-bottom: 15px; text-align: center; border-bottom: 1px solid #dee2e6; padding-bottom: 10px; }
.input-label { display: block; margin-bottom: 6px; font-weight: 500; color: #495057; font-size: 0.95rem; }
input[type="text"], select { width: 100%; padding: 12px 15px; margin-bottom: 15px; border: 1px solid #ced4da; border-radius: 6px; box-sizing: border-box; font-size: 1rem; transition: border-color 0.2s, box-shadow 0.2s; }
input[type="text"]:focus, select:focus { border-color: #80bdff; outline: 0; box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25); }
.action-button { width: 100%; padding: 12px 20px; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 1.05rem; font-weight: 500; transition: background-color 0.2s, transform 0.1s; letter-spacing: 0.5px; }
.action-button:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
.action-button:active:not(:disabled) { transform: translateY(0px); }
.primary-button { background-color: #007bff; }
.primary-button:hover:not(:disabled) { background-color: #0069d9; }
.secondary-button { background-color: #28a745; }
.secondary-button:hover:not(:disabled) { background-color: #218838; }
.action-button:disabled { background-color: #adb5bd; cursor: not-allowed; opacity: 0.7; }
.game-mode-info { font-size: 0.9rem; color: #555; margin-bottom: 15px; text-align: center; }
</style>
