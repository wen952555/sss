<template>
  <div class="home-container">
    <h1 class="home-title">欢迎来到十三水</h1>
    <p class="home-subtitle">创建或加入游戏房间开始对战</p>

    <div v-if="gameStore.isLoading" class="loading-indicator">处理中...</div>
    <div v-if="apiError" class="error-message">{{ apiError }}</div>

    <div class="action-box">
      <label for="playerName" class="input-label">你的昵称:</label>
      <input type="text" id="playerName" v-model.trim="playerNameInput" @input="updatePlayerName" placeholder="例如: 牌神"/>
    </div>

    <div class="action-box create-game-box">
      <h3 class="action-title">创建新游戏</h3>
      <label for="numPlayers" class="input-label">玩家人数:</label>
      <select id="numPlayers" v-model.number="numPlayersToCreate">
        <option value="2">2人</option>
        <option value="3">3人</option>
        <option value="4">4人</option>
      </select>
      <button @click="createGameHandler" :disabled="gameStore.isLoading || !isPlayerNameValid" class="action-button primary-button">
        创建游戏房间
      </button>
    </div>

    <div class="action-box join-game-box">
      <h3 class="action-title">加入已有游戏</h3>
      <label for="gameIdToJoin" class="input-label">游戏房间ID:</label>
      <input type="text" id="gameIdToJoin" v-model.trim="gameIdToJoin" placeholder="输入房间ID"/>
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
const playerNameInput = ref(gameStore.playerName || ''); // 从 store 初始化或为空
const numPlayersToCreate = ref(2); // 默认创建2人局
const gameIdToJoin = ref('');
const apiError = ref(null); // 用于显示API调用相关的错误

const isPlayerNameValid = computed(() => playerNameInput.value.length > 0 && playerNameInput.value.length <= 10);

function updatePlayerName() {
  if (playerNameInput.value.length > 10) {
    playerNameInput.value = playerNameInput.value.substring(0, 10); // 限制长度
  }
  // 玩家输入时不清空API错误，只在操作时清空
}

async function performApiAction(actionFn) {
  apiError.value = null; // 清除之前的错误
  gameStore.error = null; // 也清除 store 中的错误，因为这个页面主要关注直接的 API 错误
  try {
    await actionFn();
    if (gameStore.error) { // 如果 store 中在 action 执行后设置了 error
      apiError.value = gameStore.error;
    }
  } catch (err) {
    // 这个 catch 通常在 api.js 的 request 方法中已经处理并抛出了简化错误
    // 但如果 actionFn 内部有其他未捕获的错误，这里会捕获
    apiError.value = err.message || '操作失败，请检查网络或稍后再试。';
  }
}

async function createGameHandler() {
  if (!isPlayerNameValid.value) {
    apiError.value = "请输入1-10个字符的昵称。";
    return;
  }
  gameStore.setPlayerName(playerNameInput.value);
  await performApiAction(() => gameStore.createGame(numPlayersToCreate.value));
}

async function joinGameHandler() {
  if (!isPlayerNameValid.value) {
    apiError.value = "请输入1-10个字符的昵称。";
    return;
  }
  if (!gameIdToJoin.value) {
    apiError.value = "请输入要加入的游戏房间ID。";
    return;
  }
  gameStore.setPlayerName(playerNameInput.value);
  await performApiAction(() => gameStore.joinGame(gameIdToJoin.value));
}
</script>

<style scoped>
.home-container {
  max-width: 550px;
  margin: 40px auto;
  padding: 30px 40px;
  text-align: center;
  background-color: #ffffff;
  border-radius: 12px;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
  font-family: 'Helvetica Neue', Arial, sans-serif;
}

.home-title {
  font-size: 2.2rem;
  color: #2c3e50; /* 深蓝灰色 */
  margin-bottom: 10px;
  font-weight: 600;
}

.home-subtitle {
  font-size: 1rem;
  color: #7f8c8d; /* 冷灰色 */
  margin-bottom: 30px;
}

.loading-indicator {
  color: #3498db; /* 亮蓝色 */
  margin-bottom: 20px;
  font-weight: 500;
}

.error-message {
  color: #e74c3c; /* 亮红色 */
  background-color: #fdedec;
  border: 1px solid #f5c6cb;
  padding: 10px;
  border-radius: 6px;
  margin-bottom: 20px;
  font-size: 0.9rem;
}

.action-box {
  margin-bottom: 25px;
  padding: 20px;
  background-color: #f8f9fa; /* 非常浅的灰色 */
  border: 1px solid #e9ecef; /* 浅边框 */
  border-radius: 8px;
  text-align: left; /* 内部元素左对齐 */
}

.action-title {
  font-size: 1.3rem;
  color: #34495e; /* 较深的蓝灰色 */
  margin-top: 0;
  margin-bottom: 15px;
  text-align: center;
  border-bottom: 1px solid #dee2e6;
  padding-bottom: 10px;
}

.input-label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  color: #495057; /* 深灰色 */
  font-size: 0.95rem;
}

input[type="text"],
select {
  width: 100%;
  padding: 12px 15px;
  margin-bottom: 15px;
  border: 1px solid #ced4da; /* 标准边框色 */
  border-radius: 6px;
  box-sizing: border-box; /*确保 padding 不会撑大宽度 */
  font-size: 1rem;
  transition: border-color 0.2s, box-shadow 0.2s;
}

input[type="text"]:focus,
select:focus {
  border-color: #80bdff; /* 聚焦时蓝色边框 */
  outline: 0;
  box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25); /* 聚焦时蓝色阴影 */
}

.action-button {
  width: 100%;
  padding: 12px 20px;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1.05rem;
  font-weight: 500;
  transition: background-color 0.2s, transform 0.1s;
  letter-spacing: 0.5px;
}

.action-button:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
}
.action-button:active:not(:disabled) {
  transform: translateY(0px);
}


.primary-button {
  background-color: #007bff; /* 主按钮蓝色 */
}
.primary-button:hover:not(:disabled) {
  background-color: #0069d9;
}

.secondary-button {
  background-color: #28a745; /* 次按钮绿色 */
}
.secondary-button:hover:not(:disabled) {
  background-color: #218838;
}

.action-button:disabled {
  background-color: #adb5bd; /* 禁用时灰色 */
  cursor: not-allowed;
  opacity: 0.7;
}
</style>
