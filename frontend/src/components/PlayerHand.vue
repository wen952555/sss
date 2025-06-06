<template>
  <div class="player-hand-organizer-streamlined">
    <div class="piles-layout">
      <!-- 头墩 -->
      <div
        class="pile front-pile droppable-target"
        :class="{ 'pile-complete': gameStore.arrangedHand.front.length === pileLimits.front }"
        @click="handleClickTargetPile('front')"
      >
        <p>
          头墩 ({{ gameStore.arrangedHand.front.length }}/{{ pileLimits.front }})
          <span v-if="isDunComplete('front')" class="dun-complete-badge">✓</span>
        </p>
        <div class="hand-row pile-content">
          <Card
            v-for="(card, index) in gameStore.arrangedHand.front"
            :key="`front-${card.id}`"
            :card="card"
            :is-face-up="true"
            :selected="isSelected(card, 'front')"
            @click.stop="handleClickCardInArrangedPile('front', card, index)"
          />
        </div>
      </div>

      <!-- 手牌区 / 中墩区 (动态变化) -->
      <div
        class="pile main-hand-area droppable-target"
        :class="{ 'middle-dun-active': isMiddleDunActive, 'pile-complete': isMiddleDunActive && gameStore.myHand.length === pileLimits.middle }"
        @click="handleClickTargetPile('myHand')"
      >
        <p>
          {{ middleDunLabel }} ({{ gameStore.myHand.length }}{{ isMiddleDunActive ? ('/'+pileLimits.middle) : '' }}张)
          <span v-if="isMiddleDunActive && isDunComplete('middle')" class="dun-complete-badge">✓</span>
          <span v-if="selectedCard" class="selected-card-prompt">
             - 选: <Card :card="selectedCard.card" :is-face-up="true" class="inline-card-tiny"/>
          </span>
        </p>
        <div class="hand-row pile-content">
          <Card
            v-for="(card, index) in gameStore.myHand"
            :key="`myhand-${card.id}`"
            :card="card"
            :is-face-up="true"
            :selected="isSelected(card, 'myHand')"
            @click.stop="handleClickCardInMyHand(card, index)"
          />
          <div v-if="gameStore.myHand.length === 0 && !selectedCard" class="empty-notice">手牌区已空</div>
        </div>
      </div>

      <!-- 尾墩 -->
      <div
        class="pile back-pile droppable-target"
        :class="{ 'pile-complete': gameStore.arrangedHand.back.length === pileLimits.back }"
        @click="handleClickTargetPile('back')"
      >
        <p>
          尾墩 ({{ gameStore.arrangedHand.back.length }}/{{ pileLimits.back }})
          <span v-if="isDunComplete('back')" class="dun-complete-badge">✓</span>
        </p>
        <div class="hand-row pile-content">
          <Card
            v-for="(card, index) in gameStore.arrangedHand.back"
            :key="`back-${card.id}`"
            :card="card"
            :is-face-up="true"
            :selected="isSelected(card, 'back')"
            @click.stop="handleClickCardInArrangedPile('back', card, index)"
          />
        </div>
      </div>
    </div>

    <div class="controls-area">
        <button @click="autoArrangeForSubmission" :disabled="!canAutoArrange || gameStore.isLoading" class="control-button auto-arrange-btn">
            智能整理
        </button>
        <button @click="handleAiArrange" :disabled="!canAutoArrange || gameStore.isLoading" class="control-button ai-arrange-btn">
            AI 分牌
        </button>
        <button @click="submitHandWrapper" :disabled="!canSubmitEffectively || gameStore.isLoading" class="control-button submit-btn">
            提交牌型
        </button>
    </div>
    <p v-if="gameStore.isLoading" class="feedback-message info">处理中...</p>
    <p v-if="clientError" class="feedback-message error">{{ clientError }}</p> <!-- 只显示客户端错误 -->
    <!-- API 错误由 GameBoard 显示 -->
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useGameStore } from '../store/game';
import Card from './Card.vue';

