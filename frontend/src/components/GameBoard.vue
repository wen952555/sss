<template>
  <div class="game-board-container">
    <!-- 游戏控制按钮 (例如开始游戏) -->
    <div v-if="currentGameState === 'waiting' && isRoomHost && canStartGame" class="game-controls">
      <button @click="$emit('startGame')" class="start-game-button">开始游戏</button>
    </div>

    <div v-if="playerHandInitial.length > 0 && (currentGameState === 'playing' || currentGameState === 'arranging' || currentGameState === 'showdown')" class="player-area">
      <h3 v-if="currentGameState !== 'showdown'">你的手牌 (拖拽理牌)</h3>

      <!-- 1. 初始手牌区 / 或形成后的中墩 (现在显示在最上面，但逻辑上它仍然是“中间”或“初始”) -->
      <PlayerHandComponent
        :title="initialOrMiddleDunTitle"
        :cards="cardsForMiddleOrInitialArea"
        :draggableCards="currentGameState !== 'showdown' && !currentPlayerIsReady"
        :droppable="currentGameState !== 'showdown' && !currentPlayerIsReady"
        :segmentName="isDynamicMiddleDunActive ? 'middle' : 'initial_hand'"
        @cardDropped="onCardDropped"
        @cardDragStart="onCardDragStart"
        class="initial-hand-area" <!-- 添加一个class方便调整样式 -->
      />

      <div class="segments" :class="{ 'showdown-view': currentGameState === 'showdown' }">
        <!-- 2. 头墩 -->
        <PlayerHandComponent
          :title="currentGameState === 'showdown' ? '你的头墩' : '头墩 (3张)'"
          :cards="arrangedHand.front"
          :draggableCards="currentGameState !== 'showdown' && !currentPlayerIsReady"
          :droppable="currentGameState !== 'showdown' && !currentPlayerIsReady"
          segmentName="front"
          @cardDropped="onCardDropped"
          @cardDragStart="onCardDragStart"
        />

        <!-- 3. 中墩 (只有在摊牌时，且动态中墩激活时，作为一个独立的视觉区域显示) -->
        <!-- 如果希望在理牌时也看到一个明确的“中墩”占位符（即使牌在上面的区域），可以调整这里的 v-if -->
        <PlayerHandComponent
          v-if="isDynamicMiddleDunActive && currentGameState === 'showdown'"
          title="你的中墩"
          :cards="arrangedHand.middle"
          :draggableCards="false"
          :droppable="false"
          segmentName="middle_showdown_only"
        />
        <!-- 或者，如果你希望在理牌阶段，当头尾墩满了之后，上面的区域标签变为“中墩”，那么这里就不需要额外显示了 -->


        <!-- 4. 尾墩 -->
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
        :disabled="arrangedHand.front.length !== 3 || arrangedHand.middle.length !== 5 || arrangedHand.back.length !== 5"
        class="submit-hand-button"
      >
        提交牌型 {{ validationMessage !== '可以提交' ? '('+validationMessage+')' : '' }}
      </button>
      <p v-if="currentPlayerIsReady && currentGameState === 'playing'">已提交，等待 AI...</p>
    </div>
    <div v-else-if="currentGameState === 'dealing'">
        <p>正在发牌，请稍候...</p>
    </div>
     <div v-else-if="playerHandInitial.length === 0 && (currentGameState === 'waiting' || currentGameState === 'idle' || currentGameState === 'finished')">
        <p v-if="currentGameState === 'idle'">等待开始新牌局...</p>
        <p v-else>等待游戏开始...</p>
    </div>

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
            <!-- AI牌的显示顺序也应该调整，如果需要与玩家一致的视觉布局 -->
            <PlayerHandComponent title="AI 头墩" :cards="aiArrangedHand.front" :draggableCards="false" :droppable="false" segmentName="ai-front"/>
            <PlayerHandComponent title="AI 中墩" :cards="aiArrangedHand.middle" :draggableCards="false" :droppable="false" segmentName="ai-middle"/>
            <PlayerHandComponent title="AI 尾墩" :cards="aiArrangedHand.back" :draggableCards="false" :droppable="false" segmentName="ai-back"/>
        </div>
    </div>
  </div>
