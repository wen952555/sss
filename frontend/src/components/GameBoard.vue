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
        <button @click="leaveGameAndClearData" class="banner-button leave-btn">离开</button>
      </div>
    </div>

    <div class="game-log-streamlined" v-if="gameStore.gameState && gameStore.gameState.log.length > 0">
      <ul>
        <li v-for="(log, index) in gameStore.gameState.log.slice(-3)" :key="index">{{ log }}</li>
      </ul>
    </div>
    
    <div v-if="!gameStore.gameState && gameStore.isLoading" class="loading-streamlined">正在加载游戏数据...</div>
    <div v-else-if="!gameStore.gameState && !gameStore.isLoading && gameStore.gameId" class="loading-streamlined">连接中或游戏不存在...</div>

    <div v-if="gameStore.gameState" class="main-content-area">
        <div v-if="isCurrentPlayerArranging" class="current-player-action-zone">
          <PlayerHand />
        </div>
        <div v-else-if="gameStore.gameStatus === 'game_over' || gameStore.gameStatus === 'comparing'" class="game-results-area">
            <h3>本局结果</h3>
            <div v-for="player in gameStore.gameState.players" :key="`result-${player.id}`" class="player-result-card">
                <h4>{{ player.name }} {{player.id === gameStore.playerId ? '(你)' : ''}} - 总分: {{ player.score }}</h4>
                 <div v-if="player.evaluated_hand">
                    <div v-if="player.evaluated_hand.is_special_overall && player.evaluated_hand.special_details">
                        <strong>特殊牌型: {{ player.evaluated_hand.special_details.name }}</strong>
                        <div class="hand-row result-cards">
                            <Card v-for="card_obj in player.evaluated_hand.special_details.cards_for_display" :key="card_obj.id" :card="card_obj" />
                        </div>
                    </div>
                    <div v-else-if="player.submitted_hand">
                        <p class="arranged-hand-summary">
                            <span v-if="player.evaluated_hand.extras && player.evaluated_hand.extras.arranged_special_name" class="arranged-special-tag">
                            ({{ player.evaluated_hand.extras.arranged_special_name }})
                            </span>
                            头: {{player.evaluated_hand.front?.name || '?'}} | 
                            中: {{player.evaluated_hand.middle?.name || '?'}} | 
                            尾: {{player.evaluated_hand.back?.name || '?'}}
                        </p>
                        <div class="submitted-cards-rows">
                            <div><strong>头:</strong> <Card v-for="cid in player.submitted_hand.front" :key="`f-${cid}`" :card="{id:cid}" class="result-card-item"/></div>
                            <div><strong>中:</strong> <Card v-for="cid in player.submitted_hand.middle" :key="`m-${cid}`" :card="{id:cid}" class="result-card-item"/></div>
                            <div><strong>尾:</strong> <Card v-for="cid in player.submitted_hand.back" :key="`b-${cid}`" :card="{id:cid}" class="result-card-item"/></div>
                        </div>
                    </div>
                </div>
                <p v-else-if="gameStore.gameStatus === 'comparing' && !player.submitted_hand && player.connected">等待 {{player.name}} 提交...</p>
            </div>
        </div>
         <div v-else-if="gameStore.gameStatus === 'waiting_for_players'" class="waiting-lobby">
            <p>等待玩家加入并发牌...</p>
            <p>当前玩家 ({{ gameStore.gameState.players.length }}/{{ gameStore.gameState.num_players }}):</p>
            <ul>
                <li v-for="p_wait in gameStore.gameState.players" :key="p_wait.id" :class="{'player-connected': p_wait.connected, 'player-disconnected': !p_wait.connected}">
                    {{p_wait.name}} {{p_wait.is_host ? '(房主)' : ''}} {{p_wait.id === gameStore.playerId ? '(你)' : ''}}
                    <span v-if="!p_wait.connected"> (未连接)</span>
                </li>
            </ul>
         </div>
         <div v-if="gameStore.gameStatus === 'arranging' && !isCurrentPlayerArranging && gameStore.currentPlayerData && !gameStore.currentPlayerData.submitted_hand" class="waiting-lobby">
            <p>已发牌，等待您的操作或数据同步...</p>
            <p>(如果长时间未显示手牌，请检查网络或尝试刷新)</p>
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
});

