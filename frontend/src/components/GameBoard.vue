<template>
  <div class="game-board-compact">
    <!-- 整合的游戏信息横幅 -->
    <div class="game-info-banner">
      <div class="banner-left">
        <span>游戏ID: {{ gameStore.gameId }}</span>
        <span>状态: <strong :class="statusClass">{{ gameStatusDisplay }}</strong></span>
      </div>
      <div class="banner-right">
        <span v-if="gameStore.currentPlayerData">
          你: {{ gameStore.currentPlayerData.name }} (得分: {{ gameStore.currentPlayerData.score }})
          <span v-if="gameStore.isHost" class="host-tag">(房主)</span>
        </span>
        <button v-if="gameStore.canDeal" @click="gameStore.dealCards()" class="banner-button deal-button">开始游戏</button>
        <button v-if="gameStore.gameStatus === 'game_over' && gameStore.isHost" @click="restartGame()" class="banner-button restart-button">再来一局</button>
        <button @click="leaveGameAndClearData()" class="banner-button leave-button">离开游戏</button>
      </div>
    </div>

    <!-- 游戏日志 -->
    <div class="game-log-compact" v-if="gameStore.gameState && gameStore.gameState.log.length > 0">
      <ul>
        <li v-for="(log, index) in gameStore.gameState.log.slice(-5)" :key="index">{{ log }}</li>
      </ul>
    </div>
    
    <div v-if="!gameStore.gameState" class="loading-compact">正在加载游戏数据...</div>

    <!-- 玩家区域和摆牌区域 -->
    <div v-if="gameStore.gameState" class="main-game-area">
        <!-- 当前玩家的摆牌组件 (只有在 arranging 状态且是当前玩家时显示) -->
        <div v-if="isCurrentPlayerArranging" class="current-player-hand-area">
          <PlayerHand />
        </div>

        <!-- 其他玩家状态显示 -->
        <div class="other-players-compact">
            <div v-for="player in otherPlayers" :key="player.id" class="player-info-compact" :class="{ 'disconnected': !player.connected }">
                <h4>
                {{ player.name }} {{ player.is_host ? '(房主)' : '' }} - 得分: {{ player.score }}
                <span v-if="!player.connected" class="disconnected-tag">(断线)</span>
                </h4>
                <div v-if="gameStore.gameStatus === 'arranging' && player.submitted_hand">
                    <p>已提交牌型，等待其他玩家...</p>
                </div>
                <div v-else-if="gameStore.gameStatus === 'arranging' && player.connected">
                    <p>正在摆牌...</p>
                    <div class="hand-row opponent-cards">
                        <Card v-for="i in 13" :key="`op-back-${player.id}-${i}`" :card="{id: 'back'}" :is-face-up="false" />
                    </div>
                </div>
                <div v-else-if="(gameStore.gameStatus === 'comparing' || gameStore.gameStatus === 'game_over') && player.evaluated_hand">
                     <!-- 显示特殊牌型或三墩结果 (同上一版本逻辑) -->
                    <div v-if="player.evaluated_hand.is_special_overall && player.evaluated_hand.special_details">
                        <strong>特殊牌型: {{ player.evaluated_hand.special_details.name }}</strong>
                        <div class="hand-row opponent-cards special-hand-display">
                            <Card v-for="card_obj in player.evaluated_hand.special_details.cards_for_display" :key="card_obj.id" :card="card_obj" />
                        </div>
                    </div>
                    <div v-else-if="player.submitted_hand">
                        <p>
                            <span v-if="player.evaluated_hand.extras && player.evaluated_hand.extras.arranged_special_name" class="arranged-special-name">
                            ({{ player.evaluated_hand.extras.arranged_special_name }})
                            </span>
                            <template v-else>
                                ({{player.evaluated_hand.front?.name || '?'}}), 
                                ({{player.evaluated_hand.middle?.name || '?'}}), 
                                ({{player.evaluated_hand.back?.name || '?'}})
                            </template>
                        </p>
                        <div class="submitted-cards-display-compact">
                            <div>头: <Card v-for="cid in player.submitted_hand.front" :key="cid" :card="{id:cid}" class="tiny-card"/></div>
                            <div>中: <Card v-for="cid in player.submitted_hand.middle" :key="cid" :card="{id:cid}" class="tiny-card"/></div>
                            <div>尾: <Card v-for="cid in player.submitted_hand.back" :key="cid" :card="{id:cid}" class="tiny-card"/></div>
                        </div>
                    </div>
                </div>
                 <div v-else-if="gameStore.gameStatus === 'waiting_for_players'">
                    等待开始...
                </div>
            </div>
        </div>
    </div>
    <p v-if="gameStore.error" class="error-message global-error">{{ gameStore.error }}</p>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted } from 'vue';
