<template>
  <!-- ... (template 与上一版几乎相同, 确保 GameBoardComponent 的事件监听正确) ... -->
  <div id="app-container" class="app-flex-container">
    <div v-if="generalError" class="error global-error">{{ generalError }}</div>

    <div class="game-area app-flex-grow">
      <div class="top-info-bar">
        <div class="game-status-mode">
          模式: AI 练习 | 游戏状态: {{ currentLocalGameState }}
        </div>
        <div class="player-statuses-inline">
          <div class="player-status-item">
            <strong>你 ({{ playerName }}):</strong>
            <span v-if="currentLocalGameState === 'arranging' || currentLocalGameState === 'showdown'">
              {{ playerIsReady ? '已提交' : '理牌中...' }}
            </span>
            <span v-else> - </span>
          </div>
          <div class="player-status-item">
            <strong>电脑 AI:</strong>
            <span v-if="currentLocalGameState === 'arranging' || currentLocalGameState === 'showdown'">
              {{ aiIsReady ? '已提交' : '思考中...' }}
            </span>
            <span v-else> - </span>
          </div>
        </div>
        <button @click="startNewAIGame" :disabled="isDealing" class="restart-button-inline">
          {{ playerHandInitial.length > 0 ? '重新开始' : '开始牌局' }}
        </button>
      </div>

      <GameBoardComponent
        v-if="playerHandInitial.length > 0 || currentLocalGameState === 'showdown'"
        :playerHandInitial="playerHandInitial"
        :arrangedHand="playerArrangedHand"
        :currentGameState="currentLocalGameState === 'arranging' && !playerIsReady ? 'playing' : currentLocalGameState"
        :currentPlayerIsReady="playerIsReady"
        :validationMessage="validationMessage"
        :showdownResults="showdownResultsForBoard"
        :isRoomHost="true"
        :canStartGame="false"
        @card-drag-start="handleDragStartLogic"
        @card-dropped="handleDesktopDropLogic" <!-- 重命名桌面drop处理 -->
        @card-drag-end="handleTouchDragEndLogic"   <!-- 重命名触摸drag end处理 -->
        @card-drag-over-segment="handleDragOverSegmentLogic"
        :aiHandVisible="currentLocalGameState === 'showdown'"
        :aiArrangedHand="aiArrangedHand"
        :isDynamicMiddleDunActive="isDynamicMiddleDunActive"
        class="game-board-main-area app-flex-grow"
      />
      <div v-else-if="currentLocalGameState === 'idle' && !isDealing" class="idle-message app-flex-grow">
        <p>点击“开始牌局”与 AI 对战。</p>
      </div>
       <div v-if="isDealing" class="dealing-message app-flex-grow">
        <p>正在发牌...</p>
      </div>
    </div>
  </div>
</template>

<script setup>
// ... (大部分 script 与之前相同) ...
import { ref, computed, reactive, onMounted } from 'vue';
import GameBoardComponent from './components/GameBoard.vue';
import Deck from './game_logic_local/Deck';
import { Card } from './game_logic_local/Card';

const playerName = ref("玩家");
const currentLocalGameState = ref('idle');
const playerHandInitial = ref([]);
const aiHand = ref([]);
const playerArrangedHand = reactive({ front: [], middle: [], back: [] });
const aiArrangedHand = reactive({ front: [], middle: [], back: [] });
const playerIsReady = ref(false);
const aiIsReady = ref(false);
const showdownResults = ref(null);
const generalError = ref('');
const isDealing = ref(false);

let activeDraggedCardInfo = null; // { card, fromSegment }
// currentDragOverSegment 不再由 App.vue 管理，由 Card.vue 在 touchend 时直接传递最终目标

