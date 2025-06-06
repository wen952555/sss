<template>
  <div class="game-board-streamlined">
    <!-- 整合的游戏信息横幅 -->
    <div class="game-info-banner">
      <div class="banner-left">
        <span>ID: {{ gameStore.gameId?.slice(-6) }}</span>
        <span>状态: <strong :class="statusClass">{{ gameStatusDisplay }}</strong></span>
      </div>
      <div class="banner-center player-turns-compact">
        <span v-for="player in gameStore.gameState?.players" :key="player.id"
              class="player-status-tag"
              :class="{
                'is-current': player.id === gameStore.playerId,
                'is-host': player.is_host,
                'is-submitted': player.submitted_hand && gameStore.gameStatus === 'arranging',
                'is-disconnected': !player.connected
              }">
          {{ player.name.substring(0, 4) }}{{ player.id === gameStore.playerId ? '(你)' : '' }}
          <span v-if="player.submitted_hand && gameStore.gameStatus === 'arranging'">✓</span>
          <span v-if="!player.connected && gameStore.gameStatus !== 'waiting_for_players'">⚡</span>
        </span>
      </div>
      <div class="banner-right">
        <span v-if="gameStore.currentPlayerData" class="current-player-score">
          得分: {{ gameStore.currentPlayerData.score }}
        </span>
        <button
          v-if="gameStore.gameStatus === 'waiting_for_players' && gameStore.isHost && gameStore.canDeal"
          @click="handleDealCards"
          :disabled="gameStore.isLoading"
          class="banner-button deal-btn">
          开始游戏
        </button>
        <button
          v-if="gameStore.gameStatus === 'game_over' && gameStore.isHost"
          @click="restartGame"
          :disabled="gameStore.isLoading"
          class="banner-button restart-btn">
          再来一局
        </button>
        <button @click="leaveGameAndClearData" :disabled="gameStore.isLoading" class="banner-button leave-btn">离开</button>
      </div>
    </div>

    <div class="game-log-streamlined" v-if="gameStore.gameState && gameStore.gameState.log.length > 0">
      <ul>
        <li v-for="(log, index) in gameStore.gameState.log.slice(-3)" :key="index">{{ log }}</li>
      </ul>
    </div>
    
    <div v-if="!gameStore.gameState && gameStore.isLoading" class="loading-streamlined">正在加载游戏数据...</div>
    <div v-else-if="!gameStore.gameState && !gameStore.isLoading && gameStore.gameId" class="loading-streamlined">连接中或游戏可能已结束/不存在...</div>


    <div v-if="gameStore.gameState" class="main-content-area">
        <div v-if="isCurrentPlayerArranging" class="current-player-action-zone">
          <PlayerHand />
        </div>
        <div v-else-if="gameStore.gameStatus === 'game_over' || gameStore.gameStatus === 'comparing'" class="game-results-area">
            <h3>本局结果</h3>
            <div v-for="player_result in gameStore.gameState.players" :key="`result-${player_result.id}`" class="player-result-card">
                <h4>
                  {{ player_result.name }} 
                  <span v-if="player_result.id === gameStore.playerId">(你)</span>
                  <span v-if="player_result.is_host" class="host-result-tag">(房主)</span>
                  - 总分: {{ player_result.score }}
                  <span v-if="!player_result.connected" class="disconnected-result-tag">(已断线)</span>
                </h4>
                 <div v-if="player_result.evaluated_hand">
                    <div v-if="player_result.evaluated_hand.is_special_overall && player_result.evaluated_hand.special_details">
                        <strong>特殊牌型: {{ player_result.evaluated_hand.special_details.name }}</strong>
                        <div class="hand-row result-cards">
                            <Card v-for="card_obj_res in player_result.evaluated_hand.special_details.cards_for_display" :key="`sp-${card_obj_res.id}`" :card="card_obj_res" />
                        </div>
                    </div>
                    <div v-else-if="player_result.submitted_hand">
                        <p class="arranged-hand-summary">
                            <span v-if="player_result.evaluated_hand.extras && player_result.evaluated_hand.extras.arranged_special_name" class="arranged-special-tag">
                            ({{ player_result.evaluated_hand.extras.arranged_special_name }})
                            </span>
                            头: {{player_result.evaluated_hand.front?.name || '?'}} | 
                            中: {{player_result.evaluated_hand.middle?.name || '?'}} | 
                            尾: {{player_result.evaluated_hand.back?.name || '?'}}
                        </p>
                        <div class="submitted-cards-rows">
                            <div><strong>头:</strong> <Card v-for="cid_f in player_result.submitted_hand.front" :key="`res-f-${player_result.id}-${cid_f}`" :card="{id:cid_f}" class="result-card-item"/></div>
                            <div><strong>中:</strong> <Card v-for="cid_m in player_result.submitted_hand.middle" :key="`res-m-${player_result.id}-${cid_m}`" :card="{id:cid_m}" class="result-card-item"/></div>
                            <div><strong>尾:</strong> <Card v-for="cid_b in player_result.submitted_hand.back" :key="`res-b-${player_result.id}-${cid_b}`" :card="{id:cid_b}" class="result-card-item"/></div>
                        </div>
                    </div>
                </div>
                <p v-else-if="gameStore.gameStatus === 'comparing' && !player_result.submitted_hand && player_result.connected" class="waiting-submit-result">等待 {{player_result.name}} 提交...</p>
                <p v-else-if="gameStore.gameStatus !== 'waiting_for_players' && !player_result.submitted_hand && !player_result.connected" class="not-participated-result">{{player_result.name}} 未参与或已断线未提交。</p>
            </div>
        </div>
         <div v-else-if="gameStore.gameStatus === 'waiting_for_players'" class="waiting-lobby">
            <p>等待玩家加入并发牌...</p>
            <p>当前玩家 ({{ gameStore.gameState.players.length }}/{{ gameStore.gameState.num_players }}):</p>
            <ul>
                <li v-for="p_wait_lobby in gameStore.gameState.players" :key="p_wait_lobby.id" :class="{'player-connected': p_wait_lobby.connected, 'player-disconnected': !p_wait_lobby.connected}">
                    {{p_wait_lobby.name}} {{p_wait_lobby.is_host ? '(房主)' : ''}} {{p_wait_lobby.id === gameStore.playerId ? '(你)' : ''}}
                    <span v-if="!p_wait_lobby.connected"> (未连接)</span>
                </li>
            </ul>
         </div>
         <div v-if="gameStore.gameStatus === 'arranging' && !isCurrentPlayerArranging && gameStore.currentPlayerData && !gameStore.currentPlayerData.submitted_hand" class="arranging-wait-prompt">
            <p v-if="gameStore.myHand && gameStore.myHand.length === 0">等待同步手牌...</p>
            <p v-else>请开始摆牌，或等待其他玩家。</p>
         </div>
    </div>
    <p v-if="gameStore.error" class="feedback-message error global-error-bottom">{{ gameStore.error }}</p>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted } from 'vue';
