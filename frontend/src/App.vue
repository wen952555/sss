<template>
  <div id="thirteen-water-app">
    <header>
      <h1>十三水在线对战</h1>
      <div v-if="gameStore.playerSessionId" class="session-info">
        会话ID: <small>{{ gameStore.playerSessionId.substring(0, 8) }}...</small>
        <button @click="copySessionId" title="复制会话ID (用于调试或恢复)">复制</button>
      </div>
    </header>

    <main>
      <GameSetup v-if="!gameStore.isGameActive && gameStore.gameState?.status !== 'finished'" />

      <div v-if="gameStore.isGameActive || gameStore.gameState?.status === 'finished'" class="game-board">
        <h2>
          房间: {{ gameStore.gameCode }}
          <span class="game-status">(状态: {{ localizedGameStatus }})</span>
        </h2>

        <div v-if="gameStore.loading && gameStore.isGameActive" class="loading-overlay">
          <p>加载中...</p>
        </div>
        <div v-if="gameStore.error && gameStore.isGameActive" class="error-banner">
          错误: {{ gameStore.error }}
        </div>

        <div class="players-area">
          <PlayerStatus
            v-for="player in gameStore.players"
            :key="player.id"
            :player="player"
            :game-status="gameStore.gameState?.status || 'unknown'"
          />
        </div>

        <PlayerHandInput
          v-if="gameStore.isMyTurnToSubmit && gameStore.myCards.length > 0"
          :initial-cards="gameStore.myCards"
          :is-submitted="myPlayerIsReady"
        />
        <div v-if="gameStore.gameState?.status === 'playing' && myPlayerIsReady && !gameStore.allPlayersReady" class="waiting-others">
          <p>你的牌型已提交，请等待其他玩家...</p>
        </div>


        <div v-if="gameStore.gameState?.status === 'finished'" class="game-over-section">
          <h3>本局结束！</h3>
          <!-- 可以在这里显示更详细的结算信息 -->
          <button @click="handleNewRound" v-if="canStartNewRound" :disabled="gameStore.loading" class="btn-new-round">
            开始新一局 (同一房间)
          </button>
          <button @click="gameStore.clearGameData()" class="btn-leave-game">离开房间</button>
        </div>
      </div>
    </main>
    <footer>
      <p>简易十三水游戏 - Vue & PHP</p>
    </footer>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted } from 'vue';
import { useGameStore } from './stores/gameStore';
import GameSetup from './components/GameSetup.vue';
import PlayerHandInput from './components/PlayerHandInput.vue';
import PlayerStatus from './components/PlayerStatus.vue';

const gameStore = useGameStore();

const localizedGameStatus = computed(() => {
  const statusMap = {
    waiting: '等待玩家加入',
    dealing: '发牌中...', // 后端直接变为playing
    playing: '游戏中 - 请摆牌',
    finished: '本局已结束',
    unknown: '未知'
  };
  return statusMap[gameStore.gameState?.status] || gameStore.gameState?.status || '未连接';
});

const myPlayerIsReady = computed(() => {
  const me = gameStore.players.find(p => p.is_me);
  return me ? me.is_ready : false;
});

// 假设房主 (order 1) 可以开启新一局
const canStartNewRound = computed(() => {
    const me = gameStore.players.find(p => p.is_me);
    return me && me.order === 1 && gameStore.gameState?.status === 'finished';
});

async function handleNewRound() {
    await gameStore.resetForNewRound();
    // resetForNewRound 内部应该会调用 fetchGameState 和 startPolling
}

async function copySessionId() {
  try {
    await navigator.clipboard.writeText(gameStore.playerSessionId);
    alert('会话ID已复制到剪贴板！');
  } catch (err) {
    alert('复制失败，请手动复制。');
    console.error('无法复制会话ID:', err);
  }
}


onMounted(async () => {
  // 尝试从 localStorage 或 session 恢复游戏状态
  await gameStore.tryRestoreSession();
});

onUnmounted(() => {
  gameStore.stopPolling();
});
</script>

<style>
/* 全局样式，或者放在 src/style.css */
body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  margin: 0;
  padding: 0;
  background-color: #eef2f7;
  color: #333;
  line-height: 1.6;
}

#thirteen-water-app {
  max-width: 1000px;
  margin: 20px auto;
  padding: 20px;
  background-color: #fff;
  box-shadow: 0 0 20px rgba(0,0,0,0.05);
  border-radius: 8px;
}

header {
  border-bottom: 1px solid #ddd;
  padding-bottom: 15px;
  margin-bottom: 20px;
  text-align: center;
}
header h1 {
  color: #007bff;
  margin: 0;
}
.session-info {
  font-size: 0.8em;
  color: #666;
}
.session-info button {
  margin-left: 5px;
  padding: 2px 5px;
  font-size: 0.9em;
  background-color: #f0f0f0;
  border: 1px solid #ccc;
  border-radius: 3px;
  cursor: pointer;
}


main {
  /* 主要内容区域 */
}

.game-board {
  margin-top: 20px;
  padding: 15px;
  border: 1px solid #d1dce5;
  border-radius: 6px;
  background-color: #fbfdff;
}
.game-board h2 {
  color: #343a40;
  margin-top: 0;
  border-bottom: 1px dashed #ced4da;
  padding-bottom: 10px;
}
.game-status {
  font-size: 0.8em;
  font-weight: normal;
  color: #495057;
  background-color: #e9ecef;
  padding: 3px 8px;
  border-radius: 10px;
  margin-left: 10px;
}

.players-area {
  display: flex;
  flex-wrap: wrap; /* 允许换行 */
  justify-content: space-around; /* 子项间均匀分布空间 */
  margin-bottom: 20px;
}

.loading-overlay {
  position: fixed; /* 或 absolute 相对于 .game-board */
  top: 0; left: 0; width: 100%; height: 100%;
  background-color: rgba(255,255,255,0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  font-size: 1.2em;
  color: #007bff;
}
.error-banner {
  background-color: #f8d7da;
  color: #721c24;
  padding: 10px 15px;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
  margin-bottom: 15px;
}
.waiting-others {
  text-align: center;
  padding: 15px;
  background-color: #fff3cd;
  color: #856404;
  border: 1px solid #ffeeba;
  border-radius: 4px;
  margin: 15px 0;
}

.game-over-section {
  text-align: center;
  padding: 20px;
  margin-top: 20px;
  background-color: #d4edda;
  border: 1px solid #c3e6cb;
  border-radius: 6px;
}
.game-over-section h3 {
  color: #155724;
  margin-top: 0;
}
.btn-new-round, .btn-leave-game {
  padding: 10px 20px;
  font-size: 1em;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  margin: 5px;
  transition: background-color 0.2s;
}
.btn-new-round { background-color: #17a2b8; color: white; }
.btn-new-round:hover { background-color: #117a8b; }
.btn-leave-game { background-color: #6c757d; color: white; }
.btn-leave-game:hover { background-color: #545b62; }
.btn-new-round:disabled, .btn-leave-game:disabled {
    background-color: #ccc; cursor: not-allowed;
}


footer {
  margin-top: 30px;
  text-align: center;
  font-size: 0.9em;
  color: #6c757d;
}
</style>
