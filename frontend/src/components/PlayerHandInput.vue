<template>
  <div class="player-hand-input">
    <!-- ... (模板与上一版相同) ... -->
    <div class="action-buttons">
      <button 
        @click="submitPlayerHand" 
        :disabled="!canSubmitHandComputed || gameStore.isGameLoading || isSubmitted" 
        class="submit-button"
      >
        {{ isSubmitted ? '牌型已提交' : (gameStore.isGameLoading ? '处理中...' : '确认提交牌型') }}
      </button>
      <!-- ... (其他按钮) ... -->
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useGameStore } from '../stores/gameStore';
import CardDisplay from './CardDisplay.vue';
import { GameLogic as FrontendGameLogic } from '../utils/frontendGameLogic';

const gameStore = useGameStore();
const props = defineProps({ /* ... */ });
// ... (所有 ref 和其他函数与上一版相同) ...
const currentHandForDisplay = ref([]);
const selectedAvailableCards = ref([]);
const frontDun = ref([]);
const midDun = ref([]);
const backDun = ref([]);
const submissionMessage = ref('');
const messageType = ref('info');
const 倒水提示 = ref('');

function initializeHandsSimplified(cards) { /* ... (与上一版相同) ... */ }
watch(() => props.initialCards, (newCards, oldCards) => { /* ... (与上一版相同) ... */ }, { deep: true, immediate: true });
watch(() => props.isSubmitted, (newVal) => { /* ... (与上一版相同) ... */ });
function isSelectedInAvailable(card) { /* ... (与上一版相同) ... */ }
function toggleSelectAvailableCard(card) { /* ... (与上一版相同) ... */ }
function addSelectedToDun(dunName) { /* ... (与上一版相同) ... */ }
function removeFromDun(dunName, cardToRemove) { /* ... (与上一版相同) ... */ }
const isFrontDunValidCount = computed(() => frontDun.value.length === 3);
const isMidDunValidCount = computed(() => midDun.value.length === 5);
const isBackDunValidCount = computed(() => backDun.value.length === 5);
const frontDunTypeInfo = computed(() => FrontendGameLogic.getHandType(frontDun.value));
const midDunTypeInfo = computed(() => FrontendGameLogic.getHandType(midDun.value));
const backDunTypeInfo = computed(() => FrontendGameLogic.getHandType(backDun.value));
function validateOverallStructure() { /* ... (与上一版相同) ... */ }
watch([frontDun, midDun, backDun], validateOverallStructure, { deep: true });


// 修改：canSubmitHand -> canSubmitHandComputed，以避免与可能存在的同名变量冲突
const canSubmitHandComputed = computed(() => {
    const conditionsMet = 
           isFrontDunValidCount.value &&
           isMidDunValidCount.value &&
           isBackDunValidCount.value &&
           currentHandForDisplay.value.length === 0 &&
           !倒水提示.value;
    // console.log(`[PlayerHandInput] canSubmitHandComputed evaluated. Result: ${conditionsMet}`);
    // console.log(`  isFrontValid: ${isFrontDunValidCount.value}, isMidValid: ${isMidDunValidCount.value}, isBackValid: ${isBackDunValidCount.value}`);
    // console.log(`  availableCards: ${currentHandForDisplay.value.length}, 倒水提示: '${倒水提示.value}'`);
    return conditionsMet;
});

async function submitPlayerHand() {
    console.log("[PlayerHandInput] submitPlayerHand clicked."); // 日志1
    console.log("[PlayerHandInput] Current canSubmitHandComputed value:", canSubmitHandComputed.value); // 日志2
    console.log("[PlayerHandInput] Is component submitted (prop):", props.isSubmitted); // 日志3
    console.log("[PlayerHandInput] Game store loading:", gameStore.isGameLoading); // 日志4

    if (!canSubmitHandComputed.value || props.isSubmitted) {
        console.warn("[PlayerHandInput] Submission prevented. Conditions not met or already submitted.");
        if (倒水提示.value) { submissionMessage.value = `提交失败: ${倒水提示.value}`; messageType.value = 'error';} 
        else if (!isFrontDunValidCount.value || !isMidDunValidCount.value || !isBackDunValidCount.value) { submissionMessage.value = `提交失败: 牌墩数量不正确。`; messageType.value = 'error';} 
        else if (currentHandForDisplay.value.length > 0) { submissionMessage.value = `提交失败: 还有牌未摆放。`; messageType.value = 'error';}
        else if (props.isSubmitted) { submissionMessage.value = "您已经提交过了。"; messageType.value = 'info'; }
        return;
    }
    
    submissionMessage.value = ''; 
    messageType.value = 'info';
    console.log("[PlayerHandInput] Calling gameStore.submitHand with牌墩:", 
        JSON.parse(JSON.stringify(frontDun.value)), 
        JSON.parse(JSON.stringify(midDun.value)), 
        JSON.parse(JSON.stringify(backDun.value))
    ); // 日志5

    await gameStore.submitHand(frontDun.value, midDun.value, backDun.value);
    
    console.log("[PlayerHandInput] gameStore.submitHand finished. Error from store:", gameStore.error); // 日志6
    if (gameStore.error) { 
        submissionMessage.value = `提交失败: ${gameStore.error}`; 
        messageType.value = 'error';
    } else {
        // 成功后，isSubmitted prop 会从父组件更新，触发 watcher 来显示 "牌型已提交"
        // submissionMessage.value = "牌型提交成功！等待其他玩家..."; // 可以由 store 的状态驱动
        // messageType.value = 'success';
    }
}

function resetCurrentArrangementSimplified() { /* ... (与上一版相同) ... */ }
onMounted(() => { /* ... (与上一版相同) ... */ });

</script>

<style scoped>
/* 样式与上一版相同 */
</style>
