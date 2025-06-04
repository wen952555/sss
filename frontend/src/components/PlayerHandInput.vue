<template>
  <div class="player-hand-input">
    <h3>请摆放你的牌墩</h3>
    <div v-if="submissionMessage" :class="['submission-message', messageType]">{{ submissionMessage }}</div>

    <!-- 手牌区 -->
    <div class="hand-area available-cards">
      <h4>你的手牌 (点击选择，再点击下方目标牌墩的“放入”按钮)</h4>
      <CardDisplay
        v-for="card in availableToSortCards"
        :key="'avail-' + card.id"
        :card="card"
        :is-selected="isSelectedInAvailable(card)"
        @select="toggleSelectAvailableCard(card)"
      />
      <p v-if="!availableToSortCards.length && !isSubmitted">所有牌已摆放。</p>
    </div>

    <!-- 三墩摆放区 -->
    <div class="arranged-hands">
      <div class="arranged-dun" data-dun="front">
        <h4>头墩 (3张) <button @click="addSelectedToDun('front')" :disabled="selectedAvailableCards.length === 0 || frontDun.length >= 3">放入头墩</button></h4>
        <CardDisplay
          v-for="card in frontDun"
          :key="'front-' + card.id"
          :card="card"
          :is-selectable="!isSubmitted"
          @select="removeFromDun('front', card)"
        />
      </div>
      <div class="arranged-dun" data-dun="mid">
        <h4>中墩 (5张) <button @click="addSelectedToDun('mid')" :disabled="selectedAvailableCards.length === 0 || midDun.length >= 5">放入中墩</button></h4>
        <CardDisplay
          v-for="card in midDun"
          :key="'mid-' + card.id"
          :card="card"
          :is-selectable="!isSubmitted"
          @select="removeFromDun('mid', card)"
        />
      </div>
      <div class="arranged-dun" data-dun="back">
        <h4>尾墩 (5张) <button @click="addSelectedToDun('back')" :disabled="selectedAvailableCards.length === 0 || backDun.length >= 5">放入尾墩</button></h4>
        <CardDisplay
          v-for="card in backDun"
          :key="'back-' + card.id"
          :card="card"
          :is-selectable="!isSubmitted"
          @select="removeFromDun('back', card)"
        />
      </div>
    </div>

    <button @click="submitPlayerHand" :disabled="!canSubmitHand || gameStore.loading || isSubmitted" class="submit-button">
      {{ isSubmitted ? '已提交' : (gameStore.loading ? '提交中...' : '确认提交牌型') }}
    </button>
     <button @click="autoArrangeSimple" :disabled="isSubmitted || availableToSortCards.length !== 13" class="auto-arrange-button">
      简单自动摆牌 (测试用)
    </button>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useGameStore } from '../stores/gameStore';
import CardDisplay from './CardDisplay.vue';

const gameStore = useGameStore();

// 内部状态，用于玩家摆牌
const availableToSortCards = ref([]); // 玩家当前还可以用来摆牌的手牌
const selectedAvailableCards = ref([]); // 在手牌区选中的牌

const frontDun = ref([]);
const midDun = ref([]);
const backDun = ref([]);

const submissionMessage = ref('');
const messageType = ref('info'); // 'info', 'error', 'success'

const props = defineProps({
  initialCards: { type: Array, default: () => [] }, // 从 store 传入的原始手牌
  isSubmitted: { type: Boolean, default: false } // 玩家是否已提交
});

watch(() => props.initialCards, (newCards) => {
  if (newCards && newCards.length > 0 && !props.isSubmitted) { // 只有未提交且有新牌时才重置
    resetHandArrangement(newCards);
  } else if (newCards && newCards.length === 0 && !props.isSubmitted) { // 如果牌被清空了（比如新一局开始前）
    resetHandArrangement([]);
  }
}, { deep: true, immediate: true });


watch(() => props.isSubmitted, (newVal) => {
    if(newVal) {
        submissionMessage.value = "您的牌型已提交。";
        messageType.value = "success";
    } else {
        // 如果从已提交变为未提交（例如新一局），可能需要重置
        if (gameStore.myCards.length > 0) { // 确保有牌才重置
             resetHandArrangement(gameStore.myCards);
        }
    }
});


function resetHandArrangement(cardsToArrange) {
  availableToSortCards.value = [...cardsToArrange].sort((a,b) => b.value - a.value); // 默认按点数大到小排序
  selectedAvailableCards.value = [];
  frontDun.value = [];
  midDun.value = [];
  backDun.value = [];
  submissionMessage.value = '';
}

function isSelectedInAvailable(card) {
  return selectedAvailableCards.value.some(c => c.id === card.id);
}

function toggleSelectAvailableCard(card) {
  if (props.isSubmitted) return;
  const index = selectedAvailableCards.value.findIndex(c => c.id === card.id);
  if (index > -1) {
    selectedAvailableCards.value.splice(index, 1);
  } else {
    selectedAvailableCards.value.push(card);
  }
}

