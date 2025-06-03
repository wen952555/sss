<template>
  <!-- Template is identical to the last working version -->
  <div class="game-board-container game-board-flex-fill">
    <div v-if="currentGameState === 'waiting' && isRoomHost && canStartGame" class="game-controls">
      <button @click="$emit('startGame')" class="start-game-button">开始游戏</button>
    </div>

    <div v-if="playerHandInitial.length > 0 && (currentGameState === 'playing' || currentGameState === 'arranging' || currentGameState === 'showdown')" class="player-area player-area-flex-fill">
      
      <PlayerHandComponent
        :placeholderText="placeholderForFront"
        :cards="arrangedHand.front"
        :draggableCards="currentGameState !== 'showdown' && !currentPlayerIsReady"
        :droppable="currentGameState !== 'showdown' && !currentPlayerIsReady"
        segmentName="front"
        @desktopCardDropped="passDesktopCardDropped"
        @customDragStart="passCustomDragStart"
        @customDragEnd="passCustomDragEnd"
        @customDragOverSegment="passCustomDragOverSegment"
        class="dun-area"
      />

      <PlayerHandComponent
        :placeholderText="placeholderForInitialOrMiddle"
        :cards="cardsForMiddleOrInitialArea"
        :draggableCards="currentGameState !== 'showdown' && !currentPlayerIsReady"
        :droppable="currentGameState !== 'showdown' && !currentPlayerIsReady"
        :segmentName="isDynamicMiddleDunActive ? 'middle' : 'initial_hand'"
        @desktopCardDropped="passDesktopCardDropped"
        @customDragStart="passCustomDragStart"
        @customDragEnd="passCustomDragEnd"
        @customDragOverSegment="passCustomDragOverSegment"
        class="initial-hand-area dun-area-expand"
      />

      <div class="segments" :class="{ 'showdown-view': currentGameState === 'showdown' }">
        <PlayerHandComponent
          v-if="isDynamicMiddleDunActive && currentGameState === 'showdown'"
          placeholderText="中墩 (5张)"
          :cards="arrangedHand.middle"
          :draggableCards="false"
          :droppable="false"
          segmentName="middle_showdown_only"
          class="dun-area"
        />
        <PlayerHandComponent
          :placeholderText="placeholderForBack"
          :cards="arrangedHand.back"
          :draggableCards="currentGameState !== 'showdown' && !currentPlayerIsReady"
          :droppable="currentGameState !== 'showdown' && !currentPlayerIsReady"
          segmentName="back"
          @desktopCardDropped="passDesktopCardDropped"
          @customDragStart="passCustomDragStart"
          @customDragEnd="passCustomDragEnd"
          @customDragOverSegment="passCustomDragOverSegment"
          class="dun-area"
        />
      </div>

      <button
        v-if="currentGameState === 'playing' && !currentPlayerIsReady"
        @click="onSubmitHandProxy"
        :disabled="validationMessage !== '可以提交'"
        class="submit-hand-button"
      >
        提交牌型 {{ validationMessage !== '可以提交' ? '('+validationMessage+')' : '' }}
      </button>
      <p v-if="currentPlayerIsReady && currentGameState === 'playing'" class="status-text">已提交，等待 AI...</p>
    </div>
    <div v-else-if="currentGameState === 'dealing'" class="message-area">
        <p>正在发牌，请稍候...</p>
    </div>
     <div v-else-if="playerHandInitial.length === 0 && (currentGameState === 'waiting' || currentGameState === 'idle' || currentGameState === 'finished')" class="message-area">
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
            <PlayerHandComponent placeholderText="AI 头墩" :cards="aiArrangedHand.front" :draggableCards="false" :droppable="false" segmentName="ai-front"/>
            <PlayerHandComponent placeholderText="AI 中墩" :cards="aiArrangedHand.middle" :draggableCards="false" :droppable="false" segmentName="ai-middle"/>
            <PlayerHandComponent placeholderText="AI 尾墩" :cards="aiArrangedHand.back" :draggableCards="false" :droppable="false" segmentName="ai-back"/>
        </div>
    </div>
  </div>
</template>

<script setup>
// Script is identical to the last working version
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

const emit = defineEmits([
    'desktopCardDropped',
    'customDragStart', 
    'customDragEnd', 
    'customDragOverSegment',
    'submitHand',
    'startGame'
]);

