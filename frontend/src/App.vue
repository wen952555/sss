<template>
  <div id="app-container" class="app-flex-container">
    <!-- ... (template 其他部分与上一版类似，确保 GameBoardComponent 监听新的事件) ... -->
    <div v-if="generalError" class="error global-error">{{ generalError }}</div>

    <div class="game-area app-flex-grow">
      <div class="top-info-bar">
        <!-- ... top-info-bar 内容 ... -->
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
        @card-drag-start="handleDragStartLogic" <!-- 改为统一的拖拽开始处理 -->
        @card-dropped="handleDropLogic"       <!-- 桌面端 drop -->
        @card-drag-end="handleDragEndLogic"   <!-- 触摸端 drag end -->
        @card-drag-over-segment="handleDragOverSegmentLogic" <!-- 触摸端 drag over -->
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
// ... (大部分 imports 和 refs 与之前相同) ...
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

// --- 拖拽状态 ---
let activeDraggedCardInfo = null; // { card, fromSegment }
let currentDragOverSegment = null; // 触摸拖拽时，当前悬停的segment

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

// --- 统一的拖拽处理逻辑 ---
function handleDragStartLogic(payload) { // payload: { card, fromSegment, event? }
  activeDraggedCardInfo = { card: payload.card, fromSegment: payload.fromSegment };
  currentDragOverSegment = null; // 重置悬停区
}

function handleDragOverSegmentLogic(segmentName) { // 触摸拖拽时，卡片悬停在哪个区域
    currentDragOverSegment = segmentName;
    // 可以在这里给悬停的 segment 添加视觉反馈 (通过修改一个 ref，让 PlayerHandComponent 响应)
}

function handleDropLogic(payload) { // payload: { card, toSegment, type: 'desktop' | undefined }
  // 这个函数现在主要由桌面端的原生 drop 事件触发，或者由触摸的 dragEnd 逻辑调用
  if (!activeDraggedCardInfo) return;

  const cardToMove = activeDraggedCardInfo.card;
  const fromSegmentName = activeDraggedCardInfo.fromSegment;
  const toSegmentName = payload.toSegment; // 对于桌面 drop，toSegment 直接来自 PlayerHand

  if (!toSegmentName || fromSegmentName === toSegmentName) {
    activeDraggedCardInfo = null;
    currentDragOverSegment = null;
    return;
  }

  performCardMove(cardToMove, fromSegmentName, toSegmentName);
  
  activeDraggedCardInfo = null;
  currentDragOverSegment = null;
}

function handleDragEndLogic() { // 触摸拖拽结束时触发 payload: { card, event }
    if (!activeDraggedCardInfo) return;

    // 在触摸结束时，我们依赖 currentDragOverSegment 来确定放置目标
    if (currentDragOverSegment && currentDragOverSegment !== activeDraggedCardInfo.fromSegment) {
        performCardMove(activeDraggedCardInfo.card, activeDraggedCardInfo.fromSegment, currentDragOverSegment);
    }
    // 如果没有有效的 currentDragOverSegment，牌会回到原处（通过不执行移动）

    activeDraggedCardInfo = null;
    currentDragOverSegment = null;
}


function performCardMove(cardToMove, fromSegmentName, toSegmentName) {
  // 1. 从原位置移除
  if (fromSegmentName !== 'initial_hand' && playerArrangedHand[fromSegmentName]) {
    const index = playerArrangedHand[fromSegmentName].findIndex(c => c.id === cardToMove.id);
    if (index > -1) {
      playerArrangedHand[fromSegmentName].splice(index, 1);
    }
  }

  // 2. 添加到新位置 (不限制数量，只检查是否已存在)
  const targetSegmentArray = playerArrangedHand[toSegmentName];
  if (targetSegmentArray) {
    if (!targetSegmentArray.find(c => c.id === cardToMove.id)) {
      targetSegmentArray.push(cardToMove);
      targetSegmentArray.sort((a, b) => rankCard(a) - rankCard(b));
    } else {
      // 牌已存在，尝试放回原处 (如果不是从 initial_hand 来的)
      if (fromSegmentName !== 'initial_hand' && playerArrangedHand[fromSegmentName] && 
          !playerArrangedHand[fromSegmentName].find(c => c.id === cardToMove.id)) {
        playerArrangedHand[fromSegmentName].push(cardToMove);
        playerArrangedHand[fromSegmentName].sort((a, b) => rankCard(a) - rankCard(b));
      }
    }
  } else if (toSegmentName === 'initial_hand') {
    // 牌被拖回到概念上的“初始区域”
    // 确保它从某个墩中被移除了
  }

  // 自动填充中墩逻辑
  if (playerArrangedHand.front.length === 3 && playerArrangedHand.back.length === 5) {
      const assignedToFrontIds = new Set(playerArrangedHand.front.map(c => c.id));
      const assignedToBackIds = new Set(playerArrangedHand.back.map(c => c.id));
      let middleCandidates = playerHandInitial.value.filter(
          c => !assignedToFrontIds.has(c.id) && !assignedToBackIds.has(c.id)
      );
      const currentMiddleCards = playerArrangedHand.middle.filter(
          c => !assignedToFrontIds.has(c.id) && !assignedToBackIds.has(c.id)
      );
      const currentMiddleIds = new Set(currentMiddleCards.map(c => c.id));
      let finalMiddle = [...currentMiddleCards];
      for (const candidate of middleCandidates) {
          if (finalMiddle.length < 5 && !currentMiddleIds.has(candidate.id)) {
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
/* ... (App.vue 的样式与上一版类似，确保响应式) ... */
.app-flex-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  height: 100%; /* 强制占满 */
  background-color: #e0e0e0;
  padding: 5px;
  box-sizing: border-box;
  overflow: hidden; /* 防止整个 app 滚动 */
}
.global-error {
  margin-bottom: 10px;
  flex-shrink: 0; /* 防止错误信息被压缩 */
}
.game-area {
  border: 1px solid #90a4ae;
  background-color: #f5f5f5;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  overflow: hidden; /* 确保 game-area 内部滚动，而不是整个页面 */
}
.app-flex-grow {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  min-height: 0; /* 对于 flex 子元素，允许其收缩而不是溢出 */
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
  /* flex-grow: 1; GameBoard 自己会处理 */
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
