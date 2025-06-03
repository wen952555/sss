<template>
  <!-- Template is identical to the last working version -->
  <div id="app-container" class="app-flex-container">
    <div v-if="generalError" class="error global-error">{{ generalError }}</div>
    <p v-if="currentLocalGameState === 'arranging'">Debug Validation: {{ validationMessage }}</p>
    <p v-if="currentLocalGameState === 'arranging'">
        Front: {{ playerArrangedHand.front.length }} | 
        Middle: {{ playerArrangedHand.middle.length }} | 
        Back: {{ playerArrangedHand.back.length }}
    </p>


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
import { ref, computed, reactive, onMounted, watch } from 'vue'; // Added watch for debugging
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

// Watch for debugging purposes
watch(playerArrangedHand, (newVal) => {
  console.log('playerArrangedHand changed:', 
    `F:${newVal.front.length}`, 
    `M:${newVal.middle.length}`, 
    `B:${newVal.back.length}`
  );
}, { deep: true });


const validationMessage = computed(() => {
  const frontCount = playerArrangedHand.front.length;
  const middleCount = playerArrangedHand.middle.length;
  const backCount = playerArrangedHand.back.length;

  if (frontCount !== 3) return `头墩需3张牌 (当前${frontCount}张)`;
  // 对于中墩和尾墩，只有在头墩满了之后，它们的数量才严格要求是5
  // 但在提交时，它们必须是5
  if (middleCount !== 5) return `中墩需5张牌 (当前${middleCount}张)`;
  if (backCount !== 5) return `尾墩需5张牌 (当前${backCount}张)`;

  const allCardsInDunsSet = new Set();
  [...playerArrangedHand.front, ...playerArrangedHand.middle, ...playerArrangedHand.back].forEach(card => {
      if (card && card.id) allCardsInDunsSet.add(card.id);
  });

  if (allCardsInDunsSet.size !== 13) {
    return `牌数分配错误 (总${allCardsInDunsSet.size}张不等于13)`;
  }

  // 验证所有墩牌是否都来自初始手牌
  for (const dun of [playerArrangedHand.front, playerArrangedHand.middle, playerArrangedHand.back]) {
      for (const card of dun) {
          if (!card || !playerHandInitial.value.find(initialCard => initialCard.id === card.id)) {
              return `墩内包含无效的牌或非初始手牌 (${card ? card.id : 'undefined card'})`;
          }
      }
  }
  // TODO: 在这里添加墩序比较的验证 (头墩牌力 <= 中墩牌力 <= 尾墩牌力)
  // if (!isValidDunOrder(playerArrangedHand.front, playerArrangedHand.middle, playerArrangedHand.back)) {
  //   return "墩序错误！";
  // }

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
    if (!card || typeof card.value === 'undefined' || typeof card.suit === 'undefined') return -1; // Handle undefined card
    return valueOrder.indexOf(card.value) * 4 + suitOrder.indexOf(card.suit);
}


function handleDragStartLogic(payload) { /* ... (不变) ... */
  activeDraggedCardInfo = { card: payload.card, fromSegment: payload.fromSegment };
}

function handleDesktopDropLogic(payload) { /* ... (不变) ... */
  if (!activeDraggedCardInfo) { return; } // Ensure activeDraggedCardInfo is set
  // desktop drop payload.card is the dragged card from dataTransfer
  // activeDraggedCardInfo.card is the card instance from our state
  // It's better to use activeDraggedCardInfo.card for consistency
  const cardToMove = activeDraggedCardInfo.card;
  const fromSegmentName = activeDraggedCardInfo.fromSegment;
  const toSegmentName = payload.toSegment;

  if (!toSegmentName || fromSegmentName === toSegmentName) {
    activeDraggedCardInfo = null;
    return;
  }
  performCardMove(cardToMove, fromSegmentName, toSegmentName);
  activeDraggedCardInfo = null;
}

function handleTouchDragEndLogic(payload) { /* ... (不变) ... */
    if (!activeDraggedCardInfo || !payload || activeDraggedCardInfo.card.id !== payload.card.id) {
        activeDraggedCardInfo = null; return;
    }
    const toSegmentName = payload.targetSegment;
    const fromSegmentName = activeDraggedCardInfo.fromSegment;
    if (toSegmentName && toSegmentName !== fromSegmentName) {
        performCardMove(activeDraggedCardInfo.card, fromSegmentName, toSegmentName);
    }
    activeDraggedCardInfo = null;
}

function handleDragOverSegmentLogic(segmentName) { /* ... (不变) ... */ }

function performCardMove(cardToMove, fromSegmentName, toSegmentName) {
  if (!cardToMove || typeof cardToMove.id === 'undefined') {
    console.error("PerformCardMove: Invalid card object:", cardToMove);
    return;
  }

  // 1. Remove from source
  let cardWasInSourceArray = false;
  if (fromSegmentName !== 'initial_hand' && playerArrangedHand[fromSegmentName]) {
    const sourceArray = playerArrangedHand[fromSegmentName];
    if (Array.isArray(sourceArray)) {
        const index = sourceArray.findIndex(c => c && c.id === cardToMove.id);
        if (index > -1) {
          sourceArray.splice(index, 1);
          cardWasInSourceArray = true;
        }
    }
  }

  // 2. Add to destination
  const targetSegmentArray = playerArrangedHand[toSegmentName];
  if (targetSegmentArray && Array.isArray(targetSegmentArray)) {
    if (!targetSegmentArray.find(c => c && c.id === cardToMove.id)) {
      targetSegmentArray.push(cardToMove);
      targetSegmentArray.sort((a, b) => rankCard(a) - rankCard(b));
    } else { // Card already in target, revert removal if applicable
      if (cardWasInSourceArray && fromSegmentName !== 'initial_hand' && 
          playerArrangedHand[fromSegmentName] && 
          Array.isArray(playerArrangedHand[fromSegmentName]) &&
          !playerArrangedHand[fromSegmentName].find(c => c && c.id === cardToMove.id)) {
        playerArrangedHand[fromSegmentName].push(cardToMove);
        playerArrangedHand[fromSegmentName].sort((a, b) => rankCard(a) - rankCard(b));
      }
    }
  } else if (toSegmentName === 'initial_hand') {
    // Card is moved back to the conceptual "initial area".
    // If it was removed from a dun, it is now "unassigned" again.
    // GameBoard's computed property `cardsForMiddleOrInitialArea` will update.
  } else { // Invalid target
      if (cardWasInSourceArray && fromSegmentName !== 'initial_hand' && 
          playerArrangedHand[fromSegmentName] &&
          Array.isArray(playerArrangedHand[fromSegmentName]) &&
          !playerArrangedHand[fromSegmentName].find(c => c && c.id === cardToMove.id) ) {
          playerArrangedHand[fromSegmentName].push(cardToMove);
          playerArrangedHand[fromSegmentName].sort((a, b) => rankCard(a) - rankCard(b));
      }
  }

  // Auto-fill or clear middle dun logic (CRUCIAL for 3-5-5 interaction)
  const frontIsFull = playerArrangedHand.front.length === 3;
  const backIsFull = playerArrangedHand.back.length === 5;

  if (frontIsFull && backIsFull) {
      const assignedToFrontIds = new Set(playerArrangedHand.front.map(c => c.id));
      const assignedToBackIds = new Set(playerArrangedHand.back.map(c => c.id));
      
      // Collect all cards NOT in front or back, these are candidates for middle
      let middleCandidates = playerHandInitial.value.filter(
          c => c && !assignedToFrontIds.has(c.id) && !assignedToBackIds.has(c.id)
      );
      
      // Ensure middle dun gets exactly 5 of these candidates
      playerArrangedHand.middle = middleCandidates.slice(0, 5).sort((a, b) => rankCard(a) - rankCard(b));
  } else {
      // If front or back is NOT full, middle dun should only contain cards explicitly dragged there.
      // Any card dragged OUT of middle should be removed.
      // Any card dragged INTO middle (from initial or other duns) is added (as handled above).
      // We don't auto-clear it here, as user might be temporarily moving cards.
      // The validationMessage will catch if middle is not 5 at submission time.
  }
}

function submitPlayerHand() {
  if (validationMessage.value !== "可以提交") {
    generalError.value = "提交失败: " + validationMessage.value; // More specific error
    return;
  }
  playerIsReady.value = true;
  generalError.value = '';
  aiProcessHand();
  checkForShowdown();
}

// ... (rest of the script: aiProcessHand, checkForShowdown, getHandType, compareSingleDuns, compareHands, onMounted)
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
    // This is a placeholder, needs full implementation
    if (dun.length === 3) { 
        const values = dun.map(c => c.value);
        if (values[0] === values[1] && values[1] === values[2]) {
             return { type: '三条', rank: 4, cards: dun, description: `三条-${values[0]}` }; // Example rank
        }
    }
    if (dun.length === 5) {
        // Add more checks for 5-card hands
    }
    return { type: '乌龙', rank: 0, cards: dun, description: '乌龙' };
}
function compareSingleDuns(playerDun, aiDun) {
    const playerType = getHandType(playerDun);
    const aiType = getHandType(aiDun);
    if (playerType.rank > aiType.rank) return 1;
    if (playerType.rank < aiType.rank) return -1;
    // Placeholder for tie-breaking logic
    const playerMaxRank = playerDun.length > 0 ? Math.max(...playerDun.map(c => c ? rankCard(c) : -1).filter(r => r !== -1)) : -1;
    const aiMaxRank = aiDun.length > 0 ? Math.max(...aiDun.map(c => c ? rankCard(c) : -1).filter(r => r !== -1)) : -1;
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
/* Styles are identical to the last working version for build */
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
