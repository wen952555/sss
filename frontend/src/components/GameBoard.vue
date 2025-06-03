<template>
  <div class="game-board-container">
    <!-- 游戏控制按钮 (例如开始游戏) -->
    <div v-if="currentGameState === 'waiting' && isRoomHost && canStartGame" class="game-controls">
      <button @click="$emit('startGame')" class="start-game-button">开始游戏</button>
    </div>
    <!-- AI模式下，开始游戏的按钮在 App.vue 控制 -->

    <!-- 玩家手牌展示和理牌区域 -->
    <div v-if="playerHand.length > 0 && (currentGameState === 'playing' || currentGameState === 'arranging' || currentGameState === 'showdown')" class="player-area">
      <h3 v-if="currentGameState !== 'showdown'">你的手牌 (拖拽理牌)</h3>
      <PlayerHandComponent
        v-if="currentGameState !== 'showdown'"
        title="未分配的牌"
        :cards="unassignedCards"
        :draggableCards="true"
        :droppable="true"
        segmentName="initial"
        @cardDropped="onCardDropped"
        @cardDragStart="onCardDragStart"
      />

      <div class="segments" :class="{ 'showdown-view': currentGameState === 'showdown' }">
        <PlayerHandComponent
          :title="currentGameState === 'showdown' ? '你的头墩' : '头墩 (3张)'"
          :cards="arrangedHand.front"
          :draggableCards="currentGameState !== 'showdown' && !currentPlayerIsReady"
          :droppable="currentGameState !== 'showdown' && !currentPlayerIsReady"
          segmentName="front"
          @cardDropped="onCardDropped"
          @cardDragStart="onCardDragStart"
        />
        <PlayerHandComponent
          :title="currentGameState === 'showdown' ? '你的中墩' : '中墩 (5张)'"
          :cards="arrangedHand.middle"
          :draggableCards="currentGameState !== 'showdown' && !currentPlayerIsReady"
          :droppable="currentGameState !== 'showdown' && !currentPlayerIsReady"
          segmentName="middle"
          @cardDropped="onCardDropped"
          @cardDragStart="onCardDragStart"
        />
        <PlayerHandComponent
          :title="currentGameState === 'showdown' ? '你的尾墩' : '尾墩 (5张)'"
          :cards="arrangedHand.back"
          :draggableCards="currentGameState !== 'showdown' && !currentPlayerIsReady"
          :droppable="currentGameState !== 'showdown' && !currentPlayerIsReady"
          segmentName="back"
          @cardDropped="onCardDropped"
          @cardDragStart="onCardDragStart"
        />
      </div>

      <button
        v-if="currentGameState === 'playing' && !currentPlayerIsReady"
        @click="onSubmitHand"
        :disabled="arrangedHand.front.length !== 3 || arrangedHand.middle.length !== 5 || arrangedHand.back.length !== 5 || unassignedCards.length > 0"
        class="submit-hand-button"
      >
        提交牌型 {{ validationMessage !== '可以提交' ? '('+validationMessage+')' : '' }}
      </button>
      <p v-if="currentPlayerIsReady && currentGameState === 'playing'">已提交，等待 AI...</p>
    </div>
    <div v-else-if="currentGameState === 'dealing'">
        <p>正在发牌，请稍候...</p>
    </div>
     <div v-else-if="playerHand.length === 0 && (currentGameState === 'waiting' || currentGameState === 'idle' || currentGameState === 'finished')">
        <p v-if="currentGameState === 'idle'">等待开始新牌局...</p>
        <p v-else>等待游戏开始...</p>
    </div>


    <!-- 比牌结果 和 AI 牌面 -->
    <div v-if="showdownResults && (currentGameState === 'showdown' || currentGameState === 'finished')" class="showdown-area">
        <h3>比牌结果</h3>
        <div v-if="showdownResults.comparisonDetails" class="comparison-summary">
            <p>头墩: {{ showdownResults.comparisonDetails.front }}</p>
            <p>中墩: {{ showdownResults.comparisonDetails.middle }}</p>
            <p>尾墩: {{ showdownResults.comparisonDetails.back }}</p>
            <h4>总结果: {{ showdownResults.winner || showdownResults.comparisonDetails.overallWinner }} 胜!</h4>
        </div>

        <div v-if="aiHandVisible && aiArrangedHand" class="ai-hand-showdown">
            <h4>电脑 AI 的牌</h4>
            <PlayerHandComponent title="AI 头墩" :cards="aiArrangedHand.front" :draggableCards="false" :droppable="false" segmentName="ai-front"/>
            <PlayerHandComponent title="AI 中墩" :cards="aiArrangedHand.middle" :draggableCards="false" :droppable="false" segmentName="ai-middle"/>
            <PlayerHandComponent title="AI 尾墩" :cards="aiArrangedHand.back" :draggableCards="false" :droppable="false" segmentName="ai-back"/>
        </div>
    </div>

    <!-- 移除了之前用于多人模式的 opponents-display-area -->

  </div>