import { useGameStore } from '../store/game';
import Card from './Card.vue';
import PlayerHand from './PlayerHand.vue';

const gameStore = useGameStore();

onMounted(() => {
  if (gameStore.gameId) {
    gameStore.startPolling();
  }
  // 可以在这里或 App.vue 中添加 visibilitychange 事件监听器来控制轮询
  // document.addEventListener('visibilitychange', handleVisibilityChange);
});

onUnmounted(() => {
  gameStore.stopPolling();
  // document.removeEventListener('visibilitychange', handleVisibilityChange);
});

// function handleVisibilityChange() {
//   if (document.hidden) {
//     gameStore.stopPolling();
//   } else {
//     if (gameStore.gameId && router.currentRoute.value.name === 'GameRoom') { // 确保在游戏房间页才恢复
//       gameStore.startPolling();
//     }
//   }
// }

const gameStatusDisplay = computed(() => {
    const statusMap = {
        'waiting_for_players': '等待玩家',
        'arranging': '摆牌中',
        'comparing': '比牌中',
        'game_over': '本局结束',
        'loading': '加载中...'
    };
    return statusMap[gameStore.gameStatus] || gameStore.gameStatus;
});

const statusClass = computed(() => `status-${gameStore.gameStatus}`);

const isCurrentPlayerArranging = computed(() => {
    const me = gameStore.currentPlayerData;
    return gameStore.gameStatus === 'arranging' && 
           me && 
           !me.submitted_hand && 
           gameStore.myHand && gameStore.myHand.length > 0;
});

async function handleDealCards() {
    if (gameStore.isLoading) return; // 防止重复点击
    const dealSuccess = await gameStore.dealCards(); // dealCards action 现在返回 boolean
    if (!dealSuccess && !gameStore.error) { // 如果canDeal为false, dealCards会设置error
         // 避免覆盖 dealCards 中更具体的错误
        if (!gameStore.isHost) { gameStore.error = "只有房主可以开始游戏。"; }
        else if (gameStore.gameState?.players.length !== gameStore.gameState?.num_players) { gameStore.error = "玩家未到齐。"; }
        else if (gameStore.gameState?.players && !gameStore.gameState.players.every(p => p.connected)) { gameStore.error = "有玩家未连接，请稍等。"; }
        else { gameStore.error = "当前无法开始游戏（未知原因）。"; }
        setTimeout(() => gameStore.error = null, 3000);
    }
}

async function restartGame() {
    if (gameStore.isLoading) return;
    if (gameStore.isHost) {
        gameStore.myHand = [];
        gameStore.arrangedHand = { front: [], back: [] };
        await gameStore.dealCards();
    }
}

function leaveGameAndClearData() {
    if (gameStore.isLoading) return;
    gameStore.leaveGame();
}
</script>

