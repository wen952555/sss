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
        <button @click="autoArrangeForSubmission" :disabled="!canAutoArrange" class="control-button auto-arrange-btn">
            智能整理
        </button>
        <!-- 新增 AI 分牌按钮 -->
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
// ... (import 语句和大部分 script setup 内容与上一版本相同)
import { ref, computed } from 'vue'; // watch 可能不再那么需要了，如果AI直接更新
import { useGameStore } from '../store/game';
import Card from './Card.vue';

const gameStore = useGameStore();
const selectedCard = ref(null);
const clientError = ref(null);

const pileLimits = { front: 3, middle: 5, back: 5 };
const totalCards = 13;

const isMiddleDunActive = computed(() => { /* ... 同前 ... */ });
const middleDunLabel = computed(() => { /* ... 同前 ... */ });

const canAutoArrange = computed(() => { // 这个条件也适用于 AI 分牌
    return gameStore.myHand.length === totalCards &&
           gameStore.arrangedHand.front.length === 0 &&
           gameStore.arrangedHand.back.length === 0 &&
           gameStore.canSubmitHand;
});

const isDunComplete = (pileName) => { /* ... 同前 ... */ };
function setClientError(message, duration = 3000) { /* ... 同前 ... */ }
function isSelected(card, pileName) { /* ... 同前 ... */ }
function handleClickCardInMyHand(card, index) { /* ... 同前 ... */ }
function handleClickCardInArrangedPile(pileName, card, index) { /* ... 同前 ... */ }
function handleClickTargetPile(targetPileName) { /* ... 同前 ... */ }

const canSubmitEffectively = computed(() => { /* ... 同前 ... */ });
async function submitHandWrapper() { /* ... 同前 ... */ }
function autoArrangeForSubmission() { /* ... 同前 ... */ }

// 新增：处理 AI 分牌按钮点击
async function handleAiArrange() {
    if (!canAutoArrange.value) {
        setClientError("请确保所有13张牌都在手牌区才能使用 AI 分牌。");
        return;
    }
    setClientError(null); // 清除之前的错误
    const success = await gameStore.aiArrangeHand();
    if (success) {
        setClientError("AI 已尝试分牌，请检查并调整。", 5000);
        selectedCard.value = null; // 清除选择状态
    } else {
        // gameStore.error 会显示 API 错误
        setClientError(gameStore.error || "AI 分牌失败，请稍后再试或手动摆牌。", 5000);
    }
}
</script>

<style scoped>
/* ... (大部分样式与上一版本相同) ... */
.controls-area {
  display: flex;
  justify-content: center;
  flex-wrap: wrap; /* 允许按钮换行 */
  gap: 10px; /* 按钮间距调整 */
  margin-top: 20px;
}
.control-button { /* ... 同前 ... */ }
.auto-arrange-btn { /* ... 同前 ... */ }
.ai-arrange-btn {
  background-color: #9b59b6; /* 紫色 */
  color: white;
}
.ai-arrange-btn:hover:not(:disabled) { background-color: #8e44ad; }
.submit-btn { /* ... 同前 ... */ }
.feedback-message.info {
  text-align: center;
  color: #007bff;
  margin-top: 15px;
  font-weight: 500;
}
/* 其他样式保持不变 */
.player-hand-organizer-streamlined { /* ... */ }
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
.control-button:disabled { /* ... */ }
.feedback-message.error { /* ... */ }
.card.selected { /* ... */ }
</style>
