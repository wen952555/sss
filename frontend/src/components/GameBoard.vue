<template>
  <div class="game-board">
    <div v-if="!gameStore.gameState" class="loading">正在加载游戏数据...</div>
    <div v-else>
      <h3>游戏ID: {{ gameStore.gameId }} - 状态: {{ gameStore.gameStatus }}</h3>
      <div class="game-log">
        <h4>游戏日志:</h4>
        <ul>
          <li v-for="(log, index) in gameStore.gameState.log.slice(-10)" :key="index">{{ log }}</li>
        </ul>
      </div>

      <div class="players-area">
        <div v-for="player in gameStore.gameState.players" :key="player.id" class="player-info" :class="{ 'current-player': player.id === gameStore.playerId }">
          <h4>
            {{ player.name }} ({{ player.is_host ? '房主' : '玩家' }}) - 得分: {{ player.score }}
            <span v-if="player.id === gameStore.playerId">(你)</span>
            <span v-if="!player.connected" class="disconnected-label">(已断线)</span>
          </h4>
          
          <div v-if="gameStore.gameStatus === 'waiting_for_players'">
            等待其他玩家...
          </div>

          <!-- 当前玩家的摆牌组件 -->
          <div v-else-if="player.id === gameStore.playerId && gameStore.gameStatus === 'arranging' && (!player.submitted_hand || !player.evaluated_hand)">
             <PlayerHand />
          </div>

          <!-- 显示已提交的牌或结果 -->
          <div v-else-if="player.evaluated_hand">
            <!-- 1. 显示“入手即报”的特殊牌型 -->
            <div v-if="player.evaluated_hand.is_special_overall && player.evaluated_hand.special_details">
              <strong>{{ player.name }} 的特殊牌型: {{ player.evaluated_hand.special_details.name }}</strong>
              <div class="hand-row special-hand-display">
                <Card v-for="card_obj in player.evaluated_hand.special_details.cards_for_display" :key="card_obj.id" :card="card_obj" />
              </div>
            </div>

            <!-- 2. 显示普通牌型三墩 -->
            <div v-else-if="!player.evaluated_hand.is_special_overall && player.submitted_hand">
              <p>
                <strong>{{ player.name }} 的牌:</strong> 
                <span v-if="player.evaluated_hand.extras && player.evaluated_hand.extras.arranged_special_name" class="arranged-special-name">
                  ({{ player.evaluated_hand.extras.arranged_special_name }})
                </span>
                <template v-else>
                    ({{(player.evaluated_hand.front?.name) || '未知'}}), 
                    ({{(player.evaluated_hand.middle?.name) || '未知'}}), 
                    ({{(player.evaluated_hand.back?.name) || '未知'}})
                </template>
              </p>
              <div class="submitted-cards-display">
                <div class="pile-display">
                  <strong>头墩:</strong>
                  <Card v-for="card_id_front in player.submitted_hand.front" :key="`f-${card_id_front}`" :card="{id: card_id_front}" />
                  <span v-if="player.evaluated_hand.front">({{ player.evaluated_hand.front.name }})</span>
                  <span v-if="player.evaluated_hand.extras && player.evaluated_hand.extras.segment_bonuses && player.evaluated_hand.extras.segment_bonuses['头冲三']" class="segment-bonus">(冲三!)</span>
                </div>
                <div class="pile-display">
                  <strong>中墩:</strong>
                  <Card v-for="card_id_middle in player.submitted_hand.middle" :key="`m-${card_id_middle}`" :card="{id: card_id_middle}" />
                  <span v-if="player.evaluated_hand.middle">({{ player.evaluated_hand.middle.name }})</span>
                  <span v-if="player.evaluated_hand.extras && player.evaluated_hand.extras.segment_bonuses && player.evaluated_hand.extras.segment_bonuses['中墩葫芦']" class="segment-bonus">(葫芦!)</span>
                  <span v-if="player.evaluated_hand.extras && player.evaluated_hand.extras.segment_bonuses && player.evaluated_hand.extras.segment_bonuses['中墩铁板']" class="segment-bonus">(铁板!)</span>
                </div>
                <div class="pile-display">
                  <strong>尾墩:</strong>
                  <Card v-for="card_id_back in player.submitted_hand.back" :key="`b-${card_id_back}`" :card="{id: card_id_back}" />
                  <span v-if="player.evaluated_hand.back">({{ player.evaluated_hand.back.name }})</span>
                   <span v-if="player.evaluated_hand.extras && player.evaluated_hand.extras.segment_bonuses && player.evaluated_hand.extras.segment_bonuses['尾墩铁板']" class="segment-bonus">(铁板!)</span>
                   <span v-if="player.evaluated_hand.extras && player.evaluated_hand.extras.segment_bonuses && player.evaluated_hand.extras.segment_bonuses['尾墩同花顺']" class="segment-bonus">(同花顺!)</span>
                </div>
              </div>
            </div>
             <p v-else-if="player.submitted_hand && gameStore.gameStatus === 'arranging'">
              <strong>{{ player.name }} 已提交牌型</strong> (等待其他玩家)
            </p>
          </div>
          
          <!-- 如果游戏在摆牌阶段，且非当前玩家，且未提交 -->
          <div v-else-if="gameStore.gameStatus === 'arranging' && player.hand && player.hand.length > 0">
            <p>{{ player.name }} 正在摆牌... ({{ player.hand.length }} 张牌背)</p>
            <div class="hand-row">
                <Card v-for="(card_placeholder, index_placeholder) in player.hand.slice(0,13)" :key="`ph-${index_placeholder}`" :card="{id: 'back'}" :is-face-up="false" />
            </div>
          </div>
           <div v-else-if="gameStore.gameStatus === 'arranging' && player.hand_count">
               {{ player.name }} 手上有 {{ player.hand_count }} 张牌 (隐藏)
            </div>
        </div>
      </div>

      <div class="actions-area">
        <button v-if="gameStore.canDeal" @click="gameStore.dealCards()">开始游戏 (发牌)</button>
        <button v-if="gameStore.gameStatus === 'game_over' && gameStore.isHost" @click="restartGame()">再来一局 (房主)</button>
        <button @click="leaveGameAndClearData()">离开游戏</button>
      </div>
       <p v-if="gameStore.error" class="error-message">{{ gameStore.error }}</p>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, computed } from 'vue';
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

