<template>
  <div class="game-board-streamlined">
    <!-- 整合的游戏信息横幅 -->
    <div class="game-info-banner">
      <div class="banner-left">
        <span>ID: {{ gameStore.gameId?.slice(-6) }}</span> <!-- 显示部分ID -->
        <span>状态: <strong :class="statusClass">{{ gameStatusDisplay }}</strong></span>
      </div>
      <div class="banner-center player-turns-compact">
        <!-- 简洁显示其他玩家状态，例如谁已提交 -->
        <span v-for="player in gameStore.gameState?.players" :key="player.id"
              class="player-status-tag"
              :class="{
                'is-current': player.id === gameStore.playerId,
                'is-host': player.is_host,
                'is-submitted': player.submitted_hand,
                'is-disconnected': !player.connected
              }">
          {{ player.name.substring(0, 4) }}{{ player.id === gameStore.playerId ? '(你)' : '' }}
          <span v-if="player.submitted_hand && gameStore.gameStatus === 'arranging'">✓</span>
          <span v-if="!player.connected">⚡</span>
        </span>
      </div>
      <div class="banner-right">
        <span v-if="gameStore.currentPlayerData" class="current-player-score">
          得分: {{ gameStore.currentPlayerData.score }}
        </span>
        <button v-if="gameStore.canDeal" @click="gameStore.dealCards()" class="banner-button deal-btn">开始</button>
        <button v-if="gameStore.gameStatus === 'game_over' && gameStore.isHost" @click="restartGame()" class="banner-button restart-btn">再来</button>
        <button @click="leaveGameAndClearData()" class="banner-button leave-btn">离开</button>
      </div>
    </div>

    <!-- 游戏日志 -->
    <div class="game-log-streamlined" v-if="gameStore.gameState && gameStore.gameState.log.length > 0">
      <ul>
        <li v-for="(log, index) in gameStore.gameState.log.slice(-3)" :key="index">{{ log }}</li>
      </ul>
    </div>
    
    <div v-if="!gameStore.gameState" class="loading-streamlined">加载中...</div>

    <!-- 主要游戏区域 -->
    <div v-if="gameStore.gameState" class="main-content-area">
        <!-- 当前玩家的摆牌组件 -->
        <div v-if="isCurrentPlayerArranging" class="current-player-action-zone">
          <PlayerHand />
        </div>
        <!-- 游戏结束时的结果展示 -->
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
                <li v-for="p in gameStore.gameState.players" :key="p.id">
                    {{p.name}} {{p.is_host ? '(房主)' : ''}} {{p.id === gameStore.playerId ? '(你)' : ''}}
                </li>
            </ul>
         </div>
    </div>
    <p v-if="gameStore.error" class="feedback-message error global-error-bottom">{{ gameStore.error }}</p>
  </div>
</template>

<script setup>
// ... (script setup 部分与上一版本 GameBoard.vue 的 script setup 基本相同)
// 主要确保 computed 属性 (gameStatusDisplay, statusClass, isCurrentPlayerArranging) 存在且正确
import { computed, onMounted, onUnmounted } from 'vue';
import { useGameStore } from '../store/game';
import Card from './Card.vue';
import PlayerHand from './PlayerHand.vue';

const gameStore = useGameStore();

onMounted(() => { /* ... */ });
onUnmounted(() => { /* ... */ });

const gameStatusDisplay = computed(() => { /* ... */ });
const statusClass = computed(() => `status-${gameStore.gameStatus}`);
const isCurrentPlayerArranging = computed(() => { /* ... */ });

async function restartGame() { /* ... */ }
function leaveGameAndClearData() { /* ... */ }
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
  background-color: #2c3e50; /* 深色主题 */
  color: #ecf0f1;
  font-size: 0.85rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.15);
  position: sticky;
  top: 0;
  z-index: 1000;
  flex-wrap: wrap; /* 允许换行 */
}
.banner-left, .banner-right { display: flex; align-items: center; gap: 10px; margin: 5px 0; }
.banner-center { display: flex; align-items: center; gap: 6px; flex-grow: 1; justify-content: center; margin: 5px 10px; flex-wrap: wrap;}

.player-status-tag {
    padding: 3px 7px;
    border-radius: 10px;
    font-size: 0.75rem;
    background-color: #7f8c8d; /* 默认灰色 */
    border: 1px solid #95a5a6;
    white-space: nowrap;
}
.player-status-tag.is-current { background-color: #3498db; border-color: #2980b9;} /* 蓝色 */
.player-status-tag.is-host { /* 可以加房主特殊标记，例如一个小皇冠图标 */ }
.player-status-tag.is-submitted { background-color: #2ecc71; border-color: #27ae60;} /* 绿色 */
.player-status-tag.is-disconnected { background-color: #e74c3c; border-color: #c0392b; } /* 红色 */
.player-status-tag span { margin-left: 3px; }


.current-player-score { font-weight: 500; }
.banner-button { /* ... 样式同前，可微调 ... */ padding: 6px 12px; font-size: 0.8rem; }
.deal-btn { background-color: #27ae60; }
.restart-btn { background-color: #2980b9; }
.leave-btn { background-color: #c0392b; }

.game-log-streamlined { /* ... 样式同前，可微调 ... */ max-height: 80px; font-size: 0.75rem; margin: 8px; }

.loading-streamlined { /* ... */ }
.main-content-area {
  flex-grow: 1; /* 占据剩余空间 */
  padding: 15px;
  display: flex;
  flex-direction: column;
  align-items: center; /* 居中内容，如PlayerHand或Results */
}
.current-player-action-zone {
  width: 100%;
  max-width: 700px; /* 限制摆牌区域最大宽度 */
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
.arranged-special-tag { font-weight: bold; color: #e67e22; } /* 橙色特殊牌型名 */
.submitted-cards-rows > div { display: flex; align-items: center; margin-bottom: 2px; font-size: 0.85rem; }
.submitted-cards-rows strong { margin-right: 5px; }
.result-card-item { transform: scale(0.65); margin: -8px -10px; } /* 结果展示的牌缩小 */
.result-cards .card { /* 特殊牌型展示的牌 */ margin: 1px; transform: scale(0.8); }

.waiting-lobby { text-align: center; padding: 20px; color: #34495e; }
.waiting-lobby ul { list-style: none; padding: 0; }
.waiting-lobby li { margin: 5px 0; }

.feedback-message.error.global-error-bottom {
    margin: 15px;
    padding: 8px;
    background-color: #ffebee;
    color: #c62828;
    border: 1px solid #ef9a9a;
    border-radius: 4px;
    text-align: center;
}
</style>