onUnmounted(() => {
  gameStore.stopPolling();
});

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
    if (gameStore.canDeal) {
        await gameStore.dealCards();
    } else {
        let errorMsg = "当前无法开始游戏。";
        if (!gameStore.isHost) {
            errorMsg = "只有房主可以开始游戏。";
        } else if (gameStore.gameState?.players.length !== gameStore.gameState?.num_players) {
            errorMsg = "玩家未到齐。";
        } else if (gameStore.gameState?.players && !gameStore.gameState.players.every(p => p.connected)) {
            errorMsg = "有玩家未连接，请稍等。";
        }
        gameStore.error = errorMsg; // 使用 store 的 error
        setTimeout(() => gameStore.error = null, 3000);
    }
}

async function restartGame() {
    if (gameStore.isHost) {
        gameStore.myHand = [];
        gameStore.arrangedHand = { front: [], back: [] };
        await gameStore.dealCards();
    }
}

function leaveGameAndClearData() {
    gameStore.leaveGame();
}
</script>

<style scoped>
.game-board-streamlined {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  background-color: #f4f7f9;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.game-info-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background-color: #2c3e50;
  color: #ecf0f1;
  font-size: 0.85rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.15);
  position: sticky;
  top: 0;
  z-index: 1000;
  flex-wrap: wrap;
}
.banner-left, .banner-right { display: flex; align-items: center; gap: 10px; margin: 5px 0; }
.banner-center { display: flex; align-items: center; gap: 6px; flex-grow: 1; justify-content: center; margin: 5px 10px; flex-wrap: wrap;}
.player-status-tag {
    padding: 3px 7px;
    border-radius: 10px;
    font-size: 0.75rem;
    background-color: #7f8c8d;
    border: 1px solid #95a5a6;
    white-space: nowrap;
}
.player-status-tag.is-current { background-color: #3498db; border-color: #2980b9;}
.player-status-tag.is-submitted { background-color: #2ecc71; border-color: #27ae60;}
.player-status-tag.is-disconnected { background-color: #e74c3c; border-color: #c0392b; }
.player-status-tag span { margin-left: 3px; }
.current-player-score { font-weight: 500; }
.banner-button { padding: 6px 12px; font-size: 0.8rem; border:none; border-radius:4px; color:white; cursor:pointer; }
.deal-btn { background-color: #27ae60; }
.deal-btn:disabled { background-color: #95a5a6; cursor: not-allowed; }
.restart-btn { background-color: #2980b9; }
.leave-btn { background-color: #c0392b; }
.banner-button:hover:not(:disabled) { opacity: 0.85; }
.game-log-streamlined { max-height: 80px; font-size: 0.75rem; margin: 8px; background-color: #fff; border: 1px solid #ddd; border-radius: 4px; overflow-y: auto; padding: 5px 8px;}
.game-log-streamlined ul { list-style-type: none; padding: 0; margin: 0; }
.game-log-streamlined li { margin-bottom: 2px; color: #444; }
.loading-streamlined { text-align: center; padding: 30px; font-size: 1.1em; color: #2c3e50;}
.main-content-area {
  flex-grow: 1;
  padding: 15px;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.current-player-action-zone {
  width: 100%;
  max-width: 700px;
  margin-bottom: 20px;
}
.game-results-area {
  width: 100%;
  max-width: 800px;
  background-color: #fff;
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}
.game-results-area h3 { text-align: center; color: #2c3e50; margin-bottom: 15px; }
.player-result-card {
  margin-bottom: 12px;
  padding: 10px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
}
.player-result-card h4 { margin: 0 0 8px 0; font-size: 1rem; }
.arranged-hand-summary { font-size: 0.9rem; color: #555; margin-bottom: 5px;}
.arranged-special-tag { font-weight: bold; color: #e67e22; }
.submitted-cards-rows > div { display: flex; align-items: center; margin-bottom: 2px; font-size: 0.85rem; }
.submitted-cards-rows strong { margin-right: 5px; width:25px; display:inline-block; }
.result-card-item { transform: scale(0.65); margin: -8px -10px; }
.result-cards .card { margin: 1px; transform: scale(0.8); }
.waiting-lobby { text-align: center; padding: 20px; color: #34495e; }
.waiting-lobby ul { list-style: none; padding: 0; }
.waiting-lobby li { margin: 5px 0; }
.waiting-lobby li.player-connected { color: #27ae60; }
.waiting-lobby li.player-disconnected { color: #c0392b; font-style: italic; }
.feedback-message.error.global-error-bottom {
    margin: 15px; padding: 8px; background-color: #ffebee; color: #c62828;
    border: 1px solid #ef9a9a; border-radius: 4px; text-align: center;
}
.status-waiting_for_players { background-color: #f1c40f; color: #333 !important; }
.status-arranging { background-color: #3498db; }
.status-comparing { background-color: #e67e22; }
.status-game_over { background-color: #2ecc71; }
</style>
