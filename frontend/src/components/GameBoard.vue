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
                'is-submitted': player.submitted_hand && gameStore.gameStatus === 'arranging', // 只在摆牌阶段显示提交对勾
                'is-disconnected': !player.connected
              }">
          {{ player.name.substring(0, 4) }}{{ player.id === gameStore.playerId ? '(你)' : '' }}
          <span v-if="player.submitted_hand && gameStore.gameStatus === 'arranging'">✓</span>
          <span v-if="!player.connected && gameStore.gameStatus !== 'waiting_for_players'">⚡</span> <!-- 不在等待阶段才显示断线 -->
        </span>
      </div>
      <div class="banner-right">
        <span v-if="gameStore.currentPlayerData" class="current-player-score">
          得分: {{ gameStore.currentPlayerData.score }}
        </span>
        <!-- 修改：“开始游戏”按钮逻辑 -->
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

    <!-- 游戏日志 -->
    <div class="game-log-streamlined" v-if="gameStore.gameState && gameStore.gameState.log.length > 0">
      <ul>
        <li v-for="(log, index) in gameStore.gameState.log.slice(-3)" :key="index">{{ log }}</li>
      </ul>
    </div>
    
    <div v-if="!gameStore.gameState && gameStore.isLoading" class="loading-streamlined">正在加载游戏数据...</div>
    <div v-else-if="!gameStore.gameState && !gameStore.isLoading && gameStore.gameId" class="loading-streamlined">连接中或游戏不存在...</div>


    <!-- 主要游戏区域 -->
    <div v-if="gameStore.gameState" class="main-content-area">
        <div v-if="isCurrentPlayerArranging" class="current-player-action-zone">
          <PlayerHand />
        </div>
        <div v-else-if="gameStore.gameStatus === 'game_over' || gameStore.gameStatus === 'comparing'" class="game-results-area">
            <!-- ... (结果展示区域代码同前) ... -->
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
            <!-- ... (等待大厅代码同前) ... -->
            <p>等待玩家加入并发牌...</p>
            <p>当前玩家 ({{ gameStore.gameState.players.length }}/{{ gameStore.gameState.num_players }}):</p>
            <ul>
                <li v-for="p in gameStore.gameState.players" :key="p.id" :class="{'player-connected': p.connected, 'player-disconnected': !p.connected}">
                    {{p.name}} {{p.is_host ? '(房主)' : ''}} {{p.id === gameStore.playerId ? '(你)' : ''}}
                    <span v-if="!p.connected"> (未连接)</span>
                </li>
            </ul>
         </div>
         <!-- 新增：如果发牌了但 PlayerHand 不显示（例如 myHand 为空），给个提示 -->
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
  } else {
    // 如果没有gameId，可能是直接访问了游戏房间URL，尝试从localStorage恢复
    // Pinia store的初始化逻辑应该已经处理了这个
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
    // 玩家必须是当前玩家，游戏状态是摆牌，玩家未提交，并且本地手牌 myHand 有牌
    return gameStore.gameStatus === 'arranging' && 
           me && 
           !me.submitted_hand && 
           gameStore.myHand && gameStore.myHand.length > 0;
});

async function handleDealCards() {
    if (gameStore.canDeal) {
        await gameStore.dealCards();
    } else {
        // 可以在这里给用户一个提示，为什么不能发牌
        if (!gameStore.isHost) {
            gameStore.error = "只有房主可以开始游戏。";
        } else if (gameStore.gameState.players.length !== gameStore.gameState.num_players) {
            gameStore.error = "玩家未到齐。";
        } else if (!gameStore.gameState.players.every(p => p.connected)) {
            gameStore.error = "有玩家未连接，请稍等。";
        } else {
            gameStore.error = "当前无法开始游戏。";
        }
    }
}

async function restartGame() {
    if (gameStore.isHost) {
        // 清理前端手牌状态，后端dealCards会重新发牌
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
/* ... (大部分样式与上一版本相同，确保选择器仍然有效) ... */
.game-board-streamlined { /* ... */ }
.game-info-banner { /* ... */ }
.banner-left, .banner-right { /* ... */ }
.banner-center { /* ... */ }
.player-status-tag { /* ... */ }
.player-status-tag.is-current { /* ... */ }
.player-status-tag.is-submitted { /* ... */ }
.player-status-tag.is-disconnected { /* ... */ }
.current-player-score { /* ... */ }
.banner-button { /* ... */ }
.deal-btn { background-color: #27ae60; } /* 发牌按钮颜色 */
.deal-btn:disabled { background-color: #95a5a6; cursor: not-allowed; } /* 禁用时颜色 */
.restart-btn { /* ... */ }
.leave-btn { /* ... */ }
.game-log-streamlined { /* ... */ }
.loading-streamlined { /* ... */ }
.main-content-area { /* ... */ }
.current-player-action-zone { /* ... */ }
.game-results-area { /* ... */ }
.game-results-area h3 { /* ... */ }
.player-result-card { /* ... */ }
.player-result-card h4 { /* ... */ }
.arranged-hand-summary { /* ... */ }
.arranged-special-tag { /* ... */ }
.submitted-cards-rows > div { /* ... */ }
.result-card-item { /* ... */ }
.result-cards .card { /* ... */ }
.waiting-lobby { /* ... */ }
.waiting-lobby ul { /* ... */ }
.waiting-lobby li.player-connected { color: #27ae60; } /* 连接的玩家绿色 */
.waiting-lobby li.player-disconnected { color: #c0392b; font-style: italic; } /* 未连接的红色斜体 */
.feedback-message.error.global-error-bottom { /* ... */ }
</style>
