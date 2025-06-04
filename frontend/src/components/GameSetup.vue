<template>
  <div class="game-setup-panel">
    <!-- ... (创建和加入表单部分与上一版相同) ... -->
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
      <!-- 新增：退出房间按钮 -->
      <button @click="handleLeaveGame" :disabled="gameStore.loading" class="btn-leave">
        退出房间
      </button>
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

async function handleCreateGame() { /* ... (与上一版相同) ... */ }
async function handleJoinGame() { /* ... (与上一版相同) ... */ }
async function triggerStartGame() { /* ... (与上一版相同) ... */ }

// 修改：之前的 leaveGame 方法名与 store action 冲突，改为 handleLeaveGame
async function handleLeaveGame() {
    // console.log("GameSetup: Attempting to leave game...");
    await gameStore.leaveGame();
    // leaveGame action 内部会调用 clearGameData，这将使 v-if="!gameStore.gameId" 为真，切换回初始界面
}

onMounted(() => { /* ... (与上一版相同) ... */ });
</script>

<style scoped>
/* 样式保持不变，此处省略 */
.game-setup-panel { /* ... */ }
.form-group { /* ... */ }
/* ... (其他样式) ... */
.btn-leave { background-color: #dc3545; color: white; } /* 已有此样式 */
.btn-leave:hover:not(:disabled) { background-color: #c82333; }
</style>
