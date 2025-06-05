<template>
  <div class="player-hand-input">
    <h3>请摆放你的牌墩</h3>
    <div v-if="submissionMessage" :class="['submission-message', messageType]">{{ submissionMessage }}</div>

    <div class="hand-area available-cards-area">
      <h4>
        你的手牌:
        <span v-if="currentHandForDisplay.length > 0">({{ currentHandForDisplay.length }} 张)</span>
        <span v-else-if="!gameStore.isGameLoading && (!props.initialCards || props.initialCards.length === 0) && gameStore.gameState?.status === 'playing'">(等待发牌或无手牌)</span>
      </h4>
      <div class="card-list">
        <CardDisplay
          v-for="card in currentHandForDisplay"
          :key="'avail-' + card.id"
          :card="card"
          :is-selected="isSelectedInAvailable(card)"
          @select="toggleSelectAvailableCard"
          class="static-card"
        />
      </div>
    </div>

    <div class="arranged-hands-container-simplified">
      <div class="dun-section">
        <h4>头墩 (3张) - {{ frontDunTypeInfo.name }} <button @click="addSelectedToDun('front')" :disabled="selectedAvailableCards.length === 0 || frontDun.length >= 3 || isSubmitted">放入</button></h4>
        <div class="card-list dun-list">
          <CardDisplay v-for="card in frontDun" :key="'f-'+card.id" :card="card" @select="removeFromDun('front', card)" :is-selectable="!isSubmitted" class="static-card in-dun"/>
        </div>
        <p v-if="!isFrontDunValidCount && !isSubmitted && frontDun.length > 0" class="dun-error">需3张</p>
      </div>
      <div class="dun-section">
        <h4>中墩 (5张) - {{ midDunTypeInfo.name }} <button @click="addSelectedToDun('mid')" :disabled="selectedAvailableCards.length === 0 || midDun.length >= 5 || isSubmitted">放入</button></h4>
        <div class="card-list dun-list">
          <CardDisplay v-for="card in midDun" :key="'m-'+card.id" :card="card" @select="removeFromDun('mid', card)" :is-selectable="!isSubmitted" class="static-card in-dun"/>
        </div>
        <p v-if="!isMidDunValidCount && !isSubmitted && midDun.length > 0" class="dun-error">需5张</p>
      </div>
      <div class="dun-section">
        <h4>尾墩 (5张) - {{ backDunTypeInfo.name }} <button @click="addSelectedToDun('back')" :disabled="selectedAvailableCards.length === 0 || backDun.length >= 5 || isSubmitted">放入</button></h4>
        <div class="card-list dun-list">
          <CardDisplay v-for="card in backDun" :key="'b-'+card.id" :card="card" @select="removeFromDun('back', card)" :is-selectable="!isSubmitted" class="static-card in-dun"/>
        </div>
        <p v-if="!isBackDunValidCount && !isSubmitted && backDun.length > 0" class="dun-error">需5张</p>
      </div>
    </div>
     <div v-if="倒水提示 && !isSubmitted" class="倒水-tip error-message">{{ 倒水提示 }}</div>

    <div class="action-buttons">
      <button @click="submitPlayerHand" :disabled="!canSubmitHand || gameStore.isGameLoading || isSubmitted" class="submit-button">
        {{ isSubmitted ? '牌型已提交' : (gameStore.isGameLoading ? '处理中...' : '确认提交牌型') }}
      </button>
      <button @click="resetCurrentArrangementSimplified" :disabled="isSubmitted || gameStore.isGameLoading" class="reset-arrange-button">
        重置摆牌
      </button>
    </div>
  </div>
</template>

<script setup>
// ... (与上一版包含点击交互的版本基本相同，确保 watch initialCards 的逻辑正确) ...
import { ref, computed, watch, onMounted } from 'vue';
import { useGameStore } from '../stores/gameStore';
import CardDisplay from './CardDisplay.vue';
import { GameLogic as FrontendGameLogic } from '../utils/frontendGameLogic';

const gameStore = useGameStore();
const props = defineProps({
    initialCards: { type: Array, default: () => [] },
    isSubmitted: { type: Boolean, default: false } // isSubmitted 现在由父组件通过 myPlayerDetails.is_ready 传递
});

const currentHandForDisplay = ref([]);
const selectedAvailableCards = ref([]);
const frontDun = ref([]);
const midDun = ref([]);
const backDun = ref([]);
const submissionMessage = ref('');
const messageType = ref('info');
const 倒水提示 = ref('');

function initializeHandsSimplified(cards) {
    if (props.isSubmitted) { // 如果已提交，显示已提交的牌墩 (从父组件或store获取)
        const me = gameStore.myPlayerDetails;
        if (me && me.hand_front) frontDun.value = [...me.hand_front]; else frontDun.value = [];
        if (me && me.hand_mid) midDun.value = [...me.hand_mid]; else midDun.value = [];
        if (me && me.hand_back) backDun.value = [...me.hand_back]; else backDun.value = [];
        currentHandForDisplay.value = []; // 已提交，手牌区为空
    } else { // 未提交状态，用传入的牌初始化
        currentHandForDisplay.value = cards ? [...cards].sort((a,b) => b.value - a.value) : [];
        frontDun.value = []; midDun.value = []; backDun.value = [];
    }
    selectedAvailableCards.value = [];
    submissionMessage.value = ''; // 清除之前的提交信息
    倒水提示.value = '';     // 清除之前的倒水提示
}

watch(() => props.initialCards, (newCards, oldCards) => {
    // 只有在牌真的变化了，并且当前不是已提交状态时才重置
    // 或者，如果从有牌变成无牌（例如新一局开始前的清理），也应该重置
    const newCardsJson = JSON.stringify(newCards);
    const oldCardsJson = JSON.stringify(oldCards);

    if (newCardsJson !== oldCardsJson) { // 只有当 initialCards 确实变化时
        // console.log("[PlayerHandInput] props.initialCards changed. isSubmitted:", props.isSubmitted);
        if (!props.isSubmitted) { // 如果未提交，则用新牌初始化
            initializeHandsSimplified(newCards);
        } else { // 如果已提交，也尝试用新牌（可能是空数组）或已提交的牌墩信息重新初始化显示
            // 这一分支可能需要根据 isSubmitted 时的期望行为调整
            // 现在的逻辑是：如果 isSubmitted 为 true，则 initializeHandsSimplified 会尝试从 store 加载牌墩
            initializeHandsSimplified(newCards); // 即使已提交，也调用，它内部会检查 isSubmitted
        }
    }
}, { deep: true, immediate: true });

watch(() => props.isSubmitted, (newVal) => {
    // console.log("[PlayerHandInput] props.isSubmitted changed to:", newVal);
    if (newVal) {
        submissionMessage.value = "您的牌型已提交。";
        messageType.value = "success";
        // 确保已提交的牌墩正确显示
        initializeHandsSimplified(props.initialCards); // 会从 store 加载已提交的牌墩
    } else {
        // 如果从已提交变为未提交（例如新一局），用最新的 initialCards 重置
        initializeHandsSimplified(props.initialCards);
    }
});

// ... (isSelectedInAvailable, toggleSelectAvailableCard, addSelectedToDun, removeFromDun, isFrontDunValidCount, etc., canSubmitHand, frontDunTypeInfo, etc., validateOverallStructure, submitPlayerHand, resetCurrentArrangementSimplified 与上一版相同)
// ... onMounted 确保调用 initializeHandsSimplified
onMounted(() => {
    initializeHandsSimplified(props.initialCards);
});
</script>

<style scoped>
/* 样式与上一版相同 */
</style>
