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
          <div v-if="gameStore.myHand.length === 0 && !selectedCard" class="empty-notice">手牌区已空，可从墩牌移回</div>
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
        <button @click="autoArrangeForSubmission" :disabled="!canUseArrangeButtons || gameStore.isLoading" class="control-button auto-arrange-btn">
            智能整理
        </button>
        <button @click="handleAiArrange" :disabled="!canUseArrangeButtons || gameStore.isLoading" class="control-button ai-arrange-btn">
            AI 分牌
        </button>
        <button @click="submitHandWrapper" :disabled="!canSubmitEffectively || gameStore.isLoading" class="control-button submit-btn">
            提交牌型
        </button>
    </div>
    <p v-if="gameStore.isLoading" class="feedback-message info">处理中，请稍候...</p>
    <p v-if="clientError && !gameStore.isLoading" class="feedback-message error">{{ clientError }}</p>
    <!-- API 错误通常由 GameBoard.vue 显示，这里主要显示 PlayerHand 内部的客户端交互错误 -->
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
  // 当头墩和尾墩都满了，并且手牌区（myHand）的牌数正好是中墩所需的牌数时，它才被视为“中墩”
  return gameStore.arrangedHand.front.length === pileLimits.front &&
         gameStore.arrangedHand.back.length === pileLimits.back &&
         gameStore.myHand.length === (totalCards - pileLimits.front - pileLimits.back); // 13 - 3 - 5 = 5
});

const middleDunLabel = computed(() => {
  return isMiddleDunActive.value ? "中墩" : "手牌区";
});

// "智能整理" 和 "AI分牌" 按钮的可用条件
const canUseArrangeButtons = computed(() => {
    return gameStore.myHand.length === totalCards && // 所有13张牌都在手牌区
           gameStore.arrangedHand.front.length === 0 && // 头墩为空
           gameStore.arrangedHand.back.length === 0 &&  // 尾墩为空
           gameStore.canSubmitHand; // 游戏状态允许操作 (例如在 'arranging' 阶段且未提交)
});

const isDunComplete = (pileName) => {
    if (pileName === 'front') return gameStore.arrangedHand.front.length === pileLimits.front;
    if (pileName === 'back') return gameStore.arrangedHand.back.length === pileLimits.back;
    if (pileName === 'middle' && isMiddleDunActive.value) return gameStore.myHand.length === pileLimits.middle;
    return false;
};

function setClientError(message, duration = 3000) {
    clientError.value = message;
    gameStore.error = null; // 清除 store 中的 API 错误，避免同时显示
    if (duration > 0 && message) {
        setTimeout(() => { clientError.value = null; }, duration);
    } else if (!message) {
        clientError.value = null;
    }
}

function isSelected(card, pileName) {
    return selectedCard.value && selectedCard.value.card.id === card.id && selectedCard.value.fromPile === pileName;
}

// 点击“手牌区”（即 myHand）中的牌
function handleClickCardInMyHand(card, index) {
  if (isSelected(card, 'myHand')) { // 如果重复点击已选中的牌，则取消选择
    selectedCard.value = null;
  } else { // 否则，选择这张牌
    selectedCard.value = { card, fromPile: 'myHand', fromIndex: index };
  }
}

// 点击“头墩”或“尾墩”中的牌
function handleClickCardInArrangedPile(pileName, card, index) {
  if (selectedCard.value) {
    // 如果当前有选中的牌（该牌必然来自 myHand，因为我们不允许墩与墩直接移动）
    // 此时点击墩内牌，视为无效操作或引导用户先取消选择或点击目标墩空白
    if (selectedCard.value.fromPile === 'myHand') {
        setClientError("已选中手牌，请点击目标墩的空白区域来放置，或点击手牌区取消选择。", 2500);
        return;
    }
    // 如果选中的牌是这个墩里的另一张牌（理论上不应发生，因为我们会先取消选择）
    // 或者，如果出现异常状态，就取消选择
    selectedCard.value = null;

  } else { // 如果没有牌被选中，则将这张墩牌移回“手牌区” (myHand)
    const success = gameStore.moveCard(card, pileName, 'myHand', index);
    if (!success) setClientError(`无法将牌从 ${pileName} 移回手牌区。`);
  }
}