const gameStore = useGameStore();
const selectedCard = ref(null); // 存储对象: { card: CardObject, fromPile: string, fromIndex: number }
const clientError = ref(null);

const pileLimits = { front: 3, middle: 5, back: 5 };
const totalCards = 13;

const isMiddleDunActive = computed(() => {
  return gameStore.arrangedHand.front.length === pileLimits.front &&
         gameStore.arrangedHand.back.length === pileLimits.back &&
         gameStore.myHand.length === (totalCards - pileLimits.front - pileLimits.back);
});

const middleDunLabel = computed(() => {
  return isMiddleDunActive.value ? "中墩" : "手牌区";
});

const canAutoArrange = computed(() => {
    return gameStore.myHand.length === totalCards &&
           gameStore.arrangedHand.front.length === 0 &&
           gameStore.arrangedHand.back.length === 0 &&
           gameStore.canSubmitHand; // 确保游戏状态允许操作
});

const isDunComplete = (pileName) => {
    if (pileName === 'front') return gameStore.arrangedHand.front.length === pileLimits.front;
    if (pileName === 'back') return gameStore.arrangedHand.back.length === pileLimits.back;
    if (pileName === 'middle' && isMiddleDunActive.value) return gameStore.myHand.length === pileLimits.middle;
    return false;
};

function setClientError(message, duration = 3000) {
    clientError.value = message;
    if (duration > 0 && message) { // 只有在有消息时才设置超时
        setTimeout(() => { clientError.value = null; }, duration);
    } else if (!message) { // 如果消息为空，立即清除
        clientError.value = null;
    }
}

function isSelected(card, pileName) {
    return selectedCard.value && selectedCard.value.card.id === card.id && selectedCard.value.fromPile === pileName;
}

function handleClickCardInMyHand(card, index) {
  if (isSelected(card, 'myHand')) {
    selectedCard.value = null;
  } else {
    selectedCard.value = { card, fromPile: 'myHand', fromIndex: index };
  }
}

function handleClickCardInArrangedPile(pileName, card, index) {
  if (selectedCard.value) {
    // 如果选中的牌来自手牌区，提示用户点击目标墩空白处放置
    if (selectedCard.value.fromPile === 'myHand') {
        setClientError("已选中手牌，请点击目标墩的空白区域来放置。", 2000);
        return; // 不做进一步操作，等待用户点击目标墩
    }
    // 如果重复点击已选中的墩牌，则取消选择
    if (isSelected(card, pileName)) {
        selectedCard.value = null;
        return;
    }
    // 如果选中的牌来自另一个已摆放的墩，提示通过手牌区中转
    if (selectedCard.value.fromPile !== 'myHand' && selectedCard.value.fromPile !== pileName) {
        setClientError("墩与墩之间的牌请通过手牌区移动。", 2000);
        selectedCard.value = null; // 取消当前选择，避免混淆
        return;
    }
    // (如果以上都不是) -> 意味着没有选中牌，或者选中的是这张牌所在墩的其他牌。
    // 当前逻辑是，如果没有牌被选中，点击墩牌会将其移回手牌区。
    // 如果有牌被选中（但不是这张牌），此函数不应被直接触发（因为用户会点空白区域）。
    // 为安全起见，如果执行到这里且有selectedCard，取消选择。
    selectedCard.value = null;

  } else { // 没有牌被选中，将这张墩牌移回“手牌区”
    const success = gameStore.moveCard(card, pileName, 'myHand', index);
    if (!success) setClientError(`无法将牌从 ${pileName} 移回手牌区。`);
  }
}

