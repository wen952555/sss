<template>
  <div class="player-hand-input">
    <h3>请摆放你的牌墩 (可拖拽)</h3>
    <div v-if="submissionMessage" :class="['submission-message', messageType]">{{ submissionMessage }}</div>

    <!-- 手牌区 (Available Cards) -->
    <div class="hand-area available-cards-area">
      <h4>
        你的手牌 (拖拽到下方牌墩)
        <span v-if="availableToSortCards.length > 0">({{ availableToSortCards.length }} 张)</span>
      </h4>
      <draggable
        v-model="availableToSortCards"
        item-key="id"
        group="cards"
        class="card-list"
        :disabled="isSubmitted"
        @end="onDragEnd"
      >
        <template #item="{ element: card }">
          <CardDisplay :card="card" class="draggable-card" />
        </template>
      </draggable>
      <p v-if="!availableToSortCards.length && !isSubmitted && totalArrangedCards < 13" class="empty-area-text">
        所有牌已尝试摆放，请检查牌墩。
      </p>
       <p v-if="!availableToSortCards.length && !isSubmitted && totalArrangedCards === 13" class="empty-area-text all-placed">
        所有13张牌已摆放完毕！
      </p>
    </div>

    <!-- 三墩摆放区 -->
    <div class="arranged-hands-container">
      <div class="arranged-dun-wrapper">
        <h4>头墩 (3张) - {{ frontDunTypeInfo.name }}</h4>
        <draggable
          v-model="frontDun"
          item-key="id"
          group="cards"
          class="card-list dun-list front-dun"
          :class="{'dun-invalid': !isFrontDunValidCount}"
          :disabled="isSubmitted"
          @add="onAddCardToDun('front', $event)"
          @end="onDragEnd"
        >
          <template #item="{ element: card }">
            <CardDisplay :card="card" class="draggable-card in-dun" />
          </template>
        </draggable>
        <p v-if="!isFrontDunValidCount && !isSubmitted" class="dun-error">头墩需3张牌</p>
      </div>

      <div class="arranged-dun-wrapper">
        <h4>中墩 (5张) - {{ midDunTypeInfo.name }}</h4>
        <draggable
          v-model="midDun"
          item-key="id"
          group="cards"
          class="card-list dun-list mid-dun"
          :class="{'dun-invalid': !isMidDunValidCount}"
          :disabled="isSubmitted"
          @add="onAddCardToDun('mid', $event)"
          @end="onDragEnd"
        >
          <template #item="{ element: card }">
            <CardDisplay :card="card" class="draggable-card in-dun" />
          </template>
        </draggable>
        <p v-if="!isMidDunValidCount && !isSubmitted" class="dun-error">中墩需5张牌</p>
      </div>

      <div class="arranged-dun-wrapper">
        <h4>尾墩 (5张) - {{ backDunTypeInfo.name }}</h4>
        <draggable
          v-model="backDun"
          item-key="id"
          group="cards"
          class="card-list dun-list back-dun"
          :class="{'dun-invalid': !isBackDunValidCount}"
          :disabled="isSubmitted"
          @add="onAddCardToDun('back', $event)"
          @end="onDragEnd"
        >
          <template #item="{ element: card }">
            <CardDisplay :card="card" class="draggable-card in-dun" />
          </template>
        </draggable>
        <p v-if="!isBackDunValidCount && !isSubmitted" class="dun-error">尾墩需5张牌</p>
      </div>
    </div>
    <div v-if="倒水提示" class="倒水-tip error-message">{{ 倒水提示 }}</div>

    <div class="action-buttons">
        <button @click="submitPlayerHand" :disabled="!canSubmitHand || gameStore.loading || isSubmitted" class="submit-button">
        {{ isSubmitted ? '牌型已提交' : (gameStore.loading ? '提交中...' : '确认提交牌型') }}
        </button>
        <button @click="autoArrangeSimple" :disabled="isSubmitted || availableToSortCards.length !== 13" class="auto-arrange-button">
        简单自动摆牌 (测试用)
        </button>
         <button @click="resetCurrentArrangement" :disabled="isSubmitted" class="reset-arrange-button">
            重置当前摆牌
        </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted }
