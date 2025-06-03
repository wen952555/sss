<template>
  <div id="app-container">
    <h1>十三水 AI 练习</h1>
    <div v-if="generalError" class="error">{{ generalError }}</div>

    <div class="game-area">
      <div class="game-info">
        <p>模式: <strong>AI 练习</strong> | 游戏状态: <strong>{{ currentLocalGameState }}</strong></p>
        <button @click="startNewAIGame" :disabled="isDealing">
          {{ playerHandInitial.length > 0 ? '重新开始' : '开始新牌局' }}
        </button>
      </div>

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
import { Card } from './game_logic_local/Card';

const playerName = ref("玩家");
const currentLocalGameState = ref('idle');
const playerHandInitial = ref([]); // 存储初始的13张牌，拖拽源头
const aiHand = ref([]); // AI的13张牌
const playerArrangedHand = reactive({ front: [], middle: [], back: [] });
const aiArrangedHand = reactive({ front: [], middle: [], back: [] });
const playerIsReady = ref(false);
const aiIsReady = ref(false);
const showdownResults = ref(null);
const generalError = ref('');
const isDealing = ref(false);

let draggedCardInfo = null;

// 计算属性：判断“动态中墩”是否已经形成 (即头墩3张，尾墩5张已满)
const isDynamicMiddleDunActive = computed(() => {
  return playerArrangedHand.front.length === 3 && playerArrangedHand.back.length === 5;
});

// 计算属性：实际未分配到 front 或 back 的牌 (这些牌在 isDynamicMiddleDunActive 为 false 时是源手牌区，为 true 时是中墩)
const cardsForMiddleOrInitialArea = computed(() => {
  if (!playerHandInitial.value) return [];
  const assignedToFrontIds = new Set(playerArrangedHand.front.map(c => c.id));
  const assignedToBackIds = new Set(playerArrangedHand.back.map(c => c.id));
  
  // 如果中墩已经激活，那么 playerArrangedHand.middle 应该包含这些牌
  // 否则，它们是初始手牌区等待被分配到 front/back 或最终成为 middle
  if (isDynamicMiddleDunActive.value) {
      // 确保 playerArrangedHand.middle 包含正确的牌
      // 这个逻辑可能需要在 handleCardDrop 中更主动地维护
      // 为简化，这里假设当 isDynamicMiddleDunActive 为 true 时，playerArrangedHand.middle 已经被正确填充
      return playerArrangedHand.middle;
  } else {
      // 这些是还在“初始手牌区”的牌
      return playerHandInitial.value.filter(
        c => !assignedToFrontIds.has(c.id) && !assignedToBackIds.has(c.id)
      );
  }
});


const validationMessage = computed(() => {
  if (playerArrangedHand.front.length !== 3) return "头墩需3张牌";
  if (playerArrangedHand.middle.length !== 5) return "中墩需5张牌"; // 现在 middle 是动态形成的
  if (playerArrangedHand.back.length !== 5) return "尾墩需5张牌";
  // 确保所有牌都被用上，在3-5-5结构中，这意味着 playerHandInitial 中没有剩余牌未分配到某个墩
  // 这里的 unassignedCards 概念需要重新思考，因为现在没有明确的“未分配区”了
  const totalAssigned = playerArrangedHand.front.length + playerArrangedHand.middle.length + playerArrangedHand.back.length;
  if (totalAssigned !== 13) return "牌未分配完整";

  return "可以提交";
});

