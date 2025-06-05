<template>
  <div class="player-hand-input">
    <h3>请摆放你的牌墩</h3>
    <div v-if="submissionMessage" :class="['submission-message', messageType]">{{ submissionMessage }}</div>

    <div class="hand-area available-cards-area">
      <h4>
        你的手牌:
        <span v-if="currentHandForDisplay.length > 0">({{ currentHandForDisplay.length }} 张)</span>
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
        <h4>头墩 (3张) <button @click="addSelectedToDun('front')" :disabled="selectedAvailableCards.length === 0 || frontDun.length >= 3">放入</button></h4>
        <div class="card-list dun-list">
          <CardDisplay v-for="card in frontDun" :key="'f-'+card.id" :card="card" @select="removeFromDun('front', card)" class="static-card in-dun"/>
        </div>
        <p v-if="frontDun.length !== 3 && !props.isSubmitted" class="dun-error">需3张</p>
      </div>
      <div class="dun-section">
        <h4>中墩 (5张) <button @click="addSelectedToDun('mid')" :disabled="selectedAvailableCards.length === 0 || midDun.length >= 5">放入</button></h4>
        <div class="card-list dun-list">
          <CardDisplay v-for="card in midDun" :key="'m-'+card.id" :card="card" @select="removeFromDun('mid', card)" class="static-card in-dun"/>
        </div>
        <p v-if="midDun.length !== 5 && !props.isSubmitted" class="dun-error">需5张</p>
      </div>
      <div class="dun-section">
        <h4>尾墩 (5张) <button @click="addSelectedToDun('back')" :disabled="selectedAvailableCards.length === 0 || backDun.length >= 5">放入</button></h4>
        <div class="card-list dun-list">
          <CardDisplay v-for="card in backDun" :key="'b-'+card.id" :card="card" @select="removeFromDun('back', card)" class="static-card in-dun"/>
        </div>
        <p v-if="backDun.length !== 5 && !props.isSubmitted" class="dun-error">需5张</p>
      </div>
    </div>
    <div v-if="倒水提示" class="倒水-tip error-message">{{ 倒水提示 }}</div>

    <div class="action-buttons">
      <!-- 修改：当点击时，emit事件，而不是直接调用store action -->
      <button @click="handleHandSubmission" :disabled="!canSubmitHand || props.isSubmitted" class="submit-button">
        {{ props.isSubmitted ? '已提交' : '确认提交牌型' }}
      </button>
      <button @click="resetCurrentArrangementSimplified" :disabled="props.isSubmitted" class="reset-arrange-button">
        重置摆牌
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
// 移除了对 useGameStore 的直接依赖，因为它现在通过 props 接收手牌
import CardDisplay from './CardDisplay.vue';
import { GameLogic as FrontendGameLogic } from '../utils/frontendGameLogic'; // 假设这个文件仍然存在且有用

const props = defineProps({
    initialCards: { type: Array, required: true, default: () => [] },
    isSubmitted: { type: Boolean, default: false } // 父组件控制是否已提交
});

// 定义 emit 事件
const emit = defineEmits(['hand-submitted']);

const currentHandForDisplay = ref([]);
const selectedAvailableCards = ref([]);
const frontDun = ref([]);
const midDun = ref([]);
const backDun = ref([]);
const submissionMessage = ref('');
const messageType = ref('info');
const 倒水提示 = ref('');

function initializeHandsSimplified(cards) {
    if (props.isSubmitted) {
        // 如果已提交，理论上父组件会控制牌的显示，这里可能不需要做太多
        // 但为了保持一致，可以基于已提交的牌（如果能从props或其他方式获得）来设置
        // 暂定已提交后，此组件不再负责牌的初始化，由父组件控制
        currentHandForDisplay.value = []; // 清空可选牌
    } else {
        currentHandForDisplay.value = cards ? [...cards].sort((a,b) => b.value - a.value) : [];
        frontDun.value = []; midDun.value = []; backDun.value = [];
    }
    selectedAvailableCards.value = [];
    submissionMessage.value = ''; // 提交信息由父组件处理
    倒水提示.value = '';
}

watch(() => props.initialCards, (newCards, oldCards) => {
    if (!props.isSubmitted) { // 只在未提交时响应 initialCards 变化
         initializeHandsSimplified(newCards);
    } else {
        // 如果已提交，并且 initialCards 变化了（例如新一局开始了），
        // 父组件应该将 isSubmitted 重置为 false，然后这个 watcher 才会再次初始化
        if (newCards.length > 0 && currentHandForDisplay.value.length === 0) {
            // 这可能意味着新的一局开始了，但 isSubmitted 还没被父组件重置
            // 为安全起见，如果 isSubmitted 为 true 但收到了新牌，也尝试初始化
             // initializeHandsSimplified(newCards); // 或者让父组件严格控制
        }
    }
}, { deep: true, immediate: true });

watch(() => props.isSubmitted, (newVal) => {
    if (newVal) {
        // 如果父组件标记为已提交，可以禁用此组件的交互
        submissionMessage.value = "牌型已由外部标记为提交。";
        messageType.value = 'info';
    } else {
        // 如果父组件标记为未提交（例如新一局），重新初始化手牌
        initializeHandsSimplified(props.initialCards);
    }
});


function isSelectedInAvailable(card) { /* ... (与上一版相同) ... */ }
function toggleSelectAvailableCard(card) { /* ... (与上一版相同) ... */ }
function addSelectedToDun(dunName) { /* ... (与上一版相同，但最后调用 validateOverallStructure) ... */ }
function removeFromDun(dunName, cardToRemove) { /* ... (与上一版相同，但最后调用 validateOverallStructure) ... */ }

const isFrontDunValidCount = computed(() => frontDun.value.length === 3);
const isMidDunValidCount = computed(() => midDun.value.length === 5);
const isBackDunValidCount = computed(() => backDun.value.length === 5);

const canSubmitHand = computed(() => {
    return isFrontDunValidCount.value &&
           isMidDunValidCount.value &&
           isBackDunValidCount.value &&
           currentHandForDisplay.value.length === 0 &&
           !倒水提示.value;
});

const frontDunTypeInfo = computed(() => FrontendGameLogic.getHandType(frontDun.value));
const midDunTypeInfo = computed(() => FrontendGameLogic.getHandType(midDun.value));
const backDunTypeInfo = computed(() => FrontendGameLogic.getHandType(backDun.value));

function validateOverallStructure() { /* ... (与上一版相同) ... */ }
watch([frontDun, midDun, backDun], validateOverallStructure, { deep: true });

// 修改：提交时 emit 事件
function handleHandSubmission() {
    if (!canSubmitHand.value || props.isSubmitted) {
        if (倒水提示.value) { submissionMessage.value = `提交失败: ${倒水提示.value}`; messageType.value = 'error'; }
        // ... 其他错误提示
        return;
    }
    emit('hand-submitted', {
        front: [...frontDun.value],
        mid: [...midDun.value],
        back: [...backDun.value]
    });
    // 提交成功与否的提示现在由父组件处理 (通过props.isSubmitted 或 store.error)
}

function resetCurrentArrangementSimplified() {
    if (props.isSubmitted) return;
    initializeHandsSimplified(props.initialCards);
    submissionMessage.value = "摆牌已重置。";
    messageType.value = 'info';
}

onMounted(() => {
    // console.log("[PlayerHandInput Simplified] onMounted with initialCards:", JSON.parse(JSON.stringify(props.initialCards)));
    if (!props.isSubmitted) {
        initializeHandsSimplified(props.initialCards);
    }
});
</script>

<style scoped>
/* 样式与上一版相同 */
</style>
