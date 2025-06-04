<template>
  <div class="game-setup-panel">
    <div v-if="!gameStore.gameId">
      <h3>创建或加入房间</h3>
      <div class="form-group">
        <label for="playerName">你的昵称:</label>
        <input type="text" id="playerName" v-model="playerName" placeholder="例如：赌神阿三" />
      </div>
      <!-- 创建房间按钮 -->
      <button @click="handleCreateGame" :disabled="gameStore.loading" class="btn-primary">创建新房间</button>
      <hr />
      <div class="form-group">
        <label for="gameCodeInput">房间码:</label>
        <input type="text" id="gameCodeInput" v-model="gameCodeToJoin" placeholder="输入房间码加入" />
      </div>
      <button @click="handleJoinGame" :disabled="gameStore.loading || !gameCodeToJoin.trim()" class="btn-secondary">加入房间</button>
    </div>

    <div v-if="gameStore.gameId && gameStore.gameState?.status === 'waiting'">
      <h3>等待开始 - 房间码: <strong class="game-code">{{ gameStore.gameCode }}</strong></h3>
      <p>将房间码分享给好友邀请他们加入！ (当前 {{ gameStore.players.length }} / {{ gameStore.gameState.max_players }} 人)</p>
      <p>玩家列表:</p>
      <ul>
        <li v-for="player in gameStore.players" :key="player.id">
            {{ player.name }}
            <span v-if="player.is_me">(你)</span>
            <span v-if="player.order === 1 && !player.is_me">(房主)</span>
            <span v-if="player.order === 1 && player.is_me">(你, 房主)</span>
        </li>
      </ul>
      <button
        v-if="gameStore.canStartGame"
        @click="triggerStartGame"
        :disabled="gameStore.loading"
        class="btn-start-game"
      >
        开始游戏 ({{ gameStore.players.length }}人)
      </button>
      <button @click="handleLeaveGame" :disabled="gameStore.loading" class="btn-leave">
        退出房间
      </button>
    </div>
    <div v-if="gameStore.error && !gameStore.loading" class="error-message">{{ gameStore.error }}</div>
    <div v-if="gameStore.loading" class="loading-message">操作中，请稍候...</div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'; // Removed unused 'computed'
import { useGameStore } from '../stores/gameStore';

const gameStore = useGameStore();
const gameCodeToJoin = ref('');
const playerName = ref(localStorage.getItem('playerName') || `玩家${Math.random().toString(36).substring(2, 6)}`);

async function handleCreateGame() {
  console.log("[GameSetup.vue] handleCreateGame called. Player name:", playerName.value); // DEBUG LOG
  if (!playerName.value.trim()) {
    alert('请输入你的昵称！');
    return;
  }
  localStorage.setItem('playerName', playerName.value.trim());
  await gameStore.createGame(); // 默认创建4人房
  // 你可以传递一个参数来创建不同人数的房间，例如：await gameStore.createGame(2);
  console.log("[GameSetup.vue] gameStore.createGame() finished. Game ID:", gameStore.gameId, "Error:", gameStore.error); // DEBUG LOG
}

async function handleJoinGame() {
  console.log("[GameSetup.vue] handleJoinGame called. Game code:", gameCodeToJoin.value, "Player name:", playerName.value); // DEBUG LOG
  if (!gameCodeToJoin.value.trim()) {
    alert('请输入房间码！');
    return;
  }
  if (!playerName.value.trim()) {
    alert('请输入你的昵称！');
    return;
  }
  localStorage.setItem('playerName', playerName.value.trim());
  await gameStore.joinGame(gameCodeToJoin.value.trim(), playerName.value.trim());
  console.log("[GameSetup.vue] gameStore.joinGame() finished. Game ID:", gameStore.gameId, "Error:", gameStore.error); // DEBUG LOG
}

async function triggerStartGame() {
    console.log("[GameSetup.vue] triggerStartGame called."); // DEBUG LOG
    await gameStore.startGame();
    console.log("[GameSetup.vue] gameStore.startGame() finished. Error:", gameStore.error); // DEBUG LOG
}

async function handleLeaveGame() {
    console.log("[GameSetup.vue] handleLeaveGame called."); // DEBUG LOG
    await gameStore.leaveGame();
    console.log("[GameSetup.vue] gameStore.leaveGame() finished. Error:", gameStore.error); // DEBUG LOG
}

onMounted(() => {
    console.log("[GameSetup.vue] onMounted. Current gameId:", gameStore.gameId, "Current gameState:", gameStore.gameState); // DEBUG LOG
    if (gameStore.gameId && !gameStore.gameState) {
        gameStore.tryRestoreSession();
    } else if (!gameStore.gameId) {
        gameStore.clearGameData();
    }
});
</script>

<style scoped>
/* 样式与上一版相同，此处省略 */
.game-setup-panel { background-color: #f8f9fa; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin-bottom: 20px; }
.form-group { margin-bottom: 15px; }
.form-group label { display: block; margin-bottom: 5px; font-weight: bold; }
.form-group input[type="text"] { width: calc(100% - 22px); padding: 10px; border: 1px solid #ced4da; border-radius: 4px; }
button { padding: 10px 15px; border: none; border-radius: 4px; cursor: pointer; font-size: 1em; margin-right: 10px; transition: background-color 0.2s ease; }
.btn-primary { background-color: #007bff; color: white; }
.btn-primary:hover { background-color: #0056b3; }
.btn-secondary { background-color: #6c757d; color: white; }
.btn-secondary:hover { background-color: #545b62; }
.btn-start-game { background-color: #28a745; color: white; }
.btn-start-game:hover { background-color: #1e7e34; }
.btn-leave { background-color: #dc3545; color: white; }
.btn-leave:hover:not(:disabled) { background-color: #c82333; }
button:disabled { background-color: #e9ecef; color: #6c757d; cursor: not-allowed; }
hr { margin: 20px 0; border-top: 1px solid #dee2e6; }
.game-code { font-family: monospace; background-color: #e9ecef; padding: 2px 6px; border-radius: 3px; color: #c82333; }
.error-message, .loading-message { margin-top: 15px; padding: 10px; border-radius: 4px; }
.error-message { background-color: #f8d7da; color: #721c24; border: 1px solid #f5c6cb;}
.loading-message { background-color: #cce5ff; color: #004085; border: 1px solid #b8daff;}
ul { padding-left: 20px; }
li { margin-bottom: 5px; }
</style>
