<template>
  <div id="app-container" class="app-flex-container"> <!-- 添加 class -->
    <div v-if="generalError" class="error global-error">{{ generalError }}</div>

    <div class="game-area app-flex-grow"> <!-- 添加 class -->
      <div class="top-info-bar">
        <!-- ... (top-info-bar 内容不变) ... -->
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
        @card-drag-start="handleCardDragStart"
        @card-dropped="handleCardDrop"
        @submit-hand="submitPlayerHand"
        :aiHandVisible="currentLocalGameState === 'showdown'"
        :aiArrangedHand="aiArrangedHand"
        :isDynamicMiddleDunActive="isDynamicMiddleDunActive"
        class="game-board-main-area app-flex-grow" <!-- 添加 class -->
      />
      <div v-else-if="currentLocalGameState === 'idle' && !isDealing" class="idle-message">
        <p>点击“开始牌局”与 AI 对战。</p>
      </div>
       <div v-if="isDealing" class="dealing-message">
        <p>正在发牌...</p>
      </div>
    </div>
  </div>
</template>

<script setup>
// ... (大部分 script 内容不变) ...
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
let draggedCardInfo = null;

const isDynamicMiddleDunActive = computed(() => {
  return playerArrangedHand.front.length === 3 && playerArrangedHand.back.length === 5;
});

