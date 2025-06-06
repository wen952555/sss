<template>
  <div class="game-board">
    <div v-if="!gameStore.gameState" class="loading">正在加载游戏数据...</div>
    <div v-else>
      <h3>游戏ID: {{ gameStore.gameId }} - 状态: {{ gameStore.gameStatus }}</h3>
      <div class="game-log">
        <h4>游戏日志:</h4>
        <ul>
          <li v-for="(log, index) in gameStore.gameState.log.slice(-5)" :key="index">{{ log }}</li>
        </ul>
      </div>

      <div class="players-area">
        <div v-for="player in gameStore.gameState.players" :key="player.id" class="player-info" :class="{ 'current-player': player.id === gameStore.playerId }">
          <h4>
            {{ player.name }} ({{ player.is_host ? '房主' : '玩家' }}) - 得分: {{ player.score }}
            <span v-if="player.id === gameStore.playerId">(你)</span>
          </h4>
          
          <div v-if="gameStore.gameStatus === 'waiting_for_players'">
            等待其他玩家...
          </div>

          <div v-else-if="player.id === gameStore.playerId && gameStore.gameStatus === 'arranging' && !player.submitted_hand">
             <PlayerHand /> <!-- 当前玩家的摆牌组件 -->
          </div>

          <div v-else> <!-- 其他玩家的牌，或已提交/比牌阶段 -->
            <p v-if="player.submitted_hand && (gameStore.gameStatus === 'comparing' || gameStore.gameStatus === 'game_over' || player.id === gameStore.playerId)">
              <strong>{{ player.name }} 的牌:</strong> ({{ player.evaluated_hand?.front?.name }}, {{ player.evaluated_hand?.middle?.name }}, {{ player.evaluated_hand?.back?.name }})
            </p>
             <p v-else-if="player.submitted_hand && gameStore.gameStatus === 'arranging'">
              <strong>{{ player.name }} 已提交牌型</strong>
            </p>
            <p v-else-if="gameStore.gameStatus === 'arranging' && player.hand_count">
               {{ player.name }} 手上有 {{ player.hand_count }} 张牌 (隐藏)
            </p>


            <div v-if="player.submitted_hand && (gameStore.gameStatus === 'comparing' || gameStore.gameStatus === 'game_over' || player.id === gameStore.playerId)" class="submitted-cards-display">
              <div class="pile-display">
                <strong>头墩:</strong>
                <Card v-for="card_id in player.submitted_hand.front" :key="card_id" :card="{id: card_id}" />
                ({{ player.evaluated_hand?.front?.name }})
              </div>
              <div class="pile-display">
                <strong>中墩:</strong>
                <Card v-for="card_id in player.submitted_hand.middle" :key="card_id" :card="{id: card_id}" />
                 ({{ player.evaluated_hand?.middle?.name }})
              </div>
              <div class="pile-display">
                <strong>尾墩:</strong>
                <Card v-for="card_id in player.submitted_hand.back" :key="card_id" :card="{id: card_id}" />
                 ({{ player.evaluated_hand?.back?.name }})
              </div>
            </div>
            <div v-else-if="player.hand && player.hand.length > 0 && gameStore.gameStatus !== 'waiting_for_players'">
              <!-- 显示其他玩家的牌背，或牌数 -->
              <div class="hand-row">
                <Card v-for="(card, index) in player.hand.slice(0,13)" :key="index" :card="card" :is-face-up="false" />
                <span v-if="player.hand_count">{{player.hand_count}}张</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="actions-area">
        <button v-if="gameStore.canDeal" @click="gameStore.dealCards()">开始游戏 (发牌)</button>
        <button v-if="gameStore.gameStatus === 'game_over'" @click="restartGame()">再来一局 (重新发牌)</button>
        <button @click="gameStore.leaveGame()">离开游戏</button>
      </div>
       <p v-if="gameStore.error" class="error-message">{{ gameStore.error }}</p>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue';
import { useGameStore } from '../store/game';
import Card from './Card.vue';
import PlayerHand from './PlayerHand.vue'; // 引入摆牌组件

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
    // 只有房主可以重新开始 (调用dealCards)
    if (gameStore.isHost) {
        // 清理前端的已摆牌和手牌数据，让dealCards后的fetchGameState重新填充
        gameStore.myHand = [];
        gameStore.arrangedHand = { front: [], middle: [], back: [] };
        await gameStore.dealCards();
    } else {
        alert("请等待房主开始新一局游戏。");
    }
}

</script>

<style scoped>
.game-board {
  font-family: Arial, sans-serif;
  padding: 20px;
}
.loading {
  font-size: 1.2em;
  text-align: center;
  padding: 20px;
}
.game-log {
  background-color: #f0f0f0;
  padding: 10px;
  margin-bottom: 15px;
  max-height: 150px;
  overflow-y: auto;
  border-radius: 4px;
}
.game-log ul {
  list-style-type: none;
  padding: 0;
  margin: 0;
}
.game-log li {
  font-size: 0.9em;
  margin-bottom: 3px;
}
.players-area {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.player-info {
  border: 1px solid #ddd;
  padding: 15px;
  border-radius: 5px;
  background-color: #fff;
}
.player-info.current-player {
  background-color: #e8f4ff;
  border-color: #007bff;
}
.player-info h4 {
  margin-top: 0;
}
.hand-row {
  display: flex;
  flex-wrap: wrap;
}
.submitted-cards-display {
  margin-top: 10px;
}
.pile-display {
  margin-bottom: 10px;
  padding: 5px;
  background-color: #f8f8f8;
  border-radius: 3px;
}
.pile-display strong {
  margin-right: 10px;
}
.pile-display .card { /* Card组件内的样式可能需要!important或更强的选择器覆盖 */
    margin-right: 3px;
}
.actions-area {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}
.actions-area button {
  margin-right: 10px;
  padding: 8px 15px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
.actions-area button:hover {
  background-color: #0056b3;
}
.actions-area button:disabled {
  background-color: #ccc;
}
.error-message {
  color: red;
  margin-top: 10px;
}
</style>