from 'vue';
import { useGameStore } from '../stores/gameStore';
import CardDisplay from './CardDisplay.vue';
import draggable from 'vue-draggable-next'; // 导入 draggable
import { GameLogic as FrontendGameLogic } from '../utils/frontendGameLogic'; // 假设我们有一个前端的牌型判断工具

const gameStore = useGameStore();

const props = defineProps({
    initialCards: { type: Array, default: () => [] },
    isSubmitted: { type: Boolean, default: false }
});

const availableToSortCards = ref([]);
const frontDun = ref([]);
const midDun = ref([]);
const backDun = ref([]);

const submissionMessage = ref('');
const messageType = ref('info');
const 倒水提示 = ref('');


// 初始化和重置摆牌的逻辑
function initializeHands(cards) {
    if (props.isSubmitted) { // 如果已提交，则从store或props中加载已提交的牌墩
        const me = gameStore.myPlayerDetails;
        if (me && me.hand_front && me.hand_mid && me.hand_back) {
            frontDun.value = [...me.hand_front];
            midDun.value = [...me.hand_mid];
            backDun.value = [...me.hand_back];
            availableToSortCards.value = [];
        } else { // 正常用 initialCards 初始化
             availableToSortCards.value = [...cards].sort((a, b) => b.value - a.value);
             frontDun.value = [];
             midDun.value = [];
             backDun.value = [];
        }
    } else { // 未提交状态，正常初始化
        availableToSortCards.value = [...cards].sort((a, b) => b.value - a.value);
        frontDun.value = [];
        midDun.value = [];
        backDun.value = [];
    }
    submissionMessage.value = '';
    倒水提示.value = '';
}

watch(() => props.initialCards, (newCards) => {
    // 只有在未提交状态下，或者 initialCards 真正变化时（例如新一局开始）才重置
    // 避免在已提交状态下，因为父组件 props 更新导致牌墩被清空
    if (!props.isSubmitted || (newCards.length > 0 && availableToSortCards.value.length === 0 && frontDun.value.length === 0)) {
        initializeHands(newCards);
    }
}, { deep: true, immediate: true });

watch(() => props.isSubmitted, (newVal, oldVal) => {
    if (newVal) {
        submissionMessage.value = "您的牌型已提交。";
        messageType.value = "success";
        // 如果提交了，从 store 更新牌墩以显示最终提交的牌
        const me = gameStore.myPlayerDetails;
        if (me && me.hand_front) frontDun.value = [...me.hand_front];
        if (me && me.hand_mid) midDun.value = [...me.hand_mid];
        if (me && me.hand_back) backDun.value = [...me.hand_back];
        availableToSortCards.value = [];
    } else if (oldVal && !newVal) { // 从已提交变为未提交 (例如新一局)
        initializeHands(props.initialCards);
    }
});


// 拖拽结束后的处理，主要是确保牌墩数量限制
function onDragEnd(evt) {
    // evt.to 是目标列表的DOM元素, evt.from 是来源列表
    // evt.newIndex, evt.oldIndex
    // console.log('Drag end:', evt);
    enforceDunLimits();
    validateOverallStructure();
}

function onAddCardToDun(dunName, evt) {
    // console.log(`Card added to ${dunName}:`, evt.item.__vueParentComponent.props.card);
    // evt.item 是被拖拽的DOM元素
    // 通常在 onDragEnd 中统一处理限制，或者在这里做即时反馈
    // draggable 会自动更新 v-model 绑定的数组
    enforceDunLimits();
    validateOverallStructure();
}

