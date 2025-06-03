<template>
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
        @card-drag-start="handleCardDragStart"
        @card-dropped="handleCardDrop"
        @submit-hand="submitPlayerHand"
        :aiHandVisible="currentLocalGameState === 'showdown'"
        :aiArrangedHand="aiArrangedHand"
        :isDynamicMiddleDunActive="isDynamicMiddleDunActive"
        class="game-board-main-area app-flex-grow" 
      />
      <!-- 这个 v-else-if 对应上面的 GameBoardComponent 的 v-if -->
      <div v-else-if="currentLocalGameState === 'idle' && !isDealing" class="idle-message app-flex-grow"> <!-- Added app-flex-grow -->
        <p>点击“开始牌局”与 AI 对战。</p>
      </div>
      <!-- 这个 v-if 是独立的，用于显示发牌信息 -->
       <div v-if="isDealing" class="dealing-message app-flex-grow"> <!-- Added app-flex-grow -->
        <p>正在发牌...</p>
      </div>
    </div>
  </div>
</template>

<script setup>
// Script 部分与之前相同
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

function handleCardDragStart(payload) {
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

    if (fromSegmentName !== 'initial_hand' && playerArrangedHand[fromSegmentName]) {
        const index = playerArrangedHand[fromSegmentName].findIndex(c => c.id === cardToMove.id);
        if (index > -1) playerArrangedHand[fromSegmentName].splice(index, 1);
    }

    const targetSegmentArray = playerArrangedHand[toSegmentName];
    if (targetSegmentArray) {
        // No limit check here, only check if card already exists
        if (!targetSegmentArray.find(c => c.id === cardToMove.id)) {
            targetSegmentArray.push(cardToMove);
            targetSegmentArray.sort((a,b) => rankCard(a) - rankCard(b));
        } else {
            if (fromSegmentName !== 'initial_hand' && playerArrangedHand[fromSegmentName] && !playerArrangedHand[fromSegmentName].find(c => c.id === cardToMove.id)) {
                playerArrangedHand[fromSegmentName].push(cardToMove);
                playerArrangedHand[fromSegmentName].sort((a,b) => rankCard(a) - rankCard(b));
            }
        }
    }

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
  draggedCardInfo = null;
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
  min-height: 100vh;
  background-color: #fff;
  padding: 10px;
  box-sizing: border-box;
}
.global-error {
  margin-bottom: 10px;
}
.game-area {
  border: 2px solid #607d8b;
  background-color: #eceff1;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
}
.app-flex-grow {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}
.top-info-bar {
  background-color: #cfd8dc;
  padding: 8px 12px;
  border-radius: 5px 5px 0 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9em;
  flex-shrink: 0;
}
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