<style scoped>
.game-board-streamlined {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  background-color: #f0f4f8; /* 更淡雅的背景 */
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.game-info-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 15px; /* 增加内边距 */
  background-color: #34495e; /* 深蓝灰色 */
  color: #f2f2f2; /* 浅色文字 */
  font-size: 0.9rem;
  box-shadow: 0 2px 5px rgba(0,0,0,0.2);
  position: sticky;
  top: 0;
  z-index: 1000;
  flex-wrap: wrap; /* 允许换行 */
  gap: 10px; /* 各部分之间的间隔 */
}
.banner-left, .banner-right, .banner-center { 
  display: flex; 
  align-items: center; 
  gap: 12px; /* 内部元素间隔 */
}
.banner-center { 
  flex-grow: 1; 
  justify-content: center; 
  flex-wrap: wrap;
}
.player-status-tag {
    padding: 4px 8px;
    border-radius: 12px; /* 更圆的胶囊 */
    font-size: 0.8rem;
    background-color: #7f8c8d;
    border: 1px solid transparent;
    white-space: nowrap;
    transition: background-color 0.2s;
}
.player-status-tag.is-current { background-color: #2980b9; border-color: #3498db;}
.player-status-tag.is-host::before { content: "👑"; margin-right: 3px; font-size: 0.7rem; }
.player-status-tag.is-submitted { background-color: #27ae60; }
.player-status-tag.is-disconnected { background-color: #c0392b; text-decoration: line-through; }
.player-status-tag span { margin-left: 4px; }

.current-player-score { font-weight: 600; font-size: 0.95rem; }
.banner-button { 
  padding: 7px 14px; font-size: 0.85rem; border:none; border-radius:5px; 
  color:white; cursor:pointer; transition: background-color 0.2s, transform 0.1s;
}
.banner-button:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
.banner-button:active:not(:disabled) { transform: translateY(0px); }
.deal-btn { background-color: #2ecc71; }
.deal-btn:disabled { background-color: #95a5a6; cursor: not-allowed; }
.restart-btn { background-color: #3498db; }
.leave-btn { background-color: #e74c3c; }

.game-log-streamlined { 
  max-height: 70px; font-size: 0.8rem; margin: 10px; 
  background-color: #ffffff; border: 1px solid #dfe6ec; border-radius: 5px; 
  overflow-y: auto; padding: 8px 10px; box-shadow: inset 0 1px 2px rgba(0,0,0,0.05);
}
.game-log-streamlined ul { list-style-type: none; padding: 0; margin: 0; }
.game-log-streamlined li { margin-bottom: 3px; color: #566573; }

.loading-streamlined { text-align: center; padding: 40px; font-size: 1.2rem; color: #34495e;}
.main-content-area {
  flex-grow: 1;
  padding: 10px 15px; /* 调整内边距 */
  display: flex;
  flex-direction: column;
  align-items: center;
}
.current-player-action-zone {
  width: 100%;
  max-width: 650px; /* 摆牌区域宽度 */
  margin-bottom: 25px;
}
.game-results-area {
  width: 100%;
  max-width: 750px;
  background-color: #ffffff;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 5px 15px rgba(0,0,0,0.1);
}
.game-results-area h3 { text-align: center; color: #34495e; margin-bottom: 20px; font-size: 1.5rem;}
.player-result-card {
  margin-bottom: 15px;
  padding: 12px;
  border: 1px solid #e0e6ed;
  border-radius: 8px;
  background-color: #fdfdfd;
}
.player-result-card h4 { margin: 0 0 10px 0; font-size: 1.1rem; color: #2c3e50;}
.host-result-tag, .disconnected-result-tag { font-size: 0.8rem; color: #7f8c8d; margin-left: 5px; }
.disconnected-result-tag { color: #e74c3c; }
.arranged-hand-summary { font-size: 0.95rem; color: #555; margin-bottom: 8px;}
.arranged-special-tag { font-weight: bold; color: #d35400; } /* 深橙色 */
.submitted-cards-rows > div { display: flex; align-items: center; margin-bottom: 4px; font-size: 0.9rem; }
.submitted-cards-rows strong { margin-right: 8px; width:30px; display:inline-block; color: #34495e; }
.result-card-item { transform: scale(0.7); margin: -7px -9px; }
.result-cards .card { margin: 2px; transform: scale(0.85); }

.waiting-lobby { text-align: center; padding: 25px; color: #34495e; font-size: 1rem; }
.waiting-lobby ul { list-style: none; padding: 0; margin-top: 10px; }
.waiting-lobby li { margin: 6px 0; font-size: 0.95rem; }
.waiting-lobby li.player-connected { color: #27ae60; font-weight: 500; }
.waiting-lobby li.player-disconnected { color: #c0392b; font-style: italic; }
.arranging-wait-prompt { text-align: center; padding: 20px; color: #5499c7; font-size: 1rem;}

.feedback-message.error.global-error-bottom {
    margin: 10px 15px; padding: 10px; background-color: #fdedec; color: #942721;
    border: 1px solid #f9c6c3; border-radius: 6px; text-align: center;
}
.status-waiting_for_players { background-color: #f39c12; color: #fff !important; } /* 橙色 */
.status-arranging { background-color: #3498db; } /* 蓝色 */
.status-comparing { background-color: #e67e22; } /* 胡萝卜色 */
.status-game_over { background-color: #2ecc71; } /* 翡翠绿 */
</style>