const isDynamicMiddleDunActive = computed(() => { /* ... (不变) ... */
  return playerArrangedHand.front.length === 3 && playerArrangedHand.back.length === 5;
});
const validationMessage = computed(() => { /* ... (不变) ... */
  if (playerArrangedHand.front.length !== 3) return "头墩需3张牌";
  if (playerArrangedHand.middle.length !== 5) return "中墩需5张牌";
  if (playerArrangedHand.back.length !== 5) return "尾墩需5张牌";
  const allPlayerCardsInDuns = new Set([
      ...playerArrangedHand.front.map(c => c.id),
      ...playerArrangedHand.middle.map(c => c.id),
      ...playerArrangedHand.back.map(c => c.id)
  ]);
  if (allPlayerCardsInDuns.size !== 13) return "牌未分配完整或有重复";
  for (const dun of [playerArrangedHand.front, playerArrangedHand.middle, playerArrangedHand.back]) {
      for (const card of dun) {
          if (!playerHandInitial.value.find(initialCard => initialCard.id === card.id)) {
              return "墩内包含无效的牌";
          }
      }
  }
  return "可以提交";
});
const showdownResultsForBoard = computed(() => { /* ... (不变) ... */
    if (!showdownResults.value) return null;
    const results = {};
    if (showdownResults.value.player) {
        results[playerName.value] = {
            name: playerName.value,
            arrangedHand: showdownResults.value.player.arrangedHand,
        };
    }
    if (showdownResults.value.ai) {
         results['电脑 AI'] = {
            name: '电脑 AI',
            arrangedHand: showdownResults.value.ai.arrangedHand,
        };
    }
    if(showdownResults.value.comparisonDetails){
        results.comparisonDetails = showdownResults.value.comparisonDetails;
    }
    return results;
});


function startNewAIGame() { /* ... (不变) ... */
  isDealing.value = true;
  generalError.value = '';
  currentLocalGameState.value = 'dealing';
  playerHandInitial.value = [];
  aiHand.value = [];
  playerArrangedHand.front = []; playerArrangedHand.middle = []; playerArrangedHand.back = [];
  aiArrangedHand.front = []; aiArrangedHand.middle = []; aiArrangedHand.back = [];
  playerIsReady.value = false;
  aiIsReady.value = false;
  showdownResults.value = null;

  setTimeout(() => {
    const deck = new Deck();
    deck.shuffle();
    playerHandInitial.value = deck.deal(13).sort((a,b) => rankCard(a) - rankCard(b));
    aiHand.value = deck.deal(13).sort((a,b) => rankCard(a) - rankCard(b));
    currentLocalGameState.value = 'arranging';
    isDealing.value = false;
  }, 500);
}

function rankCard(card) { /* ... (不变) ... */
    const valueOrder = ['2','3','4','5','6','7','8','9','10','jack','queen','king','ace'];
    const suitOrder = ['clubs', 'diamonds', 'hearts', 'spades'];
    return valueOrder.indexOf(card.value) * 4 + suitOrder.indexOf(card.suit);
}


function handleDragStartLogic(payload) { // payload: { card, fromSegment }
  activeDraggedCardInfo = { card: payload.card, fromSegment: payload.fromSegment };
}

// 桌面拖拽的放置逻辑
function handleDesktopDropLogic(payload) { // payload: { card, toSegment }
  if (!activeDraggedCardInfo || activeDraggedCardInfo.card.id !== payload.card.id) {
      console.warn("Mismatched card on desktop drop or no active drag.");
      activeDraggedCardInfo = null; // 清理以防万一
      return;
  }
  const fromSegmentName = activeDraggedCardInfo.fromSegment;
  const toSegmentName = payload.toSegment;

  if (!toSegmentName || fromSegmentName === toSegmentName) {
    activeDraggedCardInfo = null;
    return;
  }
  performCardMove(activeDraggedCardInfo.card, fromSegmentName, toSegmentName);
  activeDraggedCardInfo = null;
}

// 触摸拖拽结束时的放置逻辑
function handleTouchDragEndLogic(payload) { // payload: { card, targetSegment }
    if (!activeDraggedCardInfo || activeDraggedCardInfo.card.id !== payload.card.id) {
        console.warn("Mismatched card on touch end or no active drag.");
        activeDraggedCardInfo = null;
        return;
    }

    const toSegmentName = payload.targetSegment; // 目标区域由 Card.vue 在 touchend 时确定
    const fromSegmentName = activeDraggedCardInfo.fromSegment;

    if (toSegmentName && toSegmentName !== fromSegmentName) {
        performCardMove(activeDraggedCardInfo.card, fromSegmentName, toSegmentName);
    }
    // 如果 toSegmentName 为 null 或与 fromSegmentName 相同，则牌逻辑上回到原位（不执行移动）
    activeDraggedCardInfo = null;
}

function handleDragOverSegmentLogic(segmentName) {
    // 这个事件现在主要是为了在 Card.vue 中提供视觉反馈（比如高亮可放置区域）
    // App.vue 不需要直接用它来更新 currentDragOverSegment 了，
    // 因为最终的 targetSegment 会在 touchend 时由 Card.vue 传递过来。
    // 如果需要 App.vue 层面的视觉反馈，可以在这里设置一个 ref。
    // console.log('Hovering over segment (touch):', segmentName);
}


