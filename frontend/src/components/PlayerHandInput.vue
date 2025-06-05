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
        <!-- 这里调用 isSelectedInAvailable -->
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
import { ref, computed, watch, onMounted } from 'vue';
import { useGameStore } from '../stores/gameStore';
import CardDisplay from './CardDisplay.vue';
import { GameLogic as FrontendGameLogic } from '../utils/frontendGameLogic';

const gameStore = useGameStore();
const props = defineProps({
    initialCards: { type: Array, default: () => [] },
    isSubmitted: { type: Boolean, default: false }
});

const currentHandForDisplay = ref([]);
const selectedAvailableCards = ref([]); // 这个数组存储被选中的牌对象
const frontDun = ref([]);
const midDun = ref([]);
const backDun = ref([]);
const submissionMessage = ref('');
const messageType = ref('info');
const 倒水提示 = ref('');

function initializeHandsSimplified(cards) {
    if (props.isSubmitted) {
        const me = gameStore.myPlayerDetails;
        if (me && me.hand_front) frontDun.value = [...me.hand_front]; else frontDun.value = [];
        if (me && me.hand_mid) midDun.value = [...me.hand_mid]; else midDun.value = [];
        if (me && me.hand_back) backDun.value = [...me.hand_back]; else backDun.value = [];
        currentHandForDisplay.value = [];
    } else {
        currentHandForDisplay.value = cards ? [...cards].sort((a,b) => b.value - a.value) : [];
        frontDun.value = []; midDun.value = []; backDun.value = [];
    }
    selectedAvailableCards.value = []; // 每次初始化/重置时清空选中牌
    submissionMessage.value = '';
    倒水提示.value = '';
}

watch(() => props.initialCards, (newCards, oldCards) => {
    const newCardsJson = JSON.stringify(newCards);
    const oldCardsJson = JSON.stringify(oldCards);
    if (newCardsJson !== oldCardsJson) {
        if (!props.isSubmitted) {
            initializeHandsSimplified(newCards);
        } else {
            initializeHandsSimplified(newCards);
        }
    }
}, { deep: true, immediate: true });

watch(() => props.isSubmitted, (newVal) => {
    if (newVal) {
        submissionMessage.value = "您的牌型已提交。";
        messageType.value = "success";
        initializeHandsSimplified(props.initialCards); 
    } else {
        initializeHandsSimplified(props.initialCards);
    }
});

// --- 确保这个函数被正确定义 ---
function isSelectedInAvailable(card) {
  if (!card || !card.id) return false; // 防御性检查
  return selectedAvailableCards.value.some(selectedCard => selectedCard.id === card.id);
}
// --- ---

function toggleSelectAvailableCard(card) {
  if (props.isSubmitted || !card || !card.id) return;
  const index = selectedAvailableCards.value.findIndex(sc => sc.id === card.id);
  if (index > -1) {
    selectedAvailableCards.value.splice(index, 1); // 取消选中
  } else {
    selectedAvailableCards.value.push(card); // 选中
  }
}

function addSelectedToDun(dunName) {
  if (props.isSubmitted || selectedAvailableCards.value.length === 0) return;
  const targetDun = dunName === 'front' ? frontDun : (dunName === 'mid' ? midDun : backDun);
  const limit = dunName === 'front' ? 3 : 5;

  // 将选中的牌加入目标牌墩，并从 currentHandForDisplay 和 selectedAvailableCards 中移除
  const cardsToMove = [...selectedAvailableCards.value]; // 创建副本进行迭代
  let movedCount = 0;
  for (const card of cardsToMove) {
    if (targetDun.value.length < limit && !targetDun.value.some(c => c.id === card.id)) {
      targetDun.value.push(card);
      currentHandForDisplay.value = currentHandForDisplay.value.filter(ac => ac.id !== card.id);
      movedCount++;
    }
    if (targetDun.value.length >= limit && movedCount > 0) break; // 如果目标牌墩满了，停止移动
  }
  selectedAvailableCards.value = []; // 清空选中列表
  validateOverallStructure();
}

function removeFromDun(dunName, cardToRemove) {
  if (props.isSubmitted || !cardToRemove || !cardToRemove.id) return;
  const dunRef = dunName === 'front' ? frontDun : (dunName === 'mid' ? midDun : backDun);
  const index = dunRef.value.findIndex(c => c.id === cardToRemove.id);
  if (index > -1) {
    dunRef.value.splice(index, 1);
    // 将牌放回 currentHandForDisplay 并排序
    if (!currentHandForDisplay.value.some(c => c.id === cardToRemove.id)) { //避免重复添加
        currentHandForDisplay.value.push(cardToRemove);
        currentHandForDisplay.value.sort((a,b) => b.value - a.value);
    }
  }
  validateOverallStructure();
}

const isFrontDunValidCount = computed(() => frontDun.value.length === 3);
const isMidDunValidCount = computed(() => midDun.value.length === 5);
const isBackDunValidCount = computed(() => backDun.value.length === 5);