function enforceDunLimits() {
    // 头墩限制3张
    while (frontDun.value.length > 3) {
        availableToSortCards.value.push(frontDun.value.pop());
    }
    // 中墩限制5张
    while (midDun.value.length > 5) {
        availableToSortCards.value.push(midDun.value.pop());
    }
    // 尾墩限制5张
    while (backDun.value.length > 5) {
        availableToSortCards.value.push(backDun.value.pop());
    }
    // 将 availableToSortCards 重新排序，方便查看
    availableToSortCards.value.sort((a, b) => b.value - a.value);
}

// 计算属性用于验证和UI反馈
const isFrontDunValidCount = computed(() => frontDun.value.length === 3);
const isMidDunValidCount = computed(() => midDun.value.length === 5);
const isBackDunValidCount = computed(() => backDun.value.length === 5);
const totalArrangedCards = computed(() => frontDun.value.length + midDun.value.length + backDun.value.length);

const canSubmitHand = computed(() => {
    return isFrontDunValidCount.value &&
           isMidDunValidCount.value &&
           isBackDunValidCount.value &&
           availableToSortCards.value.length === 0 && // 所有牌都已摆放
           !倒水提示.value; // 没有倒水提示
});


// 前端牌型判断 (使用简化的前端逻辑)
const frontDunTypeInfo = computed(() => FrontendGameLogic.getHandType(frontDun.value));
const midDunTypeInfo = computed(() => FrontendGameLogic.getHandType(midDun.value));
const backDunTypeInfo = computed(() => FrontendGameLogic.getHandType(backDun.value));

// 验证整体牌墩结构是否倒水 (前端初步验证)
function validateOverallStructure() {
    倒水提示.value = ''; // 先清除
    if (!isFrontDunValidCount.value || !isMidDunValidCount.value || !isBackDunValidCount.value) {
        return; // 牌墩数量不足，不判断倒水
    }

    const frontType = frontDunTypeInfo.value;
    const midType = midDunTypeInfo.value;
    const backType = backDunTypeInfo.value;

    if (FrontendGameLogic.compareHandTypes(frontType, midType) > 0) {
        倒水提示.value = "倒水：头墩牌型不能大于中墩！";
        return;
    }
    if (FrontendGameLogic.compareHandTypes(midType, backType) > 0) {
        倒水提示.value = "倒水：中墩牌型不能大于尾墩！";
        return;
    }
}
// 每次牌墩变化时都进行验证
watch([frontDun, midDun, backDun], validateOverallStructure, { deep: true });


async function submitPlayerHand() {
    if (!canSubmitHand.value || props.isSubmitted) {
        if (倒水提示.value) {
             submissionMessage.value = `提交失败: ${倒水提示.value}`;
             messageType.value = 'error';
        } else if (!isFrontDunValidCount.value || !isMidDunValidCount.value || !isBackDunValidCount.value) {
            submissionMessage.value = `提交失败: 请确保各牌墩数量正确 (头3, 中5, 尾5)。`;
            messageType.value = 'error';
        } else if (availableToSortCards.value.length > 0) {
            submissionMessage.value = `提交失败: 还有 ${availableToSortCards.value.length} 张牌未摆放。`;
            messageType.value = 'error';
        }
        return;
    }

    submissionMessage.value = '';
    messageType.value = 'info';

    await gameStore.submitHand(frontDun.value, midDun.value, backDun.value);
    if (gameStore.error) {
        submissionMessage.value = `提交失败: ${gameStore.error}`;
        messageType.value = 'error';
    } else {
        // isSubmitted 状态将由 gameStore 更新后通过 props 传入，并触发 watch
    }
}

function autoArrangeSimple() {
    if (props.isSubmitted || props.initialCards.length !== 13) return;
    initializeHands(props.initialCards); // 从原始牌开始

    const sorted = [...availableToSortCards.value].sort((a, b) => a.value - b.value);

    backDun.value = sorted.slice(8, 13).sort((a,b) => b.value - a.value);
    midDun.value = sorted.slice(3, 8).sort((a,b) => b.value - a.value);
    frontDun.value = sorted.slice(0, 3).sort((a,b) => b.value - a.value);
    
    availableToSortCards.value = [];
    submissionMessage.value = "已使用简单自动摆牌，请检查并提交。";
    messageType.value = 'info';
    validateOverallStructure(); // 自动摆牌后也验证一下
}