// validationMessage 现在只在提交时进行严格的 3-5-5 校验
const validationMessage = computed(() => {
  if (playerArrangedHand.front.length !== 3) return "头墩需3张牌";
  if (playerArrangedHand.middle.length !== 5) return "中墩需5张牌";
  if (playerArrangedHand.back.length !== 5) return "尾墩需5张牌";
  // 确保所有13张牌都被分配到了这三墩中
  const allPlayerCardsInDuns = new Set([
      ...playerArrangedHand.front.map(c => c.id),
      ...playerArrangedHand.middle.map(c => c.id),
      ...playerArrangedHand.back.map(c => c.id)
  ]);
  if (allPlayerCardsInDuns.size !== 13) return "牌未分配完整或有重复";
  // 确保分配到墩的牌都来自初始手牌
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

function handleCardDragStart(payload) { /* ... (不变) ... */
  draggedCardInfo = payload;
}

function handleCardDrop(payload) {
  if (!draggedCardInfo && !payload.card) return;

  const cardToMove = draggedCardInfo ? draggedCardInfo.card : payload.card;
  const fromSegmentName = draggedCardInfo ? draggedCardInfo.fromSegment : 'initial_hand';
  const toSegmentName = payload.toSegment;

  if (fromSegmentName === toSegmentName) {
    draggedCardInfo = null;
    return;
  }

  // 1. 从原位置移除卡片
  if (fromSegmentName !== 'initial_hand' && playerArrangedHand[fromSegmentName]) {
    const index = playerArrangedHand[fromSegmentName].findIndex(c => c.id === cardToMove.id);
    if (index > -1) {
      playerArrangedHand[fromSegmentName].splice(index, 1);
    }
  }
  // 如果是从 initial_hand 拖出，我们不直接从 playerHandInitial 移除，
  // 因为 GameBoard 中显示的 initial_hand 是基于 playerHandInitial 和已分配到墩的牌计算的。

  // 2. 添加到新位置 (不再检查墩的数量限制，只检查牌是否已存在于目标墩)
  const targetSegmentArray = playerArrangedHand[toSegmentName];
  if (targetSegmentArray) { // 'front', 'middle', 'back'
    if (!targetSegmentArray.find(c => c.id === cardToMove.id)) {
      targetSegmentArray.push(cardToMove);
      targetSegmentArray.sort((a, b) => rankCard(a) - rankCard(b));
    } else {
      // 牌已存在，放回原处 (如果不是从 initial_hand 来的)
      if (fromSegmentName !== 'initial_hand' && playerArrangedHand[fromSegmentName] && !playerArrangedHand[fromSegmentName].find(c => c.id === cardToMove.id)) {
        playerArrangedHand[fromSegmentName].push(cardToMove);
        playerArrangedHand[fromSegmentName].sort((a, b) => rankCard(a) - rankCard(b));
      }
      console.warn(`Card ${cardToMove.id} already exists in ${toSegmentName}. Reverted if possible.`);
    }
  } else if (toSegmentName === 'initial_hand') {
    // 牌被拖回到概念上的“初始区域”
    // 这意味着它从某个墩 (front, middle, back) 中被移除了
    // GameBoard 的 cardsForMiddleOrInitialArea 会自动更新以包含这张牌
  }

  // 当头墩和尾墩满足数量时，自动填充中墩的逻辑保持不变
  if (playerArrangedHand.front.length === 3 && playerArrangedHand.back.length === 5) {
      const assignedToFrontIds = new Set(playerArrangedHand.front.map(c => c.id));
      const assignedToBackIds = new Set(playerArrangedHand.back.map(c => c.id));
      
      // 从 playerHandInitial 中找出所有不在头墩和尾墩的牌作为中墩候选
      let middleCandidates = playerHandInitial.value.filter(
          c => !assignedToFrontIds.has(c.id) && !assignedToBackIds.has(c.id)
      );
      
      // 如果 playerArrangedHand.middle 中已经有一些牌 (用户可能之前拖进去过)
      // 需要合并，并确保不重复，且总数不超过5
      const currentMiddleCards = playerArrangedHand.middle.filter(
          c => !assignedToFrontIds.has(c.id) && !assignedToBackIds.has(c.id) // 确保它们没被移到头尾
      );
      const currentMiddleIds = new Set(currentMiddleCards.map(c => c.id));
      
      let finalMiddle = [...currentMiddleCards];
      
      for (const candidate of middleCandidates) {
          if (finalMiddle.length < 5 && !currentMiddleIds.has(candidate.id)) {
              finalMiddle.push(candidate);
              currentMiddleIds.add(candidate.id); // 更新ids，防止重复添加
          }
      }
      playerArrangedHand.middle = finalMiddle.slice(0,5).sort((a,b) => rankCard(a) - rankCard(b));
  } else {
    // 如果头尾墩不满足3和5，中墩应该是空的，除非用户主动拖牌进去
    // 如果用户从不满足3/5条件的头/尾墩把牌拖到中墩，也允许
    // 但如果用户从已满的中墩拖牌出来，中墩牌数会减少
  }

  draggedCardInfo = null;
}

function submitPlayerHand() { /* ... (不变，但 validationMessage 现在只做最终校验) ... */
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
.app-flex-container { /* 新增 */
  display: flex;
  flex-direction: column;
  min-height: 100vh; /* 至少占满视口高度 */
  background-color: #fff; /* 可以给 app 一个背景色 */
  padding: 10px; /* App 的外边距/内边距 */
  box-sizing: border-box;
}

.global-error { /* 新增 */
  margin-bottom: 10px;
  /* 其他错误样式 */
}

.game-area {
  border: 2px solid #607d8b;
  /* padding: 15px;  GameBoardComponent 会有自己的 padding */
  background-color: #eceff1;
  border-radius: 10px;
  display: flex; /* 使用 flex 布局 */
  flex-direction: column; /* 子元素垂直排列 */
}

.app-flex-grow { /* 新增 */
  flex-grow: 1; /* 让这个元素占据剩余空间 */
  display: flex; /* 如果其内部也需要flex布局 */
  flex-direction: column; /* 如果其内部内容也是垂直排列 */
}


.top-info-bar {
  background-color: #cfd8dc;
  padding: 8px 12px;
  border-radius: 5px 5px 0 0; /* 顶部圆角，底部直角 */
  /* margin-bottom: 0; */ /* 移除，让 GameBoard 紧贴 */
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9em;
  flex-shrink: 0; /* 防止此元素被压缩 */
}
/* ... (其他 top-info-bar 内部样式不变) ... */
.game-status-mode {
  flex-grow: 1;
}
.player-statuses-inline {
  display: flex;
  gap: 15px;
  margin: 0 15px;
  flex-shrink: 0;
}
.player-status-item {
  display: flex;
  align-items: center;
  gap: 5px;
}
.player-status-item strong {
  color: #37474f;
}
.restart-button-inline {
  background-color: #00796b !important;
  padding: 6px 10px !important;
  font-size: 0.9em !important;
  margin-left: auto;
}

.game-board-main-area {
  margin-top: 0; /* GameBoardComponent 现在紧邻 top-info-bar */
  border-top-left-radius: 0; /* 与 top-info-bar 无缝连接 */
  border-top-right-radius: 0;
  /* flex-grow: 1; /* 让 GameBoardComponent 占据剩余垂直空间 */
  /* overflow-y: auto; /* 如果 GameBoard 内容可能超出，允许内部滚动 */
}
.idle-message, .dealing-message {
    text-align: center;
    padding: 20px;
    font-size: 1.1em;
    color: #546e7a;
    flex-grow: 1; /* 如果是主要内容，也让它占据空间 */
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