// 点击目标墩的空白区域（头墩、尾墩、或手牌区/中墩区）
function handleClickTargetPile(targetPileName) {
  if (!selectedCard.value) return; // 没有选中的牌，点击空白无效

  const { card, fromPile, fromIndex } = selectedCard.value;

  // 如果点击的是选中牌当前所在的区域的空白处，则取消选择
  if (fromPile === targetPileName) {
    selectedCard.value = null;
    return;
  }

  let targetLimit = Infinity; // 手牌区（myHand）作为目标时，总上限是13，但通常是从墩移入
  if (targetPileName === 'front') targetLimit = pileLimits.front;
  else if (targetPileName === 'back') targetLimit = pileLimits.back;

  let currentTargetLength = 0;
  if (targetPileName === 'myHand') currentTargetLength = gameStore.myHand.length;
  else currentTargetLength = gameStore.arrangedHand[targetPileName].length;

  if (currentTargetLength < targetLimit) {
    const success = gameStore.moveCard(card, fromPile, targetPileName, fromIndex);
    if (success) {
      selectedCard.value = null; // 成功移动后取消选择
    } else {
      setClientError(`无法将牌移动到 ${targetPileName}。`);
    }
  } else {
    setClientError(`${targetPileName === 'myHand' ? '手牌区' : targetPileName + '墩'} 已满！`);
  }
}

const canSubmitEffectively = computed(() => {
  return gameStore.canSubmitHand && // 游戏状态允许提交
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
    gameStore.error = null; // 清除 store 中的 API 错误
    const handToSubmitLogic = {
        front: gameStore.arrangedHand.front.map(c => c.id),
        middle: gameStore.myHand.map(c => c.id), // myHand 作为中墩
        back: gameStore.arrangedHand.back.map(c => c.id),
    };
    const submitSuccess = await gameStore.submitArrangedHandInternal(handToSubmitLogic);
    if (!submitSuccess && !gameStore.error) { // 如果 store action 返回 false 但没有设置 error
        setClientError("提交失败，未知原因。");
    } else if (!submitSuccess && gameStore.error) {
        setClientError(gameStore.error); // 显示 store 中设置的 API 错误
    }
}

// "智能整理"按钮的逻辑
function autoArrangeForSubmission() {
    if (!canUseArrangeButtons.value) {
        setClientError("请确保所有13张牌都在手牌区才能使用此功能。");
        return;
    }
    setClientError(null); gameStore.error = null;
    gameStore.clearArrangedPilesForAuto(); // 牌会回到 myHand, isAiArrangementActive会变false

    if (gameStore.myHand.length !== totalCards) {
        setClientError("智能整理前手牌数量不正确，请刷新或重试。");
        return;
    }

    const sortedHandForOps = [...gameStore.myHand].sort((a, b) => b.rank - a.rank); // 按点数降序

    gameStore.myHand.length = 0; // 清空 store 的 myHand 以便用 moveCard 从特定顺序的数组填充
    sortedHandForOps.forEach(c => gameStore.myHand.push(c)); // 按排序顺序重新填充

    // 尾墩：最大的5张牌 (从myHand头部取，因为已降序)
    for (let i = 0; i < pileLimits.back; i++) {
        if (gameStore.myHand.length > 0) {
            gameStore.moveCard(gameStore.myHand[0], 'myHand', 'back', 0);
        }
    }
    // 头墩：最小的3张牌 (从myHand剩余牌中取最小的)
    const remainingInMyHandForFront = [...gameStore.myHand].sort((a, b) => a.rank - b.rank); // 对剩余牌升序
    for (let i = 0; i < pileLimits.front; i++) {
        if (remainingInMyHandForFront.length > 0) {
            const cardToMoveToFront = remainingInMyHandForFront.shift();
            const idxInMyHand = gameStore.myHand.findIndex(c => c.id === cardToMoveToFront.id);
            if (idxInMyHand !== -1) {
                gameStore.moveCard(gameStore.myHand[idxInMyHand], 'myHand', 'front', idxInMyHand);
            }
        }
    }
    // 此时 myHand 中剩下的牌（应该是5张）自然成为中墩
    selectedCard.value = null;
    setClientError("已尝试智能整理，请检查并调整。", 3000);
}

// "AI 分牌"按钮的逻辑
async function handleAiArrange() {
    if (!canUseArrangeButtons.value) {
        setClientError("请确保所有13张牌都在手牌区才能使用AI分牌。");
        return;
    }
    setClientError(null); gameStore.error = null;
    
    // aiArrangeHand 内部会调用 clearArrangedPilesForAuto，
    // 确保所有牌都在 myHand 中，并且 isAiArrangementActive 被设为 false
    
    const success = await gameStore.aiArrangeHand();
    
    if (success) {
        setClientError("AI 已尝试分牌，请检查并调整。", 3000);
        selectedCard.value = null; // 清除选择状态
    } else {
        // gameStore.error 会由 aiArrangeHand action 设置
        setClientError(gameStore.error || "AI 分牌失败，请稍后再试或手动摆牌。", 3000);
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
  min-height: 1.2em;
}
.feedback-message.error { color: #d9534f; }
.feedback-message.info { color: #007bff; }

.card.selected {
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.5), 0 4px 10px rgba(0,0,0,0.1);
  transform: scale(1.05) translateY(-4px);
}
</style>
