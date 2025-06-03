<template>
  <div class="game-board-container game-board-flex-fill">
    <div v-if="currentGameState === 'waiting' && isRoomHost && canStartGame" class="game-controls">
      <button @click="$emit('startGame')" class="start-game-button">开始游戏</button>
    </div>

    <div v-if="playerHandInitial.length > 0 && (currentGameState === 'playing' || currentGameState === 'arranging' || currentGameState === 'showdown')" class="player-area player-area-flex-fill">
      <!-- 外部标题已移除 -->
      <!-- 1. 头墩 -->
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

      <!-- 2. 初始手牌区 / 或形成后的中墩 -->
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
      </div> <!-- Closing .segments div -->

      <button
        v-if="currentGameState === 'playing' && !currentPlayerIsReady"
        @click="onSubmitHandProxy"
        :disabled="validationMessage !== '可以提交'"
        class="submit-hand-button"
      >
        提交牌型 {{ validationMessage !== '可以提交' ? '('+validationMessage+')' : '' }}
      </button>
      <p v-if="currentPlayerIsReady && currentGameState === 'playing'">已提交，等待 AI...</p>
    </div> <!-- Closing .player-area div -->
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
  </div> <!-- Closing .game-board-container div -->
</template>

<script setup>
// Script 部分与之前相同
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
/* Style 部分与之前相同 */
.game-board-container {
  border: 1px solid #90a4ae;
  padding: 15px;
  margin-top: 0;
  background-color: #f5f5f5;
  border-radius: 0 0 8px 8px;
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  overflow: hidden;
}
.player-area {
  margin-bottom: 15px;
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  overflow-y: auto;
  padding: 10px;
}
.player-area-flex-fill {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
}
.dun-area {
  margin-bottom: 8px;
}
.initial-hand-area {
  margin-bottom: 8px;
}
.dun-area-expand .card-container {
    flex-grow: 1;
    min-height: 120px;
}
.segments {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.segments.showdown-view .player-hand-container {
    background-color: #e8eaf6;
    border-style: solid;
}
.submit-hand-button, .start-game-button {
  margin-top: 10px;
  padding: 10px 18px;
  font-size: 1em;
  background-color: #5c6bc0;
  align-self: center;
}
.submit-hand-button:disabled {
    background-color: #9fa8da;
}
.showdown-area {
    background-color: #fff9c4;
    padding: 15px;
    border-radius: 6px;
    border: 1px solid #fff59d;
    overflow-y: auto;
    max-height: 300px;
}
.message-area {
    flex-grow: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.1em;
    color: #546e7a;
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