function handleClickTargetPile(targetPileName) {
  if (!selectedCard.value) return; // 没有选中的牌，点击空白无效

  const { card, fromPile, fromIndex } = selectedCard.value;

  // 如果点击的是选中牌当前所在的区域的空白处，则取消选择
  if (fromPile === targetPileName) {
    selectedCard.value = null;
    return;
  }

  let targetLimit = Infinity; // 手牌区（myHand）没有上限，直到13张
  if (targetPileName === 'front') targetLimit = pileLimits.front;
  else if (targetPileName === 'back') targetLimit = pileLimits.back;
  // 注意：如果 targetPileName 是 'myHand'，currentTargetLength 会和 targetLimit (Infinity) 比较

  let currentTargetLength = 0;
  if (targetPileName === 'myHand') currentTargetLength = gameStore.myHand.length;
  else currentTargetLength = gameStore.arrangedHand[targetPileName].length;

  if (currentTargetLength < targetLimit) {
    const success = gameStore.moveCard(card, fromPile, targetPileName, fromIndex);
    if (success) {
      selectedCard.value = null; // 成功移动后取消选择
    } else {
      // moveCard 内部可能已经设置了错误，或者这里可以补充
      setClientError(`无法将牌移动到 ${targetPileName}。可能墩已满或发生内部错误。`);
    }
  } else {
    setClientError(`墩位 ${targetPileName} 已满！`);
  }
}

const canSubmitEffectively = computed(() => {
  return gameStore.canSubmitHand &&
         gameStore.arrangedHand.front.length === pileLimits.front &&
         gameStore.arrangedHand.back.length === pileLimits.back &&
         gameStore.myHand.length === pileLimits.middle; // 手牌区（即中墩）必须是5张
});

async function submitHandWrapper() {
    if (!canSubmitEffectively.value) {
        setClientError("牌型未按 头3-中5-尾5 摆满或不符合提交条件。");
        return;
    }
    setClientError(null); // 清除之前的客户端错误
    const handToSubmitLogic = {
        front: gameStore.arrangedHand.front.map(c => c.id),
        middle: gameStore.myHand.map(c => c.id), // myHand 现在是中墩
        back: gameStore.arrangedHand.back.map(c => c.id),
    };
    await gameStore.submitArrangedHandInternal(handToSubmitLogic);
}

function autoArrangeForSubmission() {
    if (!canAutoArrange.value) {
        setClientError("请确保所有13张牌都在手牌区才能智能整理。");
        return;
    }
    gameStore.clearArrangedPilesForAuto(); // 牌会回到 myHand

    // 确保 myHand 现在确实有13张牌
    if (gameStore.myHand.length !== totalCards) {
        setClientError("智能整理前手牌数量不正确，请刷新或重试。");
        return;
    }

    // 创建一个副本进行排序，避免直接修改store中的响应式数组顺序导致不必要的更新
    const sortedHandForOps = [...gameStore.myHand].sort((a, b) => b.rank - a.rank); // 按点数降序

    // 清空store中的myHand，然后按排序后的顺序重新填充，确保moveCard时索引正确
    gameStore.myHand.length = 0;
    sortedHandForOps.forEach(c => gameStore.myHand.push(c));

    // 尾墩：最大的5张牌 (从myHand头部取，因为已降序)
    for (let i = 0; i < pileLimits.back; i++) {
        if (gameStore.myHand.length > 0) {
            // 总是从myHand的第一个元素开始移动（因为它是最大的未分配牌）
            gameStore.moveCard(gameStore.myHand[0], 'myHand', 'back', 0);
        }
    }
    // 头墩：最小的3张牌 (从myHand尾部取，因为已降序，尾部是最小的)
    // 先对剩余在myHand的牌按升序排列，取前3张
    const remainingInMyHandForFront = [...gameStore.myHand].sort((a, b) => a.rank - b.rank);
    for (let i = 0; i < pileLimits.front; i++) {
        if (remainingInMyHandForFront.length > 0) {
            const cardToMoveToFront = remainingInMyHandForFront.shift(); // 取出最小的
            // 找到这张牌在当前 myHand 中的实际索引并移动
            const idxInMyHand = gameStore.myHand.findIndex(c => c.id === cardToMoveToFront.id);
            if (idxInMyHand !== -1) {
                gameStore.moveCard(gameStore.myHand[idxInMyHand], 'myHand', 'front', idxInMyHand);
            }
        }
    }
    // 此时 myHand 中剩下的牌（应该是5张）自然成为中墩

    selectedCard.value = null; // 清除选择
    setClientError("已尝试智能整理，请检查并调整。", 5000);
}

