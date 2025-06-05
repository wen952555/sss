<template>
  <div class="game-setup-panel">
    <!-- 创建/加入表单: 仅当没有 gameId 和 gameCode，并且不处于加载状态时显示 -->
    <div v-if="!gameStore.gameId && !gameStore.gameCode && !gameStore.isLoading">
      <h3>创建或加入房间</h3>
      <div class="form-group">
        <label for="playerName">你的昵称:</label>
        <input type="text" id="playerName" v-model="playerName" placeholder="例如：赌神阿三" />
      </div>
      <button @click="handleCreateGame" :disabled="gameStore.isLoading" class="btn-primary">创建新房间</button>
      <hr />
      <div class="form-group">
        <label for="gameCodeInput">房间码:</label>
        <input type="text" id="gameCodeInput" v-model="gameCodeToJoin" placeholder="输入房间码加入" />
      </div>
      <button @click="handleJoinGame" :disabled="gameStore.isLoading || !gameCodeToJoin.trim()" class="btn-secondary">加入房间</button>
    </div>

    <!-- 等待玩家加入界面: 使用 isGameWaiting getter -->
    <div v-if="gameStore.isGameWaiting" class="waiting-room-interface">
      <h3>
        等待玩家加入 - 房间码: 
        <strong class="game-code-display" title="点击复制房间码" @click="copyGameCode" v-if="gameStore.gameCode">
            {{ gameStore.gameCode }}
        </strong>
        <span v-else class="game-code-loading">获取中...</span>
      </h3>
      <p>
        将房间码分享给好友邀请他们加入！ 
        <span v-if="gameStore.gameState && gameStore.gameState.max_players !== undefined">
            (当前 {{ gameStore.players.length }} / {{ gameStore.gameState.max_players }} 人)
        </span>
      </p>
      
      <div v-if="gameStore.players && gameStore.players.length > 0">
          <p>玩家列表:</p>
          <ul>
            <li v-for="player in gameStore.players" :key="player.id" :class="{'is-me-list-item': player.is_me}">
                {{ player.name }} 
                <span v-if="player.is_me">(你)</span>
                <span v-if="player.order === 1 && player.is_me"> (房主)</span>
                <span v-else-if="player.order === 1"> (房主)</span>
            </li>
          </ul>
      </div>
      <p v-else-if="!gameStore.isLoading">
          正在加载玩家列表或房间内当前只有您...
      </p>
      
      <!-- 开始游戏按钮 -->
      <button
        v-if="gameStore.canStartGame"  
        @click="triggerStartGame" 
        :disabled="gameStore.isLoading"
        class="btn-start-game"
      >
        开始游戏 ({{ gameStore.players.length }} 人)
      </button>
      <!-- 提示信息 -->
      <div v-else-if="gameStore.gameState && !gameStore.isLoading">
          <p v-if="gameStore.myPlayerDetails && gameStore.myPlayerDetails.order === 1 && gameStore.players.length < gameStore.gameState.max_players">
              等待更多玩家加入 (还差 {{ gameStore.gameState.max_players - gameStore.players.length }} 人)...
          </p>
          <p v-else-if="gameStore.players.length >= gameStore.gameState.max_players && (!gameStore.myPlayerDetails || gameStore.myPlayerDetails.order !== 1)">
              房间已满，等待房主开始游戏...
          </p>
           <p v-else-if="gameStore.players.length < 2 && gameStore.myPlayerDetails && gameStore.myPlayerDetails.order === 1">
              至少需要2名玩家才能开始。
          </p>
      </div>
      
      <!-- 退出房间按钮，在等待界面总是应该可以退出 -->
      <button @click="handleLeaveGame" :disabled="gameStore.isLoading" class="btn-leave">
        退出房间
      </button>
    </div>
    
    <!-- 初始加载状态 (有gameId但gameState未加载) -->
    <div v-else-if="gameStore.gameId && gameStore.gameCode && !gameStore.gameState && gameStore.isLoading">
        <p class="loading-message">正在加载房间信息...</p>
    </div>
    <!-- 如果游戏已开始或结束，GameSetup不应显示主要内容，App.vue会处理 -->
     <div v-else-if="gameStore.isGamePlaying || gameStore.isGameFinished">
        <!-- <p>正在进入游戏...</p>  -->
        <!-- 此处 GameSetup 应该不显示任何东西，由 App.vue 控制游戏板的显示 -->
    </div>

    <!-- 全局错误和加载提示 -->
    <div v-if="gameStore.error && !gameStore.isLoading" class="error-message">{{ gameStore.error }}</div>
    <div v-if="(!gameStore.gameId || !gameStore.gameCode) && gameStore.isLoading" class="loading-message">操作中，请稍候...</div>
  </div>
</template>

<script setup>
// ... (script setup 与上一版相同) ...
import { ref, onMounted, computed } from 'vue';
import { useGameStore } from '../stores/gameStore';
const gameStore = useGameStore();
const gameCodeToJoin = ref('');
const playerName = ref(localStorage.getItem('playerName') || `玩家${Math.random().toString(36).substring(2, 6)}`);
async function handleCreateGame() { await gameStore.createGame(); }
async function handleJoinGame() { await gameStore.joinGame(gameCodeToJoin.value.trim(), playerName.value.trim()); }
async function triggerStartGame() { await gameStore.startGame(); }
async function handleLeaveGame() { await gameStore.leaveGame(); }
async function copyGameCode() { /* ... */ }
onMounted(async () => {
    // console.log(`[GameSetup] onMounted. gameId: ${gameStore.gameId}, gameCode: ${gameStore.gameCode}`);
    if (gameStore.gameId && gameStore.gameCode) {
        if (!gameStore.gameState || (gameStore.gameState.id !== parseInt(gameStore.gameId))) {
            await gameStore.tryRestoreSession();
        } else if ((gameStore.isGameActive || gameStore.isGameWaiting) && !gameStore.pollingInterval) {
            gameStore.startPolling();
        }
    } else {
        gameStore.clearGameData();
    }
});
</script>

<style scoped>
/* 样式与上一版相同 */
.is-me-list-item { font-weight: bold; color: #007bff; }
</style>