</template>

<script setup>
import PlayerHandComponent from './PlayerHand.vue';
// CardComponent 可能被 PlayerHandComponent 内部使用，所以不需要在这里显式导入（除非你要直接用）

const props = defineProps({
  playerHand: { type: Array, default: () => [] },
  arrangedHand: { type: Object, default: () => ({ front: [], middle: [], back: [] }) },
  unassignedCards: { type: Array, default: () => [] },
  currentGameState: String, // 'idle', 'dealing', 'arranging', 'playing', 'showdown', 'finished'
  currentPlayerIsReady: Boolean,
  validationMessage: String,
  showdownResults: Object, // App.vue 提供的包含玩家和AI牌面及结果的对象
  isRoomHost: Boolean, // 在AI模式下，玩家总是“房主”
  canStartGame: Boolean, // 控制“开始游戏”按钮的显示 (AI模式下通常由App.vue的按钮控制)
  aiHandVisible: { type: Boolean, default: false }, // 控制是否显示AI的牌
  aiArrangedHand: { type: Object, default: () => ({ front: [], middle: [], back: [] }) } // AI的牌
});

const emit = defineEmits(['cardDragStart', 'cardDropped', 'submitHand', 'startGame']);

function onCardDragStart(payload) {
  // 只在玩家理牌阶段允许拖拽
  if (props.currentGameState === 'playing' && !props.currentPlayerIsReady) {
    emit('card-drag-start', payload);
  }
}

function onCardDropped(payload) {
  if (props.currentGameState === 'playing' && !props.currentPlayerIsReady) {
    emit('card-dropped', payload);
  }
}

function onSubmitHand() {
    emit('submit-hand');
}
</script>

<style scoped>
/* GameBoard.vue specific styles */
.game-board-container {
  border: 1px solid #90a4ae; /* 蓝灰色边框 */
  padding: 20px;
  margin-top: 15px;
  background-color: #f5f5f5; /* 非常浅的灰色背景，更像牌桌 */
  border-radius: 8px;
}
.player-area, .showdown-area, .game-controls {
  margin-bottom: 20px;
}
.segments {
  margin-top: 15px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.segments.showdown-view .player-hand-container {
    background-color: #e8eaf6; /* 比牌时墩的背景色 */
    border-style: solid;
}

.submit-hand-button, .start-game-button {
  margin-top: 15px;
  padding: 10px 18px;
  font-size: 1em;
  background-color: #5c6bc0; /* 靛蓝色 */
}
.submit-hand-button:disabled {
    background-color: #9fa8da;
}

.showdown-area {
    background-color: #fff9c4; /* 淡黄色背景 */
    padding: 15px;
    border-radius: 6px;
    border: 1px solid #fff59d;
}
.comparison-summary {
    margin-bottom: 15px;
    padding-bottom: 10px;
    border-bottom: 1px dashed #ccc;
}
.comparison-summary p {
    margin: 5px 0;
    font-size: 1.1em;
}
.comparison-summary h4 {
    color: #d32f2f; /* 红色突出赢家 */
    margin-top: 10px;
}

.ai-hand-showdown {
    margin-top: 20px;
    padding-top: 15px;
    border-top: 1px solid #ccc;
}
.ai-hand-showdown h4 {
    color: #1e88e5; /* 蓝色 */
}
.ai-hand-showdown .player-hand-container { /* AI的墩 */
    background-color: #fce4ec; /* 淡粉色 */
}

</style>