</template>

<script setup>
// ... (script 部分与之前相同，不需要修改)
import { computed } from 'vue';
import PlayerHandComponent from './PlayerHand.vue';

const props = defineProps({
  playerHandInitial: { type: Array, default: () => [] },
  arrangedHand: { type: Object, default: () => ({ front: [], middle: [], back: [] }) },
  currentGameState: String,
  currentPlayerIsReady: Boolean,
  validationMessage: String,
  showdownResults: Object,
  isRoomHost: Boolean,
  canStartGame: Boolean,
  aiHandVisible: { type: Boolean, default: false },
  aiArrangedHand: { type: Object, default: () => ({ front: [], middle: [], back: [] }) },
  isDynamicMiddleDunActive: { type: Boolean, default: false }
});

const emit = defineEmits(['cardDragStart', 'cardDropped', 'submitHand', 'startGame']);

const initialOrMiddleDunTitle = computed(() => {
  if (props.currentGameState === 'showdown' && props.isDynamicMiddleDunActive) return "你的中墩"; // 摊牌时，如果中墩激活，明确显示
  return props.isDynamicMiddleDunActive ? `中墩 (${props.arrangedHand.middle.length} cards)` : `手牌区/未分配 (${cardsForMiddleOrInitialArea.value.length} cards)`;
});

const cardsForMiddleOrInitialArea = computed(() => {
  if (props.isDynamicMiddleDunActive) {
    // 当中墩激活时，这个区域就代表中墩
    return props.arrangedHand.middle;
  } else {
    // 否则，它代表初始手牌区（未被分配到头墩或尾墩的牌）
    const assignedToFrontIds = new Set(props.arrangedHand.front.map(c => c.id));
    const assignedToBackIds = new Set(props.arrangedHand.back.map(c => c.id));
    return props.playerHandInitial.filter(
      c => !assignedToFrontIds.has(c.id) && !assignedToBackIds.has(c.id)
    );
  }
});

function onCardDragStart(payload) {
  if ((props.currentGameState === 'playing' || props.currentGameState === 'arranging') && !props.currentPlayerIsReady) {
    emit('card-drag-start', payload);
  }
}

function onCardDropped(payload) {
  if ((props.currentGameState === 'playing' || props.currentGameState === 'arranging') && !props.currentPlayerIsReady) {
    emit('card-dropped', payload);
  }
}

function onSubmitHand() {
    emit('submit-hand');
}
</script>

<style scoped>
/* ... (与之前 GameBoard.vue 相同的样式，但可以为 .initial-hand-area 添加特定样式) ... */
.game-board-container {
  border: 1px solid #90a4ae;
  padding: 20px;
  margin-top: 15px;
  background-color: #f5f5f5;
  border-radius: 8px;
}
.player-area, .showdown-area, .game-controls {
  margin-bottom: 20px;
}

/* 新增：确保初始手牌区/中墩在最上面 */
.initial-hand-area {
  margin-bottom: 20px; /* 和其他墩之间有点间距 */
}

.segments {
  margin-top: 15px; /* segments 整体的顶部间距可能不需要了，或者减少 */
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.segments.showdown-view .player-hand-container {
    background-color: #e8eaf6;
    border-style: solid;
}

.submit-hand-button, .start-game-button {
  margin-top: 15px;
  padding: 10px 18px;
  font-size: 1em;
  background-color: #5c6bc0;
}
.submit-hand-button:disabled {
    background-color: #9fa8da;
}

.showdown-area {
    background-color: #fff9c4;
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
    color: #d32f2f;
    margin-top: 10px;
}

.ai-hand-showdown {
    margin-top: 20px;
    padding-top: 15px;
    border-top: 1px solid #ccc;
}
.ai-hand-showdown h4 {
    color: #1e88e5;
}
.ai-hand-showdown .player-hand-container {
    background-color: #fce4ec;
}
</style>