const initialOrMiddleDunTitle = computed(() => {
  if (props.currentGameState === 'showdown' && props.isDynamicMiddleDunActive) return "你的中墩";
  return props.isDynamicMiddleDunActive ? `中墩 (${props.arrangedHand.middle.length} cards)` : `手牌区/未分配 (${cardsForMiddleOrInitialArea.value.length} cards)`;
});
const cardsForMiddleOrInitialArea = computed(() => {
  if (props.isDynamicMiddleDunActive) {
    return props.arrangedHand.middle;
  } else {
    const assignedToFrontIds = new Set(props.arrangedHand.front.map(c => c.id));
    const assignedToBackIds = new Set(props.arrangedHand.back.map(c => c.id));
    const initialHand = Array.isArray(props.playerHandInitial) ? props.playerHandInitial : [];
    return initialHand.filter(
      c => !assignedToFrontIds.has(c.id) && !assignedToBackIds.has(c.id)
    );
  }
});
const placeholderForFront = computed(() => {
    const count = props.arrangedHand.front.length;
    if (props.currentGameState === 'showdown') return `你的头墩 (${count}/3)`;
    return `头墩 (${count}/3) - 拖拽牌到这里`;
});
const placeholderForInitialOrMiddle = computed(() => {
    const currentCards = cardsForMiddleOrInitialArea.value;
    const count = currentCards.length;
    if (props.currentGameState === 'showdown' && props.isDynamicMiddleDunActive) return `你的中墩 (${count}/5)`;
    const baseTitle = props.isDynamicMiddleDunActive ? `中墩` : `手牌区/未分配`;
    let requiredCount;
    if (props.isDynamicMiddleDunActive) {
        requiredCount = 5;
    } else {
        const initialTotal = Array.isArray(props.playerHandInitial) ? props.playerHandInitial.length : 0;
        requiredCount = initialTotal - props.arrangedHand.front.length - props.arrangedHand.back.length;
    }
    return `${baseTitle} (${count}/${requiredCount > 0 ? requiredCount : 0}) ${props.isDynamicMiddleDunActive || count > 0 ? '' : '- 拖拽牌到这里'}`;
});
const placeholderForBack = computed(() => {
    const count = props.arrangedHand.back.length;
    if (props.currentGameState === 'showdown') return `你的尾墩 (${count}/5)`;
    return `尾墩 (${count}/5) - 拖拽牌到这里`;
});

function passDesktopCardDropped(payload) { emit('desktopCardDropped', payload); }
function passCustomDragStart(payload) { emit('customDragStart', payload); }
function passCustomDragEnd(payload) { emit('customDragEnd', payload); }
function passCustomDragOverSegment(segmentName) { emit('customDragOverSegment', segmentName); }
function onSubmitHandProxy() { emit('submitHand'); }

</script>

<style scoped>
.game-board-container {
  /* background-color: transparent; */ /* GameBoard 背景由 App.vue 的 .game-area 控制 */
  padding: 10px 5px; /* GameBoard 内部的 padding */
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  overflow: hidden;
}

.player-area {
  margin-bottom: 10px;
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  overflow-y: auto; /* 允许理牌区域内部滚动 */
  padding: 5px;
  -webkit-overflow-scrolling: touch;
}
.player-area-flex-fill {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
}
.dun-area {
  margin-bottom: 6px;
}
.initial-hand-area {
  margin-bottom: 6px;
}
.dun-area-expand .card-container {
    flex-grow: 1;
    min-height: 100px; /* 调整回一个标准值，具体高度由内容和flexbox决定 */
}
.segments {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.segments.showdown-view .player-hand-container {
    background-color: rgba(200, 200, 255, 0.2); /* 淡紫色，更配合深绿 */
    border-style: solid;
    border-color: rgba(255,255,255,0.3);
}
.submit-hand-button, .start-game-button {
  margin-top: 10px;
  padding: 8px 15px;
  font-size: 0.95em;
  /* 按钮颜色已在 main.css 中定义，这里可以覆盖或特化 */
  align-self: center;
  width: 70%;
  max-width: 220px;
}

.status-text { /* 针对“已提交，等待AI”等文字 */
    text-align: center;
    margin-top: 10px;
    color: #e0e0e0; /* 浅色文字 */
    font-style: italic;
}

.showdown-area {
    background-color: rgba(0,0,0,0.1); /* 半透明深色背景，用于比牌结果 */
    color: #f5f5f5; /* 比牌结果文字用浅色 */
    padding: 10px;
    border-radius: 4px;
    /* border: 1px solid rgba(255,255,255,0.2); */ /* 可选的浅色边框 */
    overflow-y: auto;
    max-height: 35vh; /* 限制最大高度 */
    flex-shrink: 0;
}
.showdown-area h3, .showdown-area h4 {
    color: #fff; /* 标题用白色 */
}
.comparison-summary p {
    font-size: 1em;
}
.comparison-summary h4 {
    color: #ffeb3b; /* 赢家高亮用黄色 */
}
.ai-hand-showdown h4 {
    color: #bbdefb; /* AI 标题用浅蓝色 */
}
.ai-hand-showdown .player-hand-container { /* AI 的牌墩背景 */
    background-color: rgba(0,0,0,0.05);
}
.message-area {
    flex-grow: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.1em;
    color: #b0bec5;
    padding: 15px;
}
</style>
