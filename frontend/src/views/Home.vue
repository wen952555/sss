<template>
  <div class="home-container">
    <h1>十三水游戏</h1>
    <div v-if="gameStore.isLoading" class="loading-indicator">处理中...</div>
    <div v-if="gameStore.error" class="error-message">{{ gameStore.error }}</div>

    <div class="action-form">
      <label for="playerName">你的昵称:</label>
      <input type="text" id="playerName" v-model="playerNameInput" @input="updatePlayerName" />
    </div>

    <div class="action-form">
      <h3>创建新游戏</h3>
      <label for="numPlayers">玩家人数 (2-4):</label>
      <select id="numPlayers" v-model.number="numPlayersToCreate">
        <option value="2">2人</option>
        <option value="3">3人</option>
        <option value="4">4人</option>
      </select>
      <button @click="createGameHandler" :disabled="gameStore.isLoading || !playerNameInput.trim()">创建游戏</button>
    </div>

    <div class="action-form">
      <h3>加入已有游戏</h3>
      <label for="gameIdToJoin">游戏ID:</label>
      <input type="text" id="gameIdToJoin" v-model="gameIdToJoin" />
      <button @click="joinGameHandler" :disabled="gameStore.isLoading || !gameIdToJoin.trim() || !playerNameInput.trim()">加入游戏</button>
    </div>

  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useGameStore } from '../store/game';

const gameStore = useGameStore();
const playerNameInput = ref(gameStore.playerName || '玩家');
const numPlayersToCreate = ref(4);
const gameIdToJoin = ref('');

function updatePlayerName() {
    gameStore.setPlayerName(playerNameInput.value);
}

async function createGameHandler() {
  if (!playerNameInput.value.trim()) {
    gameStore.error = "请输入昵称";
    return;
  }
  gameStore.setPlayerName(playerNameInput.value); // 确保store里的名字是最新的
  await gameStore.createGame(numPlayersToCreate.value);
}

async function joinGameHandler() {
  if (!playerNameInput.value.trim()) {
    gameStore.error = "请输入昵称";
    return;
  }
  if (!gameIdToJoin.value.trim()) {
    gameStore.error = "请输入游戏ID";
    return;
  }
  gameStore.setPlayerName(playerNameInput.value);
  await gameStore.joinGame(gameIdToJoin.value);
}
</script>

<style scoped>
.home-container {
  max-width: 500px;
  margin: 50px auto;
  padding: 20px;
  text-align: center;
  border: 1px solid #ccc;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}
.loading-indicator {
  color: #007bff;
  margin-bottom: 15px;
}
.error-message {
  color: red;
  margin-bottom: 15px;
}
.action-form {
  margin-bottom: 25px;
  padding: 15px;
  border: 1px solid #eee;
  border-radius: 5px;
}
.action-form h3 {
  margin-top: 0;
}
.action-form label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}
.action-form input[type="text"],
.action-form select {
  width: calc(100% - 22px);
  padding: 10px;
  margin-bottom: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
}
.action-form button {
  padding: 10px 20px;
  background-color: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}
.action-form button:disabled {
  background-color: #ccc;
}
.action-form button:hover:not(:disabled) {
  background-color: #218838;
}
</style>