function resetCurrentArrangement() {
    if (props.isSubmitted) return;
    initializeHands(props.initialCards);
     submissionMessage.value = "摆牌已重置。";
     messageType.value = 'info';
}

onMounted(() => {
    initializeHands(props.initialCards);
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
.hand-area, .arranged-hands-container {
  margin-bottom: 15px;
  padding: 10px;
  border: 1px dashed #ccc;
  background-color: #fff;
}
.available-cards-area {
  min-height: 120px; /* 确保有足够空间显示手牌 */
  background-color: #eef8ff;
}
.arranged-hands-container {
  display: flex;
  justify-content: space-between;
  gap: 10px; /* 三个墩之间的间隔 */
}
.arranged-dun-wrapper {
  flex: 1; /* 让三个墩平分空间 */
  padding: 8px;
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  background-color: #f0f0f0;
  min-height: 110px;
}
.arranged-dun-wrapper h4 {
  margin-top: 0;
  margin-bottom: 8px;
  font-size: 0.9em;
  color: #333;
  text-align: center;
}

.card-list {
  display: flex;
  flex-wrap: wrap; /* 允许卡牌换行 */
  justify-content: flex-start; /* 卡牌左对齐 */
  align-items: flex-start; /* 卡牌顶部对齐 */
  min-height: 105px; /* 至少能放下一行牌的高度，防止拖拽时塌陷 */
  padding: 5px;
  border-radius: 4px;
  background-color: #e9ecef; /* 给拖拽区域一个背景色 */
}
.dun-list.dun-invalid {
    border: 2px dashed red;
}
.empty-area-text {
    text-align: center;
    color: #666;
    font-style: italic;
    padding: 10px;
}
.empty-area-text.all-placed {
    color: green;
    font-weight: bold;
}


.draggable-card {
  cursor: grab;
  margin: 2px !important; /* 覆盖CardDisplay内部的margin，使其更紧凑 */
  transition: transform 0.2s;
}
.draggable-card:active {
  cursor: grabbing;
  transform: scale(1.05);
  z-index: 100;
}
.draggable-card.in-dun {
  /* 墩内卡牌可以有特定样式 */
}

.sortable-ghost { /* 拖拽占位符的样式 */
  opacity: 0.4;
  background-color: #c0e0ff;
  border: 1px dashed #007bff;
}

.action-buttons {
    margin-top: 15px;
    display: flex;
    gap: 10px; /* 按钮之间的间隔 */
}
.submit-button, .auto-arrange-button, .reset-arrange-button {
  padding: 10px 15px; /* 统一按钮大小 */
  font-size: 0.9em;
  cursor: pointer;
  border: none;
  border-radius: 5px;
  color: white;
  transition: background-color 0.2s;
}
.submit-button { background-color: #28a745; }
.submit-button:hover:not(:disabled) { background-color: #218838; }
.auto-arrange-button { background-color: #007bff; }
.auto-arrange-button:hover:not(:disabled) { background-color: #0056b3; }
.reset-arrange-button { background-color: #ffc107; color: #212529; }
.reset-arrange-button:hover:not(:disabled) { background-color: #e0a800; }

.submit-button:disabled, .auto-arrange-button:disabled, .reset-arrange-button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
  color: #666;
}

.submission-message, .error-message, .倒水-tip {
  padding: 10px;
  margin-bottom: 15px;
  border-radius: 4px;
  font-weight: bold;
}
.submission-message.info { background-color: #e7f3fe; border: 1px solid #d0eaff; color: #0c5460; }
.submission-message.error, .error-message, .倒水-tip { background-color: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; }
.submission-message.success { background-color: #d4edda; border: 1px solid #c3e6cb; color: #155724; }

.dun-error {
    color: red;
    font-size: 0.8em;
    text-align: center;
    margin-top: 5px;
}
</style>
