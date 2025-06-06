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
    <p v-if="gameStore.error || clientError" class="feedback-message error">{{ gameStore.error || clientError }}</p>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useGameStore } from '../store/game';
import Card from './Card.vue';

const gameStore = useGameStore();
const selectedCard = ref(null); // { card: CardObject, fromPile: string, fromIndex: number }
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
           gameStore.canSubmitHand;
});

const isDunComplete = (pileName) => {
    if (pileName === 'front') return gameStore.arrangedHand.front.length === pileLimits.front;
    if (pileName === 'back') return gameStore.arrangedHand.back.length === pileLimits.back;
    if (pileName === 'middle' && isMiddleDunActive.value) return gameStore.myHand.length === pileLimits.middle;
    return false;
};

function setClientError(message, duration = 3000) {
    clientError.value = message;
    if (duration > 0) {
        setTimeout(() => { clientError.value = null; }, duration);
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
    if (selectedCard.value.fromPile === 'myHand') {
        setClientError("请先将选中的牌放回手牌区，再操作此墩的牌。", 2000);
        selectedCard.value = null;
        return;
    }
    if (isSelected(card, pileName)) {
        selectedCard.value = null;
        return;
    }
    if (selectedCard.value.fromPile !== 'myHand' && selectedCard.value.fromPile !== pileName) {
        setClientError("墩之间的牌请通过手牌区移动。", 2000);
        selectedCard.value = null;
        return;
    }
  } else {
    const success = gameStore.moveCard(card, pileName, 'myHand', index);
    if (!success) setClientError(`无法将牌从 ${pileName} 移回手牌区。`);
  }
}

function handleClickTargetPile(targetPileName) {
  if (!selectedCard.value) return;

  const { card, fromPile, fromIndex } = selectedCard.value;

  if (fromPile === targetPileName) {
    selectedCard.value = null;
    return;
  }

  let targetLimit = Infinity;
  if (targetPileName === 'front') targetLimit = pileLimits.front;
  else if (targetPileName === 'back') targetLimit = pileLimits.back;

  let currentTargetLength = 0;
  if (targetPileName === 'myHand') currentTargetLength = gameStore.myHand.length;
  else currentTargetLength = gameStore.arrangedHand[targetPileName].length;

  if (currentTargetLength < targetLimit) {
    const success = gameStore.moveCard(card, fromPile, targetPileName, fromIndex);
    if (success) {
      selectedCard.value = null;
    } else {
      setClientError(`无法将牌移动到 ${targetPileName}。`);
    }
  } else {
    setClientError(`墩位 ${targetPileName} 已满！`);
  }
}

const canSubmitEffectively = computed(() => {
  return gameStore.canSubmitHand &&
         gameStore.arrangedHand.front.length === pileLimits.front &&
         gameStore.arrangedHand.back.length === pileLimits.back &&
         gameStore.myHand.length === pileLimits.middle;
});

async function submitHandWrapper() {
    if (!canSubmitEffectively.value) {
        setClientError("牌型未按 头3-中5-尾5 摆满或不符合提交条件。");
        return;
    }
    clientError.value = null;
    const handToSubmitLogic = {
        front: gameStore.arrangedHand.front.map(c => c.id),
        middle: gameStore.myHand.map(c => c.id),
        back: gameStore.arrangedHand.back.map(c => c.id),
    };
    await gameStore.submitArrangedHandInternal(handToSubmitLogic);
}

function autoArrangeForSubmission() {
    if (!canAutoArrange.value) {
        setClientError("请确保所有13张牌都在手牌区才能智能整理。");
        return;
    }
    gameStore.clearArrangedPilesForAuto();

    const sortedHand = [...gameStore.myHand].sort((a, b) => b.rank - a.rank);

    gameStore.myHand.length = 0;
    sortedHand.forEach(c => gameStore.myHand.push(c));

    for (let i = 0; i < pileLimits.back; i++) {
        if (gameStore.myHand.length > 0) gameStore.moveCard(gameStore.myHand[0], 'myHand', 'back', 0);
    }
    const cardsForFront = [...gameStore.myHand].sort((a,b) => a.rank - b.rank).slice(0, pileLimits.front);
    for (const card of cardsForFront) {
        const idxInMyHand = gameStore.myHand.findIndex(c => c.id === card.id);
        if (idxInMyHand !== -1) {
            gameStore.moveCard(gameStore.myHand[idxInMyHand], 'myHand', 'front', idxInMyHand);
        }
    }
    selectedCard.value = null;
    setClientError("已尝试智能整理，请检查并调整。", 5000);
}

async function handleAiArrange() {
    if (!canAutoArrange.value) {
        setClientError("请确保所有13张牌都在手牌区才能使用 AI 分牌。");
        return;
    }
    setClientError(null);
    const success = await gameStore.aiArrangeHand();
    if (success) {
        setClientError("AI 已尝试分牌，请检查并调整。", 5000);
        selectedCard.value = null;
    } else {
        // gameStore.error 会显示 API 错误, 或者用 clientError
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
  transform: translateY(-2px);
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
  background-color: #9b59b6; /* 紫色 */
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
.feedback-message { /* 通用提示信息样式 */
  text-align: center;
  margin-top: 15px;
  font-weight: 500;
}
.feedback-message.error { color: #d9534f; }
.feedback-message.info { color: #007bff; }

.card.selected {
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.5), 0 4px 10px rgba(0,0,0,0.1);
  transform: scale(1.05) translateY(-4px);
}
</style>