function performCardMove(cardToMove, fromSegmentName, toSegmentName) {
  // ... (performCardMove 函数与上一版完全相同，不限制数量) ...
  if (!cardToMove || typeof cardToMove.id === 'undefined') {
    console.error("Attempted to move an invalid card object:", cardToMove);
    return;
  }
  if (fromSegmentName !== 'initial_hand' && playerArrangedHand[fromSegmentName]) {
    const arr = playerArrangedHand[fromSegmentName];
    if (Array.isArray(arr)) {
        const index = arr.findIndex(c => c && c.id === cardToMove.id);
        if (index > -1) {
          arr.splice(index, 1);
        }
    }
  }
  const targetSegmentArray = playerArrangedHand[toSegmentName];
  if (targetSegmentArray && Array.isArray(targetSegmentArray)) {
    if (!targetSegmentArray.find(c => c && c.id === cardToMove.id)) {
      targetSegmentArray.push(cardToMove);
      targetSegmentArray.sort((a, b) => rankCard(a) - rankCard(b));
    } else {
      if (fromSegmentName !== 'initial_hand' && 
          playerArrangedHand[fromSegmentName] && 
          Array.isArray(playerArrangedHand[fromSegmentName]) &&
          !playerArrangedHand[fromSegmentName].find(c => c && c.id === cardToMove.id)) {
        playerArrangedHand[fromSegmentName].push(cardToMove);
        playerArrangedHand[fromSegmentName].sort((a, b) => rankCard(a) - rankCard(b));
      }
    }
  } else if (toSegmentName === 'initial_hand') {
    // Card is moved back to the conceptual "initial area"
  }

  // Auto-fill middle dun logic
  if (playerArrangedHand.front.length === 3 && playerArrangedHand.back.length === 5) {
      const assignedToFrontIds = new Set(playerArrangedHand.front.filter(c => c).map(c => c.id));
      const assignedToBackIds = new Set(playerArrangedHand.back.filter(c => c).map(c => c.id));
      let middleCandidates = playerHandInitial.value.filter(
          c => c && !assignedToFrontIds.has(c.id) && !assignedToBackIds.has(c.id)
      );
      const currentMiddleCards = playerArrangedHand.middle.filter(
          c => c && !assignedToFrontIds.has(c.id) && !assignedToBackIds.has(c.id)
      );
      const currentMiddleIds = new Set(currentMiddleCards.map(c => c.id));
      let finalMiddle = [...currentMiddleCards];
      for (const candidate of middleCandidates) {
          if (candidate && finalMiddle.length < 5 && !currentMiddleIds.has(candidate.id)) {
              finalMiddle.push(candidate);
              currentMiddleIds.add(candidate.id);
          }
      }
      playerArrangedHand.middle = finalMiddle.slice(0,5).sort((a,b) => rankCard(a) - rankCard(b));
  }
}


