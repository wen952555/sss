<template>
  <!-- Template is identical to the last working version -->
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
        @custom-drag-start="handleDragStartLogic"
        @desktop-card-dropped="handleDesktopDropLogic"
        @custom-drag-end="handleTouchDragEndLogic"
        @custom-drag-over-segment="handleDragOverSegmentLogic"
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
// Script is identical to the last working version
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
let activeDraggedCardInfo = null;

const isDynamicMiddleDunActive = computed(() => {
  return playerArrangedHand.front.length === 3 && playerArrangedHand.back.length === 5;
});

const validationMessage = computed(() => {
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

const showdownResultsForBoard = computed(() => {
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

function startNewAIGame() {
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

function rankCard(card) {
    const valueOrder = ['2','3','4','5','6','7','8','9','10','jack','queen','king','ace'];
    const suitOrder = ['clubs', 'diamonds', 'hearts', 'spades'];
    return valueOrder.indexOf(card.value) * 4 + suitOrder.indexOf(card.suit);
}

function handleDragStartLogic(payload) {
  activeDraggedCardInfo = { card: payload.card, fromSegment: payload.fromSegment };
}

function handleDesktopDropLogic(payload) {
  if (!activeDraggedCardInfo || activeDraggedCardInfo.card.id !== payload.card.id) {
      activeDraggedCardInfo = null; return;
  }
  const fromSegmentName = activeDraggedCardInfo.fromSegment;
  const toSegmentName = payload.toSegment;
  if (!toSegmentName || fromSegmentName === toSegmentName) {
    activeDraggedCardInfo = null; return;
  }
  performCardMove(activeDraggedCardInfo.card, fromSegmentName, toSegmentName);
  activeDraggedCardInfo = null;
}

function handleTouchDragEndLogic(payload) {
    if (!activeDraggedCardInfo || !payload || activeDraggedCardInfo.card.id !== payload.card.id) {
        activeDraggedCardInfo = null;
        return;
    }
    const toSegmentName = payload.targetSegment;
    const fromSegmentName = activeDraggedCardInfo.fromSegment;
    if (toSegmentName && toSegmentName !== fromSegmentName) {
        performCardMove(activeDraggedCardInfo.card, fromSegmentName, toSegmentName);
    }
    activeDraggedCardInfo = null;
}

function handleDragOverSegmentLogic(segmentName) {
    // For visual feedback
}

function performCardMove(cardToMove, fromSegmentName, toSegmentName) {
  if (!cardToMove || typeof cardToMove.id === 'undefined') {
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
    // Card is moved back
  } else {
      if (fromSegmentName !== 'initial_hand' && playerArrangedHand[fromSegmentName] &&
          Array.isArray(playerArrangedHand[fromSegmentName]) &&
          !playerArrangedHand[fromSegmentName].find(c => c && c.id === cardToMove.id) ) {
          playerArrangedHand[fromSegmentName].push(cardToMove);
          playerArrangedHand[fromSegmentName].sort((a, b) => rankCard(a) - rankCard(b));
      }
  }

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

function submitPlayerHand() {
  if (validationMessage.value !== "可以提交") {
    generalError.value = "牌型不符合要求: " + validationMessage.value;
    return;
  }
  playerIsReady.value = true;
  generalError.value = '';
  aiProcessHand();
  checkForShowdown();
}
function aiProcessHand() {
  const handToArrange = [...aiHand.value];
  handToArrange.sort(() => 0.5 - Math.random());
  aiArrangedHand.front = handToArrange.slice(0, 3).sort((a,b) => rankCard(a) - rankCard(b));
  aiArrangedHand.middle = handToArrange.slice(3, 8).sort((a,b) => rankCard(a) - rankCard(b));
  aiArrangedHand.back = handToArrange.slice(8, 13).sort((a,b) => rankCard(a) - rankCard(b));
  aiIsReady.value = true;
}
function checkForShowdown() {
  if (playerIsReady.value && aiIsReady.value) {
    currentLocalGameState.value = 'showdown';
    showdownResults.value = compareHands(playerArrangedHand, aiArrangedHand);
  }
}
function getHandType(dun) {
    if (!dun || dun.length === 0) return { type: '乌龙', rank: 0, cards: dun, description: '乌龙' };
    if (dun.length === 3) {
        const values = dun.map(c => c.value);
        if (values[0] === values[1] && values[1] === values[2]) {
             return { type: '三条', rank: 4, cards: dun, description: `三条-${values[0]}` };
        }
    }
    return { type: '乌龙', rank: 0, cards: dun, description: '乌龙' };
}
function compareSingleDuns(playerDun, aiDun) {
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
function compareHands(pHand, aHand) {
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
.app-flex-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh; /* 确保占满视口高度 */
  height: 100%; /* 尝试强制高度，与body, html的100%配合 */
  /* background-color: #fff; */ /* App 的背景由 main.css 的 body 控制 */
  padding: 8px; /* 手机上整体边距小一点 */
  box-sizing: border-box;
  overflow: hidden; /* 防止 App 级别滚动 */
}

.global-error {
  margin-bottom: 10px;
  flex-shrink: 0;
}

.game-area {
  /* border: 1px solid #78909c; */ /* 边框颜色可以淡一些或与背景融合 */
  background-color: transparent; /* 让 App 的深绿色背景透出来 */
  /* border-radius: 6px; */ /* 可以不需要圆角，如果希望与App边缘对齐 */
  display: flex;
  flex-direction: column;
  flex-grow: 1; /* 占据父元素（.app-flex-container）的剩余空间 */
  overflow: hidden; /* 确保 game-area 内部滚动 */
  padding: 0; /* 移除 game-area 的 padding，让子元素控制 */
}

.top-info-bar {
  background-color: rgba(0, 0, 0, 0.2); /* 在深绿色背景上的半透明深色条 */
  color: #e0e0e0; /* 信息栏文字用浅色 */
  padding: 6px 10px;
  /* border-radius: 4px 4px 0 0; */ /* 如果 game-area 无圆角，这里也不需要 */
  margin-bottom: 8px; /* 与下方牌桌的间距 */
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85em;
  flex-shrink: 0;
  flex-wrap: wrap;
  gap:5px;
}
.player-status-item strong {
  color: #fff; /* 玩家名字用更亮的颜色 */
}
.restart-button-inline {
  background-color: #004d40 !important; /* 更深的绿色按钮 */
  border: 1px solid #00695c;
  color: #e0f2f1 !important;
  padding: 5px 8px !important; /* 按钮再小一点 */
  font-size: 0.85em !important;
}
.restart-button-inline:hover {
    background-color: #00695c !important;
}


.game-board-main-area {
  margin-top: 0;
  /* border-radius and border-top related styles can be removed if game-area has no border/radius */
}

.idle-message, .dealing-message {
    text-align: center;
    padding: 20px;
    font-size: 1.1em;
    color: #b0bec5; /* 在深绿色背景上，提示文字用浅灰色 */
    flex-grow: 1;
    display: flex;
    align-items: center;
    justify-content: center;
}
.error { /* 这个是通用的错误提示，颜色也需要调整 */
    background-color: #ffccbc; /* 浅橙色背景 */
    color: #bf360c; /* 深橙色文字 */
    padding: 10px;
    border-radius: 4px;
    margin-bottom: 10px;
    border: 1px solid #ffab91;
}
</style>