const showdownResultsForBoard = computed(() => { /* ... (与之前相同) ... */
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
  playerHandInitial.value = []; // 修改这里
  aiHand.value = [];
  playerArrangedHand.front = []; playerArrangedHand.middle = []; playerArrangedHand.back = [];
  aiArrangedHand.front = []; aiArrangedHand.middle = []; aiArrangedHand.back = [];
  playerIsReady.value = false;
  aiIsReady.value = false;
  showdownResults.value = null;

  setTimeout(() => {
    const deck = new Deck();
    deck.shuffle();
    playerHandInitial.value = deck.deal(13).sort((a,b) => rankCard(a) - rankCard(b)); // 发给初始手牌区
    aiHand.value = deck.deal(13).sort((a,b) => rankCard(a) - rankCard(b));
    
    // 初始时，所有牌都在“中间区域”逻辑中，但 playerArrangedHand.middle 可能是空的
    // GameBoard 将会从 playerHandInitial 和 playerArrangedHand.front/back 来决定中间区域显示什么
    
    currentLocalGameState.value = 'arranging';
    isDealing.value = false;
  }, 500);
}

function rankCard(card) { /* ... (与之前相同) ... */
    const valueOrder = ['2','3','4','5','6','7','8','9','10','jack','queen','king','ace'];
    const suitOrder = ['clubs', 'diamonds', 'hearts', 'spades'];
    return valueOrder.indexOf(card.value) * 4 + suitOrder.indexOf(card.suit);
}

function handleCardDragStart(payload) { // payload: { card, fromSegment }
  // fromSegment 现在可能是 'initial_hand', 'front', 'middle', 'back'
  draggedCardInfo = payload;
}

function handleCardDrop(payload) { // payload: { card (optional), toSegment }
  if (!draggedCardInfo && !payload.card) return;

  const cardToMove = draggedCardInfo ? draggedCardInfo.card : payload.card;
  const fromSegmentName = draggedCardInfo ? draggedCardInfo.fromSegment : 'initial_hand'; // 默认从初始手牌区
  const toSegmentName = payload.toSegment;

  if (fromSegmentName === toSegmentName) {
      draggedCardInfo = null;
      return; // 在同一区域内拖放，不做处理
  }

  // 1. 从原位置移除卡片
  if (fromSegmentName === 'initial_hand') {
    // 从 playerHandInitial 移除的逻辑比较特殊，因为它是源
    // 我们实际上是在 playerArrangedHand.front/middle/back 中添加，
    // 而 GameBoard 中显示的 "initial_hand" 是 playerHandInitial 中未被 front/back/middle 占用的牌
    // 所以，不需要从 playerHandInitial 直接移除，后续添加到目标墩即可
  } else if (playerArrangedHand[fromSegmentName]) {
    const index = playerArrangedHand[fromSegmentName].findIndex(c => c.id === cardToMove.id);
    if (index > -1) {
      playerArrangedHand[fromSegmentName].splice(index, 1);
    }
  }

  // 2. 添加到新位置
  const targetSegmentArray = playerArrangedHand[toSegmentName];
  if (targetSegmentArray) { // front, middle, back
    let limit = 0;
    if (toSegmentName === 'front') limit = 3;
    else if (toSegmentName === 'middle') limit = 5;
    else if (toSegmentName === 'back') limit = 5;

    // 检查目标墩是否已满，以及牌是否已存在
    if (targetSegmentArray.length < limit && !targetSegmentArray.find(c => c.id === cardToMove.id)) {
      targetSegmentArray.push(cardToMove);
      targetSegmentArray.sort((a, b) => rankCard(a) - rankCard(b));
    } else {
      // 如果目标墩已满或牌已存在，则将卡片移回原处
      if (fromSegmentName !== 'initial_hand' && playerArrangedHand[fromSegmentName] && !playerArrangedHand[fromSegmentName].find(c => c.id === cardToMove.id)) {
        playerArrangedHand[fromSegmentName].push(cardToMove);
        playerArrangedHand[fromSegmentName].sort((a, b) => rankCard(a) - rankCard(b));
      }
      console.warn(`Segment ${toSegmentName} is full or card ${cardToMove.id} already exists. Reverted.`);
    }
  } else if (toSegmentName === 'initial_hand') {
      // 这种情况是把牌从 front/middle/back 拖回到“初始区域”
      // 这意味着它从某个墩中被移除了，不需要额外添加到 playerHandInitial
      // cardsForMiddleOrInitialArea 会自动重新计算
  }


  // 检查是否满足3-5-5条件，如果满足，将剩余的牌自动填充到 middle
  // 这个逻辑需要在每次拖拽后检查
  if (!isDynamicMiddleDunActive.value && // 仅在中间区域还不是固定中墩时操作
      playerArrangedHand.front.length <= 3 &&
      playerArrangedHand.back.length <= 5)
  {
      // 重新计算哪些牌应该在 playerArrangedHand.middle
      // 这是为了确保当从初始牌堆拖到 front/back 时，middle 区域能正确反映剩余牌
      // 但我们不希望在用户明确将牌放入 middle 之前就填充它，除非 front 和 back 已满
  }

  if (playerArrangedHand.front.length === 3 && playerArrangedHand.back.length === 5) {
      // 自动填充中墩
      const assignedToFrontIds = new Set(playerArrangedHand.front.map(c => c.id));
      const assignedToBackIds = new Set(playerArrangedHand.back.map(c => c.id));
      const middleCandidates = playerHandInitial.value.filter(
          c => !assignedToFrontIds.has(c.id) && !assignedToBackIds.has(c.id)
      );
      // 确保中墩不超过5张，并且不包含已在头尾的牌
      // 同时，如果用户之前已经向 middle 墩放过牌，要保留它们（如果它们不冲突）
      const currentMiddleIds = new Set(playerArrangedHand.middle.map(c => c.id));
      const combinedMiddle = [...playerArrangedHand.middle];

      middleCandidates.forEach(mc => {
          if (combinedMiddle.length < 5 && !currentMiddleIds.has(mc.id)) {
              combinedMiddle.push(mc);
              currentMiddleIds.add(mc.id);
          }
      });
      playerArrangedHand.middle = combinedMiddle.slice(0, 5).sort((a,b) => rankCard(a) - rankCard(b));
  }


  draggedCardInfo = null;
}


function submitPlayerHand() { /* ... (与之前相同，但 validationMessage 会基于新的逻辑) ... */
  if (validationMessage.value !== "可以提交") {
    generalError.value = "牌型不符合要求: " + validationMessage.value;
    return;
  }
  playerIsReady.value = true;
  generalError.value = '';
  aiProcessHand();
  checkForShowdown();
}
function aiProcessHand() { /* ... (与之前相同) ... */
  const handToArrange = [...aiHand.value];
  handToArrange.sort(() => 0.5 - Math.random());

  aiArrangedHand.front = handToArrange.slice(0, 3).sort((a,b) => rankCard(a) - rankCard(b));
  aiArrangedHand.middle = handToArrange.slice(3, 8).sort((a,b) => rankCard(a) - rankCard(b));
  aiArrangedHand.back = handToArrange.slice(8, 13).sort((a,b) => rankCard(a) - rankCard(b));
  aiIsReady.value = true;
}
function checkForShowdown() { /* ... (与之前相同) ... */
  if (playerIsReady.value && aiIsReady.value) {
    currentLocalGameState.value = 'showdown';
    showdownResults.value = compareHands(playerArrangedHand, aiArrangedHand);
  }
}
function getHandType(dun) { /* ... (与之前相同) ... */
    if (!dun || dun.length === 0) return { type: '乌龙', rank: 0, cards: dun, description: '乌龙' };
    if (dun.length === 3) {
        const values = dun.map(c => c.value);
        if (values[0] === values[1] && values[1] === values[2]) {
             return { type: '三条', rank: 4, cards: dun, description: `三条-${values[0]}` };
        }
    }
    return { type: '乌龙', rank: 0, cards: dun, description: '乌龙' };
}
function compareSingleDuns(playerDun, aiDun) { /* ... (与之前相同) ... */
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
function compareHands(pHand, aHand) { /* ... (与之前相同) ... */
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
/* ... (与之前 App.vue 相同的样式) ... */
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