async function restartGame() {
    if (gameStore.isHost) {
        gameStore.myHand = []; // 清理本地的牌
        gameStore.arrangedHand = { front: [], middle: [], back: [] };
        await gameStore.dealCards(); // 后端会重置玩家手牌并发牌
    } else {
        gameStore.error = "请等待房主开始新一局游戏。";
        setTimeout(() => gameStore.error = null, 3000);
    }
}

function leaveGameAndClearData() {
    gameStore.leaveGame(); // 这个方法会清理store和localStorage并导航到首页
}

// 用于确保player.hand是一个数组，以避免v-for的潜在错误
// 但后端 get_game_state.php 应该确保 hand 总是数组或被替换为 hand_count
// const getPlayerHandArray = (player) => {
//   if (Array.isArray(player.hand)) return player.hand;
//   if (player.hand_count > 0) return Array(player.hand_count).fill({ id: 'back', isFaceUp: false });
//   return [];
// };

</script>

<style scoped>
/* ... (之前的样式) ... */
.player-info.current-player {
  background-color: #e8f4ff;
  border-color: #007bff;
}
.disconnected-label {
  color: #dc3545;
  font-weight: bold;
  margin-left: 10px;
}
.special-hand-display .card {
  margin: 2px;
}
.arranged-special-name {
  font-weight: bold;
  color: #17a2b8; /* 青色 */
}
.segment-bonus {
  font-style: italic;
  color: #fd7e14; /* 橙色 */
  margin-left: 5px;
}
.error-message {
  color: red;
  margin-top: 10px;
  font-weight: bold;
}
.game-log {
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  padding: 10px;
  margin-bottom: 15px;
  max-height: 200px; /* 增加高度 */
  overflow-y: auto;
  border-radius: .25rem;
  font-size: 0.9em;
}
.game-log ul { list-style-type: none; padding: 0; margin: 0; }
.game-log li { margin-bottom: 5px; padding-bottom: 5px; border-bottom: 1px dotted #eee; }
.game-log li:last-child { border-bottom: none; }
</style>
