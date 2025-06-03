<template>
  <div id="app-container">
    <h1>十三水 AI 练习</h1>
    <div v-if="generalError" class="error">{{ generalError }}</div>

    <div class="game-area">
      <div class="game-info">
        <p>模式: <strong>AI 练习</strong> | 游戏状态: <strong>{{ currentLocalGameState }}</strong></p>
        <button @click="startNewAIGame" :disabled="isDealing">
          {{ playerHand.length > 0 ? '重新开始' : '开始新牌局' }}
        </button>
      </div>

      <!-- 玩家信息和 AI 信息 -->
      <div class="player-info-container">
        <div class="player-info local-player">
          <h2>你 ({{ playerName }})</h2>
          <p v-if="currentLocalGameState === 'arranging' || currentLocalGameState === 'showdown'">
            状态: {{ playerIsReady ? '已提交牌型' : '正在理牌...' }}
          </p>
        </div>
        <div class="player-info ai-player">
          <h2>电脑 AI</h2>
           <p v-if="currentLocalGameState === 'arranging' || currentLocalGameState === 'showdown'">
            状态: {{ aiIsReady ? '已提交牌型' : '思考中...' }}
          </p>
        </div>
      </div>


      <!-- 牌桌核心组件 -->
      <GameBoardComponent
        v-if="playerHand.length > 0 || currentLocalGameState === 'showdown'"
        :playerHand="playerHand"
        :arrangedHand="playerArrangedHand"
        :unassignedCards="unassignedCards"
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
      />
      <div v-else-if="currentLocalGameState === 'idle' && !isDealing">
        <p>点击“开始新牌局”与 AI 对战。</p>
      </div>
       <div v-if="isDealing">
        <p>正在发牌...</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted } from 'vue';
import GameBoardComponent from './components/GameBoard.vue';
import Deck from './game_logic_local/Deck';
import { Card } from './game_logic_local/Card'; // Card 是命名导出，Deck 是默认导出

// --- 本地游戏状态 ---
const playerName = ref("玩家");
const currentLocalGameState = ref('idle'); // idle, dealing, arranging, showdown
const playerHand = ref([]);
const aiHand = ref([]);
const playerArrangedHand = reactive({ front: [], middle: [], back: [] });
const aiArrangedHand = reactive({ front: [], middle: [], back: [] });
const playerIsReady = ref(false);
const aiIsReady = ref(false);
const showdownResults = ref(null);
const generalError = ref('');
const isDealing = ref(false);

let draggedCardInfo = null;

// --- 计算属性 ---
const unassignedCards = computed(() => {
  if (!playerHand.value || playerHand.value.length === 0) return [];
  const assignedIds = new Set([
    ...playerArrangedHand.front.map(c => c.id),
    ...playerArrangedHand.middle.map(c => c.id),
    ...playerArrangedHand.back.map(c => c.id)
  ]);
  return playerHand.value.filter(c => !assignedIds.has(c.id));
});

const validationMessage = computed(() => {
  if (playerArrangedHand.front.length !== 3) return "头墩需3张牌";
  if (playerArrangedHand.middle.length !== 5) return "中墩需5张牌";
  if (playerArrangedHand.back.length !== 5) return "尾墩需5张牌";
  if (unassignedCards.value.length > 0) return "还有未分配的牌";
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


// --- 游戏方法 ---
function startNewAIGame() {
  isDealing.value = true;
  generalError.value = '';
  currentLocalGameState.value = 'dealing';
  playerHand.value = [];
  aiHand.value = [];
  playerArrangedHand.front = []; playerArrangedHand.middle = []; playerArrangedHand.back = [];
  aiArrangedHand.front = []; aiArrangedHand.middle = []; aiArrangedHand.back = [];
  playerIsReady.value = false;
  aiIsReady.value = false;
  showdownResults.value = null;

  setTimeout(() => {
    const deck = new Deck();
    deck.shuffle();
    playerHand.value = deck.deal(13).sort((a,b) => rankCard(a) - rankCard(b));
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
    const fromSegmentName = draggedCardInfo ? draggedCardInfo.fromSegment : 'initial';
    const toSegmentName = payload.toSegment;

    if (fromSegmentName !== toSegmentName) {
        if (fromSegmentName !== 'initial' && playerArrangedHand[fromSegmentName]) { // Check if fromSegmentName is a valid key
            const index = playerArrangedHand[fromSegmentName].findIndex(c => c.id === cardToMove.id);
            if (index > -1) playerArrangedHand[fromSegmentName].splice(index, 1);
        }

        const targetSegmentArray = playerArrangedHand[toSegmentName];
        if (targetSegmentArray) {
            let limit = (toSegmentName === 'front') ? 3 : 5;
            if (targetSegmentArray.length < limit && !targetSegmentArray.find(c => c.id === cardToMove.id)) {
                targetSegmentArray.push(cardToMove);
                targetSegmentArray.sort((a,b) => rankCard(a) - rankCard(b));
            } else {
                if (fromSegmentName !== 'initial' && playerArrangedHand[fromSegmentName] && !playerArrangedHand[fromSegmentName].find(c => c.id === cardToMove.id)) {
                    playerArrangedHand[fromSegmentName].push(cardToMove);
                    playerArrangedHand[fromSegmentName].sort((a,b) => rankCard(a) - rankCard(b));
                }
            }
        }
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
    // 简化，仅判断三条，实际需要完整判断
    if (dun.length === 3) {
        const values = dun.map(c => c.value);
        if (values[0] === values[1] && values[1] === values[2]) {
             return { type: '三条', rank: 4, cards: dun, description: `三条-${values[0]}` };
        }
    }
    // ... 更多牌型判断
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
.game-area {
  margin-top: 20px;
  border: 2px solid #607d8b;
  padding: 15px;
  background-color: #eceff1;
  border-radius: 10px;
}
.game-info {
  background-color: #cfd8dc;
  padding: 10px;
  border-radius: 5px;
  margin-bottom: 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.game-info button {
    background-color: #00796b;
}
.player-info-container {
    display: flex;
    justify-content: space-around;
    margin-bottom: 20px;
}
.player-info {
    padding: 10px;
    border: 1px solid #b0bec5;
    border-radius: 5px;
    width: 45%;
    background-color: #fff;
}
.player-info h2 {
    margin-top: 0;
    color: #37474f;
}
.local-player {
    border-left: 5px solid #4caf50;
}
.ai-player {
    border-left: 5px solid #f44336;
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
