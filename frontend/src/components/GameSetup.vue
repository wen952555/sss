<template>
  <div class="game-setup-panel">
    <div v-if="!gameStore.gameId">
      <h3>创建或加入房间</h3>
      <div class="form-group">
        <label for="playerName">你的昵称:</label>
        <input type="text" id="playerName" v-model="playerName" placeholder="例如：赌神阿三" />
      </div>
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
       <button @click="leaveGame" class="btn-leave">退出房间</button>
    </div>
    <div v-if="gameStore.error && !gameStore.loading" class="error-message">{{ gameStore.error }}</div>
    <div v-if="gameStore.loading" class="loading-message">操作中，请稍候...</div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useGameStore } from '../stores/gameStore';

const gameStore = useGameStore();
const gameCodeToJoin = ref('');
const playerName = ref(localStorage.getItem('playerName') || `玩家${Math.random().toString(36).substring(2, 6)}`);

// Debugging computed property
// const canActuallyStart = computed(() => gameStore.canStartGame);
// watch(canActuallyStart, (newVal) => {
//   console.log("Can start game computed:", newVal);
//   if (gameStore.myPlayerDetails) {
//     console.log("My order:", gameStore.myPlayerDetails.order);
//   }
//   console.log("Players length:", gameStore.players.length);
//   console.log("Game status:", gameStore.gameState?.status);
// });

async function handleCreateGame() {
  if (!playerName.value.trim()) {
    alert('请输入你的昵称！');
    return;
  }
  localStorage.setItem('playerName', playerName.value.trim());
  await gameStore.createGame();
}

async function handleJoinGame() {
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
}

async function triggerStartGame() {
    // console.log("Attempting to start game...");
    await gameStore.startGame();
}

function leaveGame() {
  gameStore.clearGameData();
  gameCodeToJoin.value = '';
}

onMounted(() => {
    if (gameStore.gameId && !gameStore.gameState) {
        // console.log("GameSetup onMounted: Attempting to restore session.");
        gameStore.tryRestoreSession();
    } else if (!gameStore.gameId) {
        // console.log("GameSetup onMounted: No gameId, clearing data.");
        gameStore.clearGameData(); // 确保在没有gameId时状态是干净的
    }
});
</script>

<style scoped>
/* 样式保持不变，此处省略 */
.game-setup-panel {
  background-color: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  margin-bottom: 20px;
}
.form-group {
  margin-bottom: 15px;
}
.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}
.form-group input[type="text"] {
  width: calc(100% - 22px);
  padding: 10px;
  border: 1px solid #ced4da;
  border-radius: 4px;
}
button {
  padding: 10px 15px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1em;
  margin-right: 10px;
  transition: background-color 0.2s ease;
}
.btn-primary { background-color: #007bff; color: white; }
.btn-primary:hover { background-color: #0056b3; }
.btn-secondary { background-color: #6c757d; color: white; }
.btn-secondary:hover { background-color: #545b62; }
.btn-start-game { background-color: #28a745; color: white; }
.btn-start-game:hover { background-color: #1e7e34; }
.btn-leave { background-color: #dc3545; color: white; }
.btn-leave:hover { background-color: #b02a37; }
button:disabled {
  background-color: #e9ecef;
  color: #6c757d;
  cursor: not-allowed;
}
hr { margin: 20px 0; border-top: 1px solid #dee2e6; }
.game-code {
  font-family: monospace;
  background-color: #e9ecef;
  padding: 2px 6px;
  border-radius: 3px;
  color: #c82333;
}
.error-message, .loading-message {
  margin-top: 15px;
  padding: 10px;
  border-radius: 4px;
}
.error-message { background-color: #f8d7da; color: #721c24; border: 1px solid #f5c6cb;}
.loading-message { background-color: #cce5ff; color: #004085; border: 1px solid #b8daff;}

ul { padding-left: 20px; }
li { margin-bottom: 5px; }
</style>