async function handleAiArrange() {
    if (!canAutoArrange.value) {
        setClientError("请确保所有13张牌都在手牌区才能使用 AI 分牌。");
        return;
    }
    setClientError(null);
    // 调用 store action 前，确保所有牌在 myHand
    gameStore.clearArrangedPilesForAuto();
     if (gameStore.myHand.length !== totalCards) {
        setClientError("AI分牌前手牌数量不正确，请刷新或重试。");
        return;
    }

    const success = await gameStore.aiArrangeHand();
    if (success) {
        setClientError("AI 已尝试分牌，请检查并调整。", 5000);
        selectedCard.value = null;
    } else {
        setClientError(gameStore.error || "AI 分牌失败，请稍后再试或手动摆牌。", 5000);
    }
}
</script>

<style scoped>
.player-hand-organizer-streamlined {
  padding: 15px;
  background-color: #e6f0f7;
  border-radius: 8px;
}
.piles-layout {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
}
.pile {
  width: 95%;
  max-width: 600px;
  padding: 10px;
  border: 1px solid #c5d9e8;
  border-radius: 8px;
  background-color: #fff;
  box-shadow: 0 3px 6px rgba(0,0,0,0.08);
  transition: all 0.2s ease-in-out;
}
.pile.pile-complete {
    border-color: #4CAF50;
    background-color: #f0fff0;
}
.pile p {
  text-align: center;
  margin: 0 0 10px 0;
  font-weight: 600;
  color: #3a5a78;
  font-size: 1em;
  display: flex;
  justify-content: center;
  align-items: center;
}
.dun-complete-badge {
    color: #4CAF50;
    font-size: 1.2em;
    margin-left: 8px;
}
.selected-card-prompt {
    font-size: 0.8em;
    color: #007bff;
    margin-left: 10px;
    font-weight: normal;
}
.inline-card-tiny {
    transform: scale(0.45);
    margin: -12px -18px;
    vertical-align: middle;
}
.hand-row.pile-content {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  min-height: 85px;
}
.hand-row.pile-content .card {
  margin: 3px;
}
.main-hand-area {
  border-style: dashed;
  border-width: 2px;
  background-color: #f8fbfd;
}
.main-hand-area.middle-dun-active {
  border-style: solid;
  border-color: #5c9dde;
}
.droppable-target:hover {
  border-color: #5c9dde;
  /* transform: translateY(-2px); // 悬停效果可以简化或移除，避免过多动态 */
}
.empty-notice {
  width: 100%;
  text-align: center;
  color: #99aabb;
  font-style: italic;
  padding: 20px 0;
}
.controls-area {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 20px;
}
.control-button {
  padding: 10px 20px;
  font-size: 1em;
  border-radius: 20px;
  border: none;
  cursor: pointer;
  transition: all 0.3s;
  font-weight: 500;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
}
.auto-arrange-btn {
  background-color: #ffc107;
  color: #333;
}
.auto-arrange-btn:hover:not(:disabled) { background-color: #e0a800; }
.ai-arrange-btn {
  background-color: #9b59b6;
  color: white;
}
.ai-arrange-btn:hover:not(:disabled) { background-color: #8e44ad; }
.submit-btn {
  background-color: #28a745;
  color: white;
}
.submit-btn:hover:not(:disabled) { background-color: #218838; }
.control-button:disabled {
  background-color: #e9ecef;
  color: #6c757d;
  cursor: not-allowed;
  box-shadow: none;
}
.feedback-message {
  text-align: center;
  margin-top: 15px;
  font-weight: 500;
  min-height: 1.2em; /* 避免消息出现/消失时布局跳动 */
}
.feedback-message.error { color: #d9534f; }
.feedback-message.info { color: #007bff; }

.card.selected {
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.5), 0 4px 10px rgba(0,0,0,0.1);
  transform: scale(1.05) translateY(-4px);
}
</style>
