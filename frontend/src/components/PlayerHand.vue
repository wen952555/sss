<template>
  <div class="player-hand-organizer-streamlined">
    <div class="piles-layout">
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
const selectedCard = ref(null);
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
        setClientError("请先将选中的牌放回手牌区，或点击目标墩放置。", 2000);
        // selectedCard.value = null; // 不取消选择，让用户决定下一步
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
     // 如果选中了其他墩的牌，再点这个墩的牌，就尝试把这个墩的牌移回手牌区
    const success = gameStore.moveCard(card, pileName, 'myHand', index);
    if (!success) setClientError(`无法将牌从 ${pileName} 移回手牌区。`);
    selectedCard.value = null; // 操作后清除选择

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
        setClientError(gameStore.error || "AI 分牌失败，请稍后再试或手动摆牌。", 5000);
    }
}
</script>

<style scoped>
.player-hand-organizer-streamlined { /* ... (样式与上一版本相同) ... */ }
.piles-layout { /* ... */ }
.pile { /* ... */ }
.pile.pile-complete { /* ... */ }
.pile p { /* ... */ }
.dun-complete-badge { /* ... */ }
.selected-card-prompt { /* ... */ }
.inline-card-tiny { /* ... */ }
.hand-row.pile-content { /* ... */ }
.hand-row.pile-content .card { /* ... */ }
.main-hand-area { /* ... */ }
.main-hand-area.middle-dun-active { /* ... */ }
.droppable-target:hover { /* ... */ }
.empty-notice { /* ... */ }
.controls-area { /* ... */ }
.control-button { /* ... */ }
.auto-arrange-btn { /* ... */ }
.ai-arrange-btn { /* ... */ }
.submit-btn { /* ... */ }
.control-button:disabled { /* ... */ }
.feedback-message { /* ... */ }
.feedback-message.error { /* ... */ }
.feedback-message.info { /* ... */ }
.card.selected { /* ... */ }
</style>
