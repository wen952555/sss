<template>
  <div id="thirteen-water-app">
    <header>
      <h1>十三水在线对战</h1>
      <div class="header-info">
          <div v-if="gameStore.playerSessionId" class="session-info">
            会话ID: <small>{{ gameStore.playerSessionId.substring(0, 8) }}...</small>
            <button @click="copySessionId" title="复制会话ID (用于调试或恢复)" class="copy-btn">复制</button>
          </div>
          <div v-if="gameStore.gameCode" class="game-code-header-info">
            房间: 
            <strong 
                class="game-code-display-header" 
                title="点击复制房间码" 
                @click="copyGameCodeHeader"
            >
                {{ gameStore.gameCode }}
            </strong>
          </div>
      </div>
    </header>

    <main>
      <GameSetup v-if="!gameStore.isGameActive && gameStore.gameState?.status !== 'finished'" />

      <div v-if="gameStore.isGameActive || gameStore.gameState?.status === 'finished'" class="game-board">
        <h2> 
          <!-- 游戏板内的房间号显示可以保留，如果头部有了也可以考虑移除 -->
          房间: {{ gameStore.gameCode }} 
          <span class="game-status">(状态: {{ localizedGameStatus }})</span>
          <button @click="handleLeaveGameApp" v-if="gameStore.gameId" class="btn-leave-game-app" :disabled="gameStore.loading">
            离开游戏
          </button>
        </h2>
        
        <div v-if="gameStore.loading && gameStore.isGameActive" class="loading-overlay"><p>加载中...</p></div>
        <div v-if="gameStore.error && gameStore.isGameActive" class="error-banner">错误: {{ gameStore.error }}</div>
        
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
          <button @click="handleNewRound" v-if="canStartNewRound" :disabled="gameStore.loading" class="btn-new-round">开始新一局</button>
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
  const statusMap = { waiting: '等待玩家加入', playing: '游戏中 - 请摆牌', finished: '本局已结束', unknown: '未知' };
  return statusMap[gameStore.gameState?.status] || gameStore.gameState?.status || '未连接';
});
const myPlayerIsReady = computed(() => gameStore.myPlayerDetails?.is_ready || false);
const canStartNewRound = computed(() => gameStore.myPlayerDetails?.order === 1 && gameStore.gameState?.status === 'finished');

async function handleNewRound() { await gameStore.resetForNewRound(); }

async function copySessionId() {
  if (!gameStore.playerSessionId) return;
  try { await navigator.clipboard.writeText(gameStore.playerSessionId); alert('会话ID已复制!'); } 
  catch (err) { alert('复制失败'); }
}
async function handleLeaveGameApp() { await gameStore.leaveGame(); }

async function copyGameCodeHeader() {
  if (!gameStore.gameCode) return;
  try { await navigator.clipboard.writeText(gameStore.gameCode); alert(`房间码 "${gameStore.gameCode}" 已复制!`); } 
  catch (err) { alert('复制房间码失败'); }
}

onMounted(async () => {
    // console.log("[App.vue] onMounted. Current gameId:", gameStore.gameId, "gameCode:", gameStore.gameCode, "playerSessionId:", gameStore.playerSessionId);
    // 确保 tryRestoreSession 在应用加载时被调用，以恢复之前的游戏状态
    await gameStore.tryRestoreSession();
});
onUnmounted(() => {
  gameStore.stopPolling();
});
</script>

<style>
/* 样式与上一版相同，此处省略 */
body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #eef2f7; color: #333; line-height: 1.6; }
#thirteen-water-app { max-width: 1000px; margin: 20px auto; padding: 20px; background-color: #fff; box-shadow: 0 0 20px rgba(0,0,0,0.05); border-radius: 8px; }
header { border-bottom: 1px solid #ddd; padding-bottom: 15px; margin-bottom: 20px; text-align: center; }
header h1 { color: #007bff; margin: 0; }
.header-info { display: flex; justify-content: center; align-items: center; gap: 20px; margin-top: 5px; font-size: 0.9em; }
.session-info, .game-code-header-info { color: #555; }
.copy-btn, .game-code-display-header { margin-left: 5px; padding: 2px 6px; font-size: 0.9em; background-color: #f0f0f0; border: 1px solid #ccc; border-radius: 3px; cursor: pointer; }
.game-code-display-header { font-weight: bold; color: #007bff; }
.game-board { margin-top: 20px; padding: 15px; border: 1px solid #d1dce5; border-radius: 6px; background-color: #fbfdff; }
.game-board h2 { color: #343a40; margin-top: 0; border-bottom: 1px dashed #ced4da; padding-bottom: 10px; display: flex; justify-content: space-between; align-items: center;}
.game-status { font-size: 0.8em; font-weight: normal; color: #495057; background-color: #e9ecef; padding: 3px 8px; border-radius: 10px; margin-left: 10px; }
.btn-leave-game-app { padding: 6px 12px; font-size: 0.85em; border: none; border-radius: 4px; cursor: pointer; background-color: #6c757d; color: white; transition: background-color 0.2s; /* margin-left: 15px; */ vertical-align: middle; }
.btn-leave-game-app:hover:not(:disabled) { background-color: #545b62; }
.btn-leave-game-app:disabled { background-color: #ccc; cursor: not-allowed; color: #666; }
.players-area { display: flex; flex-wrap: wrap; justify-content: space-around; margin-bottom: 20px; }
.loading-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(255,255,255,0.8); display: flex; justify-content: center; align-items: center; z-index: 1000; font-size: 1.2em; color: #007bff; }
.error-banner { background-color: #f8d7da; color: #721c24; padding: 10px 15px; border: 1px solid #f5c6cb; border-radius: 4px; margin-bottom: 15px; }
.waiting-others { text-align: center; padding: 15px; background-color: #fff3cd; color: #856404; border: 1px solid #ffeeba; border-radius: 4px; margin: 15px 0; }
.game-over-section { text-align: center; padding: 20px; margin-top: 20px; background-color: #d4edda; border: 1px solid #c3e6cb; border-radius: 6px; }
.game-over-section h3 { color: #155724; margin-top: 0; }
.btn-new-round { padding: 10px 20px; font-size: 1em; border: none; border-radius: 5px; cursor: pointer; margin: 5px; transition: background-color 0.2s; background-color: #17a2b8; color: white; }
.btn-new-round:hover:not(:disabled) { background-color: #117a8b; }
.btn-new-round:disabled { background-color: #ccc; cursor: not-allowed; }
footer { margin-top: 30px; text-align: center; font-size: 0.9em; color: #6c757d; }
</style>
