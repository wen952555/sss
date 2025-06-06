<template>
  <div class="player-hand-organizer-streamlined">
    <div class="piles-layout">
      <!-- 头墩 -->
      <div class="pile front-pile droppable-target" :class="{ 'pile-complete': gameStore.arrangedHand.front.length === pileLimits.front }" @click="handleClickTargetPile('front')">
        <p>头墩 ({{ gameStore.arrangedHand.front.length }}/{{ pileLimits.front }}) <span v-if="isDunComplete('front')" class="dun-complete-badge">✓</span></p>
        <div class="hand-row pile-content">
          <Card v-for="(card, index) in gameStore.arrangedHand.front" :key="`front-${card.id}`" :card="card" :is-face-up="true" :selected="isSelected(card, 'front')" @click.stop="handleClickCardInArrangedPile('front', card, index)" />
        </div>
      </div>
      <!-- 手牌区 / 中墩区 -->
      <div class="pile main-hand-area droppable-target" :class="{ 'middle-dun-active': isMiddleDunActive, 'pile-complete': isMiddleDunActive && gameStore.myHand.length === pileLimits.middle }" @click="handleClickTargetPile('myHand')">
        <p>{{ middleDunLabel }} ({{ gameStore.myHand.length }}{{ isMiddleDunActive ? ('/'+pileLimits.middle) : '' }}张) <span v-if="isMiddleDunActive && isDunComplete('middle')" class="dun-complete-badge">✓</span> <span v-if="selectedCard" class="selected-card-prompt"> - 选: <Card :card="selectedCard.card" :is-face-up="true" class="inline-card-tiny"/></span></p>
        <div class="hand-row pile-content">
          <Card v-for="(card, index) in gameStore.myHand" :key="`myhand-${card.id}`" :card="card" :is-face-up="true" :selected="isSelected(card, 'myHand')" @click.stop="handleClickCardInMyHand(card, index)" />
          <div v-if="gameStore.myHand.length === 0 && !selectedCard" class="empty-notice">手牌区已空</div>
        </div>
      </div>
      <!-- 尾墩 -->
      <div class="pile back-pile droppable-target" :class="{ 'pile-complete': gameStore.arrangedHand.back.length === pileLimits.back }" @click="handleClickTargetPile('back')">
        <p>尾墩 ({{ gameStore.arrangedHand.back.length }}/{{ pileLimits.back }}) <span v-if="isDunComplete('back')" class="dun-complete-badge">✓</span></p>
        <div class="hand-row pile-content">
          <Card v-for="(card, index) in gameStore.arrangedHand.back" :key="`back-${card.id}`" :card="card" :is-face-up="true" :selected="isSelected(card, 'back')" @click.stop="handleClickCardInArrangedPile('back', card, index)" />
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
    <p v-if="gameStore.isLoading" class="feedback-message info">处理中...</p>
    <p v-if="clientError && !gameStore.isLoading" class="feedback-message error">{{ clientError }}</p>
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
const middleDunLabel = computed(() => isMiddleDunActive.value ? "中墩" : "手牌区");
const canUseArrangeButtons = computed(() => {
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
    if (duration > 0 && message) {
        setTimeout(() => { clientError.value = null; }, duration);
    } else if (!message) {
        clientError.value = null;
    }
}
function isSelected(card, pileName) { return selectedCard.value && selectedCard.value.card.id === card.id && selectedCard.value.fromPile === pileName; }
function handleClickCardInMyHand(card, index) { /* ... (同上一版本) ... */ }
function handleClickCardInArrangedPile(pileName, card, index) { /* ... (同上一版本) ... */ }
function handleClickTargetPile(targetPileName) { /* ... (同上一版本) ... */ }
const canSubmitEffectively = computed(() => {
  return gameStore.canSubmitHand &&
         gameStore.arrangedHand.front.length === pileLimits.front &&
         gameStore.arrangedHand.back.length === pileLimits.back &&
         gameStore.myHand.length === pileLimits.middle;
});
async function submitHandWrapper() { /* ... (同上一版本, 调用 submitArrangedHandInternal) ... */ }
function autoArrangeForSubmission() { /* ... (同上一版本) ... */ }
async function handleAiArrange() { /* ... (同上一版本) ... */ }
</script>

<style scoped>
/* ... (样式与上一版本 PlayerHand.vue 相同) ... */
.player-hand-organizer-streamlined { /* ... */ }
/* ... etc ... */
.feedback-message.info {
  text-align: center;
  color: #007bff;
  margin-top: 10px;
  font-weight: 500;
  min-height: 1.2em;
}
</style>