function submitPlayerHand() { /* ... (不变) ... */
  if (validationMessage.value !== "可以提交") {
    generalError.value = "牌型不符合要求: " + validationMessage.value;
    return;
  }
  playerIsReady.value = true;
  generalError.value = '';
  aiProcessHand();
  checkForShowdown();
}
function aiProcessHand() { /* ... (不变) ... */
  const handToArrange = [...aiHand.value];
  handToArrange.sort(() => 0.5 - Math.random());
  aiArrangedHand.front = handToArrange.slice(0, 3).sort((a,b) => rankCard(a) - rankCard(b));
  aiArrangedHand.middle = handToArrange.slice(3, 8).sort((a,b) => rankCard(a) - rankCard(b));
  aiArrangedHand.back = handToArrange.slice(8, 13).sort((a,b) => rankCard(a) - rankCard(b));
  aiIsReady.value = true;
}
function checkForShowdown() { /* ... (不变) ... */
  if (playerIsReady.value && aiIsReady.value) {
    currentLocalGameState.value = 'showdown';
    showdownResults.value = compareHands(playerArrangedHand, aiArrangedHand);
  }
}
function getHandType(dun) { /* ... (不变) ... */
    if (!dun || dun.length === 0) return { type: '乌龙', rank: 0, cards: dun, description: '乌龙' };
    if (dun.length === 3) {
        const values = dun.map(c => c.value);
        if (values[0] === values[1] && values[1] === values[2]) {
             return { type: '三条', rank: 4, cards: dun, description: `三条-${values[0]}` };
        }
    }
    return { type: '乌龙', rank: 0, cards: dun, description: '乌龙' };
}
function compareSingleDuns(playerDun, aiDun) { /* ... (不变) ... */
    const playerType = getHandType(playerDun);
    const aiType = getHandType(aiDun);
    if (playerType.rank > aiType.rank) return 1;
    if (playerType.rank < aiType.rank) return -1;
    const playerMaxRank = playerDun.length > 0 ? Math.max(...playerDun.map(c => rankCard(c))) : -1;
    const aiMaxRank = aiDun.length > 0 ? Math.max(...aiDun.map(c => rankCard(c))) : -1;
    if (playerMaxRank > aiMaxRank) return 1;
    if (playerMaxRank < aiMaxRank) return -1;
    return 0;
}
function compareHands(pHand, aHand) { /* ... (不变) ... */
  let playerScore = 0;
  let aiScore = 0;
  const comparisonDetails = {
      front: '', middle: '', back: '', overallWinner: ''
  };
  const frontResult = compareSingleDuns(pHand.front, aHand.front);
  if (frontResult > 0) { playerScore++; comparisonDetails.front = '玩家胜'; }
  else if (frontResult < 0) { aiScore++; comparisonDetails.front = 'AI胜'; }
  else { comparisonDetails.front = '平'; }
  const middleResult = compareSingleDuns(pHand.middle, aHand.middle);
  if (middleResult > 0) { playerScore++; comparisonDetails.middle = '玩家胜'; }
  else if (middleResult < 0) { aiScore++; comparisonDetails.middle = 'AI胜'; }
  else { comparisonDetails.middle = '平'; }
  const backResult = compareSingleDuns(pHand.back, aHand.back);
  if (backResult > 0) { playerScore++; comparisonDetails.back = '玩家胜'; }
  else if (backResult < 0) { aiScore++; comparisonDetails.back = 'AI胜'; }
  else { comparisonDetails.back = '平'; }
  if (playerScore > aiScore) comparisonDetails.overallWinner = playerName.value;
  else if (aiScore > playerScore) comparisonDetails.overallWinner = '电脑 AI';
  else comparisonDetails.overallWinner = '平局';
  return {
    player: { arrangedHand: pHand, score: playerScore },
    ai: { arrangedHand: aHand, score: aiScore },
    winner: comparisonDetails.overallWinner,
    comparisonDetails
  };
}
onMounted(() => {
  currentLocalGameState.value = 'idle';
});
</script>

<style scoped>
/* ... (App.vue 的样式与上一版相同) ... */
.app-flex-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  height: 100%;
  background-color: #e0e0e0;
  padding: 5px;
  box-sizing: border-box;
  overflow: hidden;
}
.global-error {
  margin-bottom: 10px;
  flex-shrink: 0;
}
.game-area {
  border: 1px solid #90a4ae;
  background-color: #f5f5f5;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.app-flex-grow {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.top-info-bar {
  background-color: #b0bec5;
  padding: 6px 10px;
  border-radius: 4px 4px 0 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85em;
  flex-shrink: 0;
  flex-wrap: wrap;
  gap:5px;
}
.game-status-mode {
  margin-right: auto;
}
.player-statuses-inline {
  display: flex;
  gap: 10px;
  flex-wrap: nowrap;
  overflow-x: auto;
}
.player-status-item {
  display: flex;
  align-items: center;
  gap: 5px;
  white-space: nowrap;
}
.player-status-item strong {
  color: #37474f;
}
.restart-button-inline {
  background-color: #00796b !important;
  padding: 6px 10px !important;
  font-size: 0.9em !important;
  white-space: nowrap;
}
.game-board-main-area {
  margin-top: 0;
  border-top-left-radius: 0;
  border-top-right-radius: 0;
}
.idle-message, .dealing-message {
    text-align: center;
    padding: 20px;
    font-size: 1.1em;
    color: #546e7a;
    flex-grow: 1;
    display: flex;
    align-items: center;
    justify-content: center;
}
.error {
    background-color: #ffcdd2;
    color: #c62828;
    padding: 10px;
    border-radius: 4px;
    margin-bottom: 10px;
    border: 1px solid #ef9a9a;
}
</style>