const canSubmitHand = computed(() => {
    return isFrontDunValidCount.value &&
           isMidDunValidCount.value &&
           isBackDunValidCount.value &&
           currentHandForDisplay.value.length === 0 && // 确保所有手牌都已摆放
           !倒水提示.value;
});

const frontDunTypeInfo = computed(() => FrontendGameLogic.getHandType(frontDun.value));
const midDunTypeInfo = computed(() => FrontendGameLogic.getHandType(midDun.value));
const backDunTypeInfo = computed(() => FrontendGameLogic.getHandType(backDun.value));

function validateOverallStructure() {
    倒水提示.value = '';
    if (!isFrontDunValidCount.value || !isMidDunValidCount.value || !isBackDunValidCount.value) {
        return;
    }
    const frontType = frontDunTypeInfo.value;
    const midType = midDunTypeInfo.value;
    const backType = backDunTypeInfo.value;
    if (FrontendGameLogic.compareHandTypes(frontType, midType) > 0) {
        倒水提示.value = "倒水：头墩牌型不能大于中墩！"; return;
    }
    if (FrontendGameLogic.compareHandTypes(midType, backType) > 0) {
        倒水提示.value = "倒水：中墩牌型不能大于尾墩！"; return;
    }
}
watch([frontDun, midDun, backDun], validateOverallStructure, { deep: true });

async function submitPlayerHand() {
    if (!canSubmitHand.value || props.isSubmitted) {
         if (倒水提示.value) { submissionMessage.value = `提交失败: ${倒水提示.value}`; messageType.value = 'error';} 
         else if (!isFrontDunValidCount.value || !isMidDunValidCount.value || !isBackDunValidCount.value) { submissionMessage.value = `提交失败: 请确保各牌墩数量正确 (头3, 中5, 尾5)。`; messageType.value = 'error';} 
         else if (currentHandForDisplay.value.length > 0) { submissionMessage.value = `提交失败: 还有 ${currentHandForDisplay.value.length} 张牌未摆放。`; messageType.value = 'error';}
        return;
    }
    submissionMessage.value = ''; messageType.value = 'info';
    await gameStore.submitHand(frontDun.value, midDun.value, backDun.value);
    if (gameStore.error) { submissionMessage.value = `提交失败: ${gameStore.error}`; messageType.value = 'error';}
}

function resetCurrentArrangementSimplified() {
    if (props.isSubmitted) return;
    initializeHandsSimplified(props.initialCards);
    submissionMessage.value = "摆牌已重置。"; messageType.value = 'info';
}

onMounted(() => {
    initializeHandsSimplified(props.initialCards);
});

</script>

<style scoped>
/* 样式与上一版相同 */
.player-hand-input { padding: 15px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #f9f9f9; margin-bottom: 20px; }
.hand-area { margin-bottom: 15px; padding: 10px; border: 1px dashed #ccc; background-color: #fff; min-height: 120px; }
.available-cards-area { background-color: #eef8ff; }
.arranged-hands-container-simplified { display: flex; justify-content: space-between; gap: 10px; margin-bottom: 15px; }
.dun-section { flex: 1; padding: 8px; border: 1px solid #d0d0d0; border-radius: 4px; background-color: #f0f0f0; min-height: 110px; }
.dun-section h4 { margin-top: 0; margin-bottom: 8px; font-size: 0.9em; color: #333; text-align: center; display: flex; justify-content: space-between; align-items: center;}
.dun-section h4 button { margin-left: 10px; font-size: 0.8em; padding: 3px 6px; }
.card-list { display: flex; flex-wrap: wrap; justify-content: flex-start; align-items: flex-start; min-height: 105px; padding: 5px; border-radius: 4px; background-color: #e9ecef; }
.static-card { margin: 2px !important; }
.static-card.in-dun { /* Dun-specific styles if needed */ }
.action-buttons { margin-top: 15px; display: flex; gap: 10px; }
.submit-button, .reset-arrange-button { padding: 10px 15px; font-size: 0.9em; cursor: pointer; border: none; border-radius: 5px; color: white; transition: background-color 0.2s; }
.submit-button { background-color: #28a745; } .submit-button:hover:not(:disabled) { background-color: #218838; }
.reset-arrange-button { background-color: #ffc107; color: #212529; } .reset-arrange-button:hover:not(:disabled) { background-color: #e0a800; }
.submit-button:disabled, .reset-arrange-button:disabled { background-color: #ccc; cursor: not-allowed; color: #666; }
.submission-message, .error-message, .倒水-tip { padding: 10px; margin-bottom: 15px; border-radius: 4px; font-weight: bold; }
.submission-message.info { background-color: #e7f3fe; border: 1px solid #d0eaff; color: #0c5460; }
.submission-message.error, .error-message, .倒水-tip { background-color: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; }
.submission-message.success { background-color: #d4edda; border: 1px solid #c3e6cb; color: #155724; }
.dun-error { color: red; font-size: 0.8em; text-align: center; margin-top: 5px; }
</style>