import { useGameStore } from '../store/game';
import Card from './Card.vue';
import PlayerHand from './PlayerHand.vue'; // 引入新的PlayerHand

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

const statusClass = computed(() => {
    return `status-${gameStore.gameStatus}`;
});

const isCurrentPlayerArranging = computed(() => {
    const me = gameStore.currentPlayerData;
    return gameStore.gameStatus === 'arranging' && me && !me.submitted_hand;
});

const otherPlayers = computed(() => {
    if (!gameStore.gameState || !gameStore.gameState.players) return [];
    return gameStore.gameState.players.filter(p => p.id !== gameStore.playerId);
});

async function restartGame() {
    if (gameStore.isHost) {
        gameStore.myHand = [];
        gameStore.arrangedHand = { front: [], middle: [], back: [] }; // middle 现在不用了，但 store 里还有
        await gameStore.dealCards();
    } else {
        gameStore.error = "请等待房主开始新一局游戏。";
    }
}

function leaveGameAndClearData() {
    gameStore.leaveGame();
}
</script>

<style scoped>
.game-board-compact {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  padding: 0; /* GameBoard 本身不留白 */
  background-color: #e9eff5; /* 整体背景色 */
  min-height: calc(100vh - 60px); /* 减去可能的 header/footer 高度 */
}

.game-info-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 15px;
  background-color: #345678; /* 深蓝灰色 */
  color: white;
  font-size: 0.9em;
  box-shadow: 0 2px 5px rgba(0,0,0,0.2);
  position: sticky; /* 固定在顶部 */
  top: 0;
  z-index: 100;
}
.banner-left span, .banner-right span {
  margin-right: 15px;
}
.banner-left strong {
  padding: 3px 6px;
  border-radius: 4px;
  color: white;
}
.status-waiting_for_players { background-color: #ffc107; color: #333 !important; } /* 黄色 */
.status-arranging { background-color: #17a2b8; } /* 青色 */
.status-comparing { background-color: #fd7e14; } /* 橙色 */
.status-game_over { background-color: #28a745; } /* 绿色 */
.host-tag {
    background-color: #6c757d;
    padding: 2px 5px;
    border-radius: 3px;
    font-size: 0.8em;
    margin-left: 5px;
}
.banner-button {
    padding: 5px 10px;
    font-size: 0.85em;
    margin-left: 8px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    color: white;
}
.deal-button { background-color: #28a745; }
.restart-button { background-color: #007bff; }
.leave-button { background-color: #dc3545; }
.banner-button:hover { opacity: 0.85; }

.game-log-compact {
  background-color: #ffffff;
  padding: 8px 12px;
  margin: 10px; /* 与边缘有间距 */
  max-height: 100px;
  overflow-y: auto;
  border-radius: 4px;
  font-size: 0.8em;
  border: 1px solid #dce3e9;
  box-shadow: inset 0 1px 3px rgba(0,0,0,0.05);
}
.game-log-compact ul { list-style-type: none; padding: 0; margin: 0; }
.game-log-compact li { margin-bottom: 3px; color: #555; }

.loading-compact {
  text-align: center;
  padding: 30px;
  font-size: 1.2em;
  color: #345678;
}
.main-game-area {
    padding: 10px;
}
.current-player-hand-area {
    margin-bottom: 20px; /* 与其他玩家信息区隔开 */
}

.other-players-compact {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); /* 响应式列 */
  gap: 10px;
  margin-top: 15px;
}
.player-info-compact {
  background-color: #fff;
  border: 1px solid #d1d9e0;
  padding: 10px;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
}
.player-info-compact.disconnected {
    opacity: 0.6;
    background-color: #f8f9fa;
}
.player-info-compact h4 {
  margin-top: 0;
  margin-bottom: 8px;
  font-size: 1em;
  color: #343a40;
}
.disconnected-tag { color: #e74c3c; font-size: 0.85em; }
.player-info-compact p { font-size: 0.85em; margin-bottom: 5px; color: #666; }
.opponent-cards .card {
    transform: scale(0.8); /* 其他玩家牌稍小 */
    margin: 1px;
}
.special-hand-display .card { /* 用于显示特殊牌型，恢复正常大小 */
    transform: scale(1);
}
.submitted-cards-display-compact div {
    font-size: 0.8em;
    margin-bottom: 3px;
    display: flex;
    align-items: center;
}
.tiny-card { /* 用于其他玩家已提交的牌的极小预览 */
    transform: scale(0.45);
    margin: -10px -15px;
}
.global-error {
    text-align: center;
    padding: 10px;
    background-color: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
    border-radius: 4px;
    margin: 10px;
}
</style>
