<template>
  <div class="player-hand-input">
    <h3>请摆放你的牌墩</h3>
    <!-- ... (submissionMessage, 倒水提示 与上一版相同) ... -->

    <div class="hand-area available-cards-area">
      <h4>
        你的手牌:
        <span v-if="currentHandForDisplay.length > 0">({{ currentHandForDisplay.length }} 张)</span>
        <!-- 修改这里的条件，更精确 -->
        <span v-else-if="!gameStore.isLoading && props.initialCards && props.initialCards.length === 0 && gameStore.isGamePlaying && !props.isSubmitted">
            (已发牌，但手牌区为空 - 可能已全部摆放或等待数据显示)
        </span>
         <span v-else-if="!gameStore.isLoading && (!props.initialCards || props.initialCards.length === 0) && gameStore.isGamePlaying && !props.isSubmitted">
            正在获取手牌...
        </span>
      </h4>
      <div class="card-list">
        <CardDisplay
          v-for="card in currentHandForDisplay"
          :key="'avail-' + card.id"
          :card="card"
          :is-selected="isSelectedInAvailable(card)" 
          @select="toggleSelectAvailableCard(card)"
          class="static-card"
        />
      </div>
    </div>

    <!-- ... (牌墩区和按钮与上一版相同) ... -->
  </div>
</template>

<script setup>
// ... (import, props, ref 定义与上一版相同) ...
import { ref, computed, watch, onMounted } from 'vue';
import { useGameStore } from '../stores/gameStore';
import CardDisplay from './CardDisplay.vue';
import { GameLogic as FrontendGameLogic } from '../utils/frontendGameLogic';

const gameStore = useGameStore();
const props = defineProps({ /* ... */ });
const currentHandForDisplay = ref([]); // 这个是用来操作的牌
// ... (其他 ref)

function initializeHandsSimplified(cards) {
    // console.log(`[PlayerHandInput] initializeHandsSimplified. isSubmitted: ${props.isSubmitted}, Received cards length: ${cards ? cards.length : 'null/undefined'}`);
    if (props.isSubmitted) {
        const me = gameStore.myPlayerDetails;
        currentHandForDisplay.value = []; // 已提交，手牌区应为空
        frontDun.value = me?.hand_front ? [...me.hand_front] : [];
        midDun.value = me?.hand_mid ? [...me.hand_mid] : [];
        backDun.value = me?.hand_back ? [...me.hand_back] : [];
    } else {
        // 只有在未提交状态下，才用 props.initialCards 更新 currentHandForDisplay
        // 并且确保 currentHandForDisplay 是空的，或者传入的 cards 与当前的不同
        if (!currentHandForDisplay.value.length || JSON.stringify(cards) !== JSON.stringify(currentHandForDisplay.value.sort((a,b)=>a.id.localeCompare(b.id)))) {
            currentHandForDisplay.value = cards && Array.isArray(cards) ? [...cards].sort((a,b) => b.value - a.value) : [];
        }
        // 只有在 currentHandForDisplay 被重置时，才考虑重置牌墩（如果牌墩为空）
        if(frontDun.value.length === 0 && midDun.value.length === 0 && backDun.value.length === 0) {
            // No action needed on duns if they are already empty
        } else if (cards && cards.length > 0 && currentHandForDisplay.value.length === cards.length) {
            // If initialCards are set and currentHandForDisplay matches them, it implies a reset, so clear duns.
            frontDun.value = []; midDun.value = []; backDun.value = [];
        }
    }
    selectedAvailableCards.value = [];
    submissionMessage.value = ''; 
    倒水提示.value = '';     
}

watch(() => props.initialCards, (newCards) => {
    // console.log("[PlayerHandInput] Watcher for props.initialCards triggered. New cards length:", newCards ? newCards.length : 'null/undefined');
    initializeHandsSimplified(newCards); // 总是用最新的 initialCards 更新
}, { deep: true, immediate: true }); // immediate 很重要

watch(() => props.isSubmitted, (newVal) => {
    // console.log("[PlayerHandInput] Watcher for props.isSubmitted triggered. New value:", newVal);
    // 当 isSubmitted 状态变化时，重新初始化以确保显示正确
    // (例如，从游戏中变为已提交，或从已提交变为新一局的游戏中)
    initializeHandsSimplified(props.initialCards); 
});

// ... (其余 script setup 内容与上一版相同) ...
onMounted(() => {
    // console.log("[PlayerHandInput] onMounted. Initial cards prop length:", props.initialCards ? props.initialCards.length : 'null/undefined');
    initializeHandsSimplified(props.initialCards); // 确保挂载时使用当前的props初始化
});
</script>

<style scoped> /* ... (与上一版相同) ... */ </style>