function addSelectedToDun(dunName) {
  if (props.isSubmitted || selectedAvailableCards.value.length === 0) return;

  const targetDun = dunName === 'front' ? frontDun : (dunName === 'mid' ? midDun : backDun);
  const limit = dunName === 'front' ? 3 : 5;

  // 只移动能放入的牌
  const cardsToMove = selectedAvailableCards.value.slice(0, limit - targetDun.value.length);

  cardsToMove.forEach(card => {
    if (targetDun.value.length < limit) {
      targetDun.value.push(card);
      availableToSortCards.value = availableToSortCards.value.filter(ac => ac.id !== card.id);
    }
  });
  // 清除已移动的牌从选中列表
  selectedAvailableCards.value = selectedAvailableCards.value.filter(sc => !cardsToMove.some(moved => moved.id === sc.id));
}

function removeFromDun(dunName, cardToRemove) {
  if (props.isSubmitted) return;
  const dunRef = dunName === 'front' ? frontDun : (dunName === 'mid' ? midDun : backDun);
  const index = dunRef.value.findIndex(c => c.id === cardToRemove.id);
  if (index > -1) {
    dunRef.value.splice(index, 1);
    availableToSortCards.value.push(cardToRemove);
    availableToSortCards.value.sort((a,b) => b.value - a.value); // 放回去后重新排序
  }
}

const canSubmitHand = computed(() => {
  return frontDun.value.length === 3 &&
         midDun.value.length === 5 &&
         backDun.value.length === 5 &&
         availableToSortCards.value.length === 0; // 所有牌都已摆放
});

async function submitPlayerHand() {
  if (!canSubmitHand.value || props.isSubmitted) return;

  submissionMessage.value = '';
  messageType.value = 'info';

  // 可以在这里添加前端的初步牌墩合法性验证（例如头<中<尾）
  // 但最终验证必须在后端完成

  await gameStore.submitHand(frontDun.value, midDun.value, backDun.value);
  if (gameStore.error) {
    submissionMessage.value = `提交失败: ${gameStore.error}`;
    messageType.value = 'error';
  } else {
    // submissionMessage.value = "牌型提交成功！等待其他玩家...";
    // messageType.value = 'success';
    // isSubmitted 状态将由 gameStore 更新后通过 props 传入
  }
}

// 仅用于测试的简单自动摆牌逻辑
function autoArrangeSimple() {
    if (props.isSubmitted || availableToSortCards.value.length !== 13) return;
    resetHandArrangement(gameStore.myCards); // 先重置确保从原始牌开始

    // 排序，大的放后面 (简单策略)
    const sorted = [...availableToSortCards.value].sort((a, b) => a.value - b.value); // 小的在前

    backDun.value = sorted.slice(8, 13).sort((a,b) => b.value - a.value); // 后5张最大的
    midDun.value = sorted.slice(3, 8).sort((a,b) => b.value - a.value);   // 中间5张
    frontDun.value = sorted.slice(0, 3).sort((a,b) => b.value - a.value); // 前3张最小的
    
    availableToSortCards.value = [];
    selectedAvailableCards.value = [];
    submissionMessage.value = "已使用简单自动摆牌，请检查并提交。";
    messageType.value = 'info';
}


onMounted(() => {
    if (props.initialCards.length > 0 && !props.isSubmitted) {
        resetHandArrangement(props.initialCards);
    }
});

</script>

<style scoped>
.player-hand-input {
  padding: 15px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background-color: #f9f9f9;
  margin-bottom: 20px;
}
.hand-area, .arranged-hands {
  margin-bottom: 15px;
  padding: 10px;
  border: 1px dashed #ccc;
  min-height: 110px; /* 至少能放下一行牌的高度 */
  background-color: #fff;
}
.available-cards {
  background-color: #eef8ff;
}
.arranged-dun {
  margin-bottom: 10px;
  padding: 8px;
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  background-color: #f0f0f0;
}
.arranged-dun h4 {
  margin-top: 0;
  margin-bottom: 8px;
  font-size: 0.9em;
  color: #333;
}
.arranged-dun h4 button {
  margin-left: 10px;
  font-size: 0.8em;
  padding: 3px 6px;
}
.submit-button, .auto-arrange-button {
  padding: 10px 20px;
  font-size: 1em;
  cursor: pointer;
  border: none;
  border-radius: 5px;
  background-color: #4CAF50;
  color: white;
  transition: background-color 0.2s;
  margin-right: 10px;
}
.submit-button:disabled, .auto-arrange-button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}
.submit-button:hover:not(:disabled) {
  background-color: #45a049;
}
.auto-arrange-button {
    background-color: #007bff;
}
.auto-arrange-button:hover:not(:disabled) {
    background-color: #0069d9;
}

.submission-message {
  padding: 10px;
  margin-bottom: 15px;
  border-radius: 4px;
  font-weight: bold;
}
.submission-message.info {
  background-color: #e7f3fe;
  border: 1px solid #d0eaff;
  color: #0c5460;
}
.submission-message.error {
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  color: #721c24;
}
.submission-message.success {
  background-color: #d4edda;
  border: 1px solid #c3e6cb;
  color: #155724;
}
</style>
