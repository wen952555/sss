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
        :canStartGame="false" /* 在AI模式下，开始游戏由App.vue控制 */
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
// 我们需要前端的游戏逻辑 (牌、牌堆等)
import Deck from './game_logic_local/Deck'; // 假设我们将后端 Deck.js 移到前端并适配
import { Card } from './game_logic_local/Card'; // 假设我们将后端 Card.js 移到前端并适配
// 你可能还需要一个简化的 Player 类或直接在 App.vue 中管理玩家状态

// --- 本地游戏状态 ---
const playerName = ref("玩家");
const currentLocalGameState = ref('idle'); // idle, dealing, arranging, showdown
const playerHand = ref([]);
const aiHand = ref([]);
const playerArrangedHand = reactive({ front: [], middle: [], back: [] });
const aiArrangedHand = reactive({ front: [], middle: [], back: [] });
const playerIsReady = ref(false);
const aiIsReady = ref(false);
const showdownResults = ref(null); // { player: { hand, score }, ai: { hand, score }, winner: 'player' | 'ai' | 'draw' }
const generalError = ref('');
const isDealing = ref(false);

let draggedCardInfo = null; // 用于拖拽

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
  // TODO: 前端墩序比较验证
  return "可以提交";
});

const showdownResultsForBoard = computed(() => {
    if (!showdownResults.value) return null;
    // 转换成 GameBoardComponent 期望的格式
    // GameBoardComponent 的 showdownResults 期望是一个对象，key 是玩家ID/名称，value 是牌面信息
    // 这里简化为直接传递，GameBoardComponent 可能需要调整或App.vue传递符合其期望的结构
    const results = {};
    if (showdownResults.value.player) {
        results[playerName.value] = {
            name: playerName.value,
            arrangedHand: showdownResults.value.player.arrangedHand,
            // score: showdownResults.value.player.score, // 如果有计分
            // scoreChange: showdownResults.value.player.scoreChange // 如果有计分
        };
    }
    if (showdownResults.value.ai) {
         results['电脑 AI'] = {
            name: '电脑 AI',
            arrangedHand: showdownResults.value.ai.arrangedHand,
            // score: showdownResults.value.ai.score,
            // scoreChange: showdownResults.value.ai.scoreChange
        };
    }
    if(showdownResults.value.comparisonDetails){
        // 可以把比较结果也放进去，让GameBoard显示
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

  // 模拟异步发牌
  setTimeout(() => {
    const deck = new Deck();
    deck.shuffle();
    playerHand.value = deck.deal(13).sort((a,b) => rankCard(a) - rankCard(b)); // 按点数排序
    aiHand.value = deck.deal(13).sort((a,b) => rankCard(a) - rankCard(b));
    currentLocalGameState.value = 'arranging';
    isDealing.value = false;
  }, 500);
}

// 辅助函数：给牌排序用 (确保 Card 类有 rank 属性)
function rankCard(card) {
    const valueOrder = ['2','3','4','5','6','7','8','9','10','jack','queen','king','ace'];
    const suitOrder = ['clubs', 'diamonds', 'hearts', 'spades']; // 梅花<方块<红桃<黑桃 (可选)
    return valueOrder.indexOf(card.value) * 4 + suitOrder.indexOf(card.suit);
}


function handleCardDragStart(payload) {
  draggedCardInfo = payload;
}

function handleCardDrop(payload) {
  // ... (与之前 App.vue 中相同的拖拽逻辑，操作 playerArrangedHand) ...
  // 为简洁，这里省略，请从之前的 App.vue 复制过来
  // 注意：确保这里的逻辑正确操作 playerArrangedHand
    if (!draggedCardInfo && !payload.card) return;
    const cardToMove = draggedCardInfo ? draggedCardInfo.card : payload.card;
    const fromSegmentName = draggedCardInfo ? draggedCardInfo.fromSegment : 'initial';
    const toSegmentName = payload.toSegment;

    if (fromSegmentName !== toSegmentName) {
        if (fromSegmentName !== 'initial') {
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
  // TODO: 前端墩序比较验证 (非常重要！)
  // if (!isArrangementValid(playerArrangedHand)) {
  //    generalError.value = "墩序错误！头墩牌力必须 ≤ 中墩牌力，中墩牌力必须 ≤ 尾墩牌力。";
  //    return;
  // }

  playerIsReady.value = true;
  generalError.value = '';
  // AI 理牌并准备
  aiProcessHand();
  checkForShowdown();
}

function aiProcessHand() {
  // 非常非常简化的 AI 理牌逻辑：随机或按某种简单规则摆放
  // 目标：将 aiHand 中的13张牌分配到 aiArrangedHand.front, .middle, .back
  // 这里仅作示意，你需要实现一个更智能（或者至少能合法摆放）的AI
  const handToArrange = [...aiHand.value]; // 复制一份，避免修改原手牌
  handToArrange.sort(() => 0.5 - Math.random()); // 打乱顺序，模拟随机性

  aiArrangedHand.front = handToArrange.slice(0, 3);
  aiArrangedHand.middle = handToArrange.slice(3, 8);
  aiArrangedHand.back = handToArrange.slice(8, 13);

  // 确保墩内排序 (可选，但好看)
  aiArrangedHand.front.sort((a,b) => rankCard(a) - rankCard(b));
  aiArrangedHand.middle.sort((a,b) => rankCard(a) - rankCard(b));
  aiArrangedHand.back.sort((a,b) => rankCard(a) - rankCard(b));

  // 真实AI需要验证墩序合法性，这里假设AI总是合法的（或先不管）
  aiIsReady.value = true;
}

function checkForShowdown() {
  if (playerIsReady.value && aiIsReady.value) {
    currentLocalGameState.value = 'showdown';
    // 执行比牌逻辑
    showdownResults.value = compareHands(playerArrangedHand, aiArrangedHand);
  }
}

// --- 核心比牌逻辑 (简化版，需要详细实现) ---
// 你需要一个强大的牌型判断函数和墩比较函数
// import { getHandType, compareSingleDuns } from './game_logic_local/rules';

function getHandType(dun) {
    // 简化示例，你需要一个完整的牌型判断函数
    if (!dun || dun.length === 0) return { type: '乌龙', rank: 0, cards: dun, description: '乌龙' };
    if (dun.length === 3 && dun[0].value === dun[1].value && dun[1].value === dun[2].value) {
        return { type: '三条', rank: 4, cards: dun, description: `三条-${dun[0].value}` };
    }
    // ... 更多牌型判断：对子、两对、顺子、同花、葫芦、铁支、同花顺等
    return { type: '乌龙', rank: 0, cards: dun, description: '乌龙' }; // 默认乌龙
}

function compareSingleDuns(playerDun, aiDun) {
    // 返回值: 1 表示玩家赢, -1 表示 AI 赢, 0 表示平局
    // 这个函数需要根据十三水规则比较两个墩的牌力
    const playerType = getHandType(playerDun);
    const aiType = getHandType(aiDun);

    // 简化比较：仅比较牌型等级，然后比较最大牌（需要更复杂逻辑）
    if (playerType.rank > aiType.rank) return 1;
    if (playerType.rank < aiType.rank) return -1;

    // 牌型相同，比较最大牌 (极度简化)
    // 你需要正确实现同牌型下的具体比较规则
    const playerMaxRank = playerDun.length > 0 ? Math.max(...playerDun.map(c => rankCard(c))) : -1;
    const aiMaxRank = aiDun.length > 0 ? Math.max(...aiDun.map(c => rankCard(c))) : -1;

    if (playerMaxRank > aiMaxRank) return 1;
    if (playerMaxRank < aiMaxRank) return -1;
    return 0;
}


function compareHands(pHand, aHand) {
  // 比较头、中、尾墩
  let playerScore = 0;
  let aiScore = 0;
  const comparisonDetails = {
      front: '', middle: '', back: '', overallWinner: ''
  };

  // 比较头墩
  const frontResult = compareSingleDuns(pHand.front, aHand.front);
  if (frontResult > 0) { playerScore++; comparisonDetails.front = '玩家胜'; }
  else if (frontResult < 0) { aiScore++; comparisonDetails.front = 'AI胜'; }
  else { comparisonDetails.front = '平'; }

  // 比较中墩
  const middleResult = compareSingleDuns(pHand.middle, aHand.middle);
  if (middleResult > 0) { playerScore++; comparisonDetails.middle = '玩家胜'; }
  else if (middleResult < 0) { aiScore++; comparisonDetails.middle = 'AI胜'; }
  else { comparisonDetails.middle = '平'; }

  // 比较尾墩
  const backResult = compareSingleDuns(pHand.back, aHand.back);
  if (backResult > 0) { playerScore++; comparisonDetails.back = '玩家胜'; }
  else if (backResult < 0) { aiScore++; comparisonDetails.back = 'AI胜'; }
  else { comparisonDetails.back = '平'; }

  // TODO: 实现打枪、全垒打等特殊计分
  // 简单判断总体赢家
  if (playerScore > aiScore) comparisonDetails.overallWinner = playerName.value;
  else if (aiScore > playerScore) comparisonDetails.overallWinner = '电脑 AI';
  else comparisonDetails.overallWinner = '平局';

  return {
    player: { arrangedHand: pHand, score: playerScore, scoreChange: playerScore /* 简化 */ },
    ai: { arrangedHand: aHand, score: aiScore, scoreChange: aiScore /* 简化 */ },
    winner: comparisonDetails.overallWinner,
    comparisonDetails
  };
}

// --- 生命周期函数 ---
onMounted(() => {
  // 可以在这里自动开始第一局AI游戏
  // startNewAIGame();
  // 或者让用户点击按钮开始
  currentLocalGameState.value = 'idle';
});

</script>

<style scoped>
/* App.vue specific styles */
.game-area {
  margin-top: 20px;
  border: 2px solid #607d8b; /* 深蓝灰色边框 */
  padding: 15px;
  background-color: #eceff1; /* 浅蓝灰色背景 */
  border-radius: 10px;
}
.game-info {
  background-color: #cfd8dc; /* 更浅的蓝灰色 */
  padding: 10px;
  border-radius: 5px;
  margin-bottom: 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.game-info button {
    background-color: #00796b; /* 青色 */
}
.player-info-container {
    display: flex;
    justify-content: space-around;
    margin-bottom: 20px;
}
.player-info {
    padding: 10px;
    border: 1px solid #b0bec5; /* 蓝灰色 */
    border-radius: 5px;
    width: 45%;
    background-color: #fff;
}
.player-info h2 {
    margin-top: 0;
    color: #37474f; /* 深蓝灰色 */
}
.local-player {
    border-left: 5px solid #4caf50; /* 绿色标记玩家 */
}
.ai-player {
    border-left: 5px solid #f44336; /* 红色标记AI */
}
.error { /* 确保错误信息醒目 */
    background-color: #ffcdd2;
    color: #c62828;
    padding: 10px;
    border-radius: 4px;
    margin-bottom: 10px;
    border: 1px solid #ef9a9a;
}
</style>
