<template>
  <div class="player-hand-organizer-draggable">
    <div class="piles-layout-draggable">
      <!-- 头墩 -->
      <div class="pile-wrapper">
        <p>
          头墩 ({{ arrangedHandState.front.length }}/{{ pileLimits.front }})
          <span v-if="isDunComplete('front')" class="dun-complete-badge">✓</span>
        </p>
        <draggable
          v-model="arrangedHandState.front"
          :group="dragGroupOptions"
          item-key="id"
          class="pile front-pile draggable-area"
          :class="{ 'pile-complete': isDunComplete('front') }"
          :sort="true"
          @end="onDragEndUpdateStore('front', $event)"
          :move="checkMove"
          :disabled="!gameStore.canSubmitHand || gameStore.isLoading"
          :component-data="{ name: 'front-pile-draggable' }"
        >
          <template #item="{ element: card }">
            <Card :card="card" :is-face-up="true" />
          </template>
          <template #footer>
             <div v-if="arrangedHandState.front.length < pileLimits.front && !dragInProgress" class="empty-pile-slot-text">
                拖拽牌到此处 ({{pileLimits.front - arrangedHandState.front.length}}张空位)
             </div>
          </template>
        </draggable>
      </div>

      <!-- 手牌区 / 中墩区 -->
      <div class="pile-wrapper">
        <p>
          {{ middleDunLabel }} ({{ myHandState.length }}{{ isMiddleDunActive ? ('/'+pileLimits.middle) : '' }}张)
          <span v-if="isMiddleDunActive && isDunComplete('middle')" class="dun-complete-badge">✓</span>
        </p>
        <draggable
          v-model="myHandState"
          :group="dragGroupOptions"
          item-key="id"
          class="pile main-hand-area draggable-area"
          :class="{ 'middle-dun-active': isMiddleDunActive, 'pile-complete': isMiddleDunActive && isDunComplete('middle')}"
          :sort="true"
          @start="dragInProgress = true"
          @end="onDragEndUpdateStore('myHand', $event)"
          :move="checkMove"
          :disabled="!gameStore.canSubmitHand || gameStore.isLoading"
          :component-data="{ name: 'myhand-pile-draggable' }"
        >
          <template #item="{ element: card }">
            <Card :card="card" :is-face-up="true" />
          </template>
           <template #footer>
             <div v-if="myHandState.length === 0 && !dragInProgress" class="empty-pile-slot-text">
                手牌区
             </div>
          </template>
        </draggable>
      </div>

      <!-- 尾墩 -->
      <div class="pile-wrapper">
        <p>
          尾墩 ({{ arrangedHandState.back.length }}/{{ pileLimits.back }})
          <span v-if="isDunComplete('back')" class="dun-complete-badge">✓</span>
        </p>
        <draggable
          v-model="arrangedHandState.back"
          :group="dragGroupOptions"
          item-key="id"
          class="pile back-pile draggable-area"
          :class="{ 'pile-complete': isDunComplete('back') }"
          :sort="true"
          @end="onDragEndUpdateStore('back', $event)"
          :move="checkMove"
          :disabled="!gameStore.canSubmitHand || gameStore.isLoading"
          :component-data="{ name: 'back-pile-draggable' }"
        >
          <template #item="{ element: card }">
            <Card :card="card" :is-face-up="true" />
          </template>
           <template #footer>
             <div v-if="arrangedHandState.back.length < pileLimits.back && !dragInProgress" class="empty-pile-slot-text">
                拖拽牌到此处 ({{pileLimits.back - arrangedHandState.back.length}}张空位)
             </div>
          </template>
        </draggable>
      </div>
    </div>

    <div class="controls-area-draggable">
        <button @click="autoArrangeForSubmission" :disabled="!canAutoArrangeInternal || gameStore.isLoading" class="control-button auto-arrange-btn">
            智能整理
        </button>
        <button @click="handleAiArrange" :disabled="!canAutoArrangeInternal || gameStore.isLoading" class="control-button ai-arrange-btn">
            AI 分牌
        </button>
        <button @click="submitHandWrapper" :disabled="!canSubmitEffectivelyInternal || gameStore.isLoading" class="control-button submit-btn">
            提交牌型
        </button>
    </div>
    <p v-if="gameStore.isLoading" class="feedback-message info">处理中...</p>
    <p v-if="clientErrorFeedback" class="feedback-message error">{{ clientErrorFeedback }}</p>
  </div>
</template>

<script setup>
import { ref, computed, watch, reactive } from 'vue'; // Import reactive
import { useGameStore } from '../store/game';
import Card from './Card.vue';
import draggable from 'vuedraggablenext';

const gameStore = useGameStore();
const clientErrorFeedback = ref(null);
const dragInProgress = ref(false); // Track drag state for UI hints

const pileLimits = { front: 3, middle: 5, back: 5 };
const totalCards = 13;

// Local reactive state for draggable v-model, synced with store
// This is important because vuedraggable directly mutates the array it's bound to.
// To keep Pinia's state management clean, we use a local copy for v-model
// and then explicitly update the store when drag ends or on other changes.
const myHandState = ref([]);
const arrangedHandState = reactive({
  front: [],
  back: [],
});

// Watch store changes and update local state
watch(() => gameStore.myHand, (newHand) => {
  myHandState.value = [...newHand]; // Create a new array copy
}, { immediate: true, deep: true });

watch(() => gameStore.arrangedHand.front, (newFront) => {
  arrangedHandState.front = [...newFront];
}, { immediate: true, deep: true });

watch(() => gameStore.arrangedHand.back, (newBack) => {
  arrangedHandState.back = [...newBack];
}, { immediate: true, deep: true });


const dragGroupOptions = computed(() => ({
  name: 'cards',
  pull: true, // Allow pulling items from this list
  put: true   // Allow putting items into this list
}));

const isMiddleDunActive = computed(() => {
  return arrangedHandState.front.length === pileLimits.front &&
         arrangedHandState.back.length === pileLimits.back &&
         myHandState.value.length === (totalCards - pileLimits.front - pileLimits.back);
});

const middleDunLabel = computed(() => {
  return isMiddleDunActive.value ? "中墩" : "手牌区";
});

const canAutoArrangeInternal = computed(() => {
    return myHandState.value.length === totalCards &&
           arrangedHandState.front.length === 0 &&
           arrangedHandState.back.length === 0 &&
           gameStore.canSubmitHand;
});

const isDunComplete = (pileName) => {
    if (pileName === 'front') return arrangedHandState.front.length === pileLimits.front;
    if (pileName === 'back') return arrangedHandState.back.length === pileLimits.back;
    if (pileName === 'middle' && isMiddleDunActive.value) return myHandState.value.length === pileLimits.middle;
    return false;
};

function setClientFeedback(message, duration = 3000, isError = false) {
    clientErrorFeedback.value = message;
    if (duration > 0 && message) {
        setTimeout(() => { clientErrorFeedback.value = null; }, duration);
    } else if (!message) {
        clientErrorFeedback.value = null;
    }
}

function onDragEndUpdateStore(sourcePileName, event) {
  dragInProgress.value = false;
  // VueDraggableNext has already updated the local reactive arrays (myHandState, arrangedHandState.front/back)
  // Now, we need to explicitly update the Pinia store to reflect these changes.
  // This ensures mutations go through store actions if we add more logic there.
  // For now, a direct update to store state from component is acceptable if arrays are simple.
  // However, for better practice, one might create a store action e.g., `updatePilesAfterDrag`.

  // Direct store update based on local state (which vuedraggable mutated)
  gameStore.myHand = [...myHandState.value];
  gameStore.arrangedHand.front = [...arrangedHandState.front];
  gameStore.arrangedHand.back = [...arrangedHandState.back];

  // console.log(`Drag ended. Source: ${sourcePileName}, From DOM: ${event.from.classList}, To DOM: ${event.to.classList}`);
  setClientFeedback(null);
}

function checkMove(evt) {
  dragInProgress.value = true; // Set drag in progress
  const targetPileElement = evt.to;
  let targetPileName = '';
  let targetLimit = Infinity;
  let targetArrayLength = 0;

  if (targetPileElement.classList.contains('front-pile')) {
    targetPileName = 'front';
    targetLimit = pileLimits.front;
    targetArrayLength = arrangedHandState.front.length;
  } else if (targetPileElement.classList.contains('back-pile')) {
    targetPileName = 'back';
    targetLimit = pileLimits.back;
    targetArrayLength = arrangedHandState.back.length;
  } else if (targetPileElement.classList.contains('main-hand-area')) {
    targetPileName = 'myHand'; // The myHandState array
    targetLimit = totalCards; // myHand can hold up to 13 cards in total
    targetArrayLength = myHandState.value.length;
  }

  if (targetPileName) {
    // If dragging from a different list into this target, check target limit
    if (evt.from !== evt.to && targetArrayLength >= targetLimit) {
      setClientFeedback(`墩位 ${targetPileName === 'myHand' ? middleDunLabel.value : targetPileName} 已满！`, 2000);
      dragInProgress.value = false; // Reset on invalid move attempt
      return false; // Prevent move
    }
  }
  return true; // Allow move
}

const canSubmitEffectivelyInternal = computed(() => {
  return gameStore.canSubmitHand &&
         arrangedHandState.front.length === pileLimits.front &&
         arrangedHandState.back.length === pileLimits.back &&
         myHandState.value.length === pileLimits.middle;
});

async function submitHandWrapper() {
    if (!canSubmitEffectivelyInternal.value) {
        setClientFeedback("牌型未按 头3-中5-尾5 摆满或不符合提交条件。");
        return;
    }
    setClientFeedback(null);
    const handToSubmitLogic = {
        front: arrangedHandState.front.map(c => c.id),
        middle: myHandState.value.map(c => c.id),
        back: arrangedHandState.back.map(c => c.id),
    };
    await gameStore.submitArrangedHandInternal(handToSubmitLogic);
}

function autoArrangeForSubmission() {
    if (!canAutoArrangeInternal.value) {
        setClientFeedback("请确保所有13张牌都在手牌区才能智能整理。");
        return;
    }
    // Ensure all cards are in myHandState before sorting for auto-arrange
    const allCardsForAuto = [...myHandState.value, ...arrangedHandState.front, ...arrangedHandState.back];
    const uniqueAllCards = Array.from(new Set(allCardsForAuto.map(c => c.id))).map(id => allCardsForAuto.find(c => c.id === id));

    if (uniqueAllCards.length !== totalCards) {
        setClientFeedback("自动整理前牌数异常，请刷新。", 3000);
        return;
    }
    
    myHandState.value = [...uniqueAllCards].sort((a, b) => b.rank - a.rank); // All cards to myHand, sorted desc
    arrangedHandState.front = [];
    arrangedHandState.back = [];

    //尾墩
    for (let i = 0; i < pileLimits.back; i++) {
        if (myHandState.value.length > 0) arrangedHandState.back.push(myHandState.value.shift());
    }
    //头墩 (最小的)
    const remainingForFront = [...myHandState.value].sort((a,b)=> a.rank - b.rank);
    myHandState.value = []; // Clear myHand before re-populating middle

    for (let i = 0; i < pileLimits.front; i++) {
        if (remainingForFront.length > 0) arrangedHandState.front.push(remainingForFront.shift());
    }
    // 剩下的作为中墩 (放入 myHandState)
    myHandState.value = [...remainingForFront];


    // Sync back to store after local manipulation
    gameStore.myHand = [...myHandState.value];
    gameStore.arrangedHand.front = [...arrangedHandState.front];
    gameStore.arrangedHand.back = [...arrangedHandState.back];
    setClientFeedback("已尝试智能整理，请检查并调整。", 5000);
}

async function handleAiArrange() {
    if (!canAutoArrangeInternal.value) {
        setClientFeedback("请确保所有13张牌都在手牌区才能使用 AI 分牌。");
        return;
    }
    setClientFeedback(null);
    // Ensure all cards are in store's myHand before calling AI
    gameStore.clearArrangedPilesForAuto();
     if (gameStore.myHand.length !== totalCards) {
        setClientFeedback("AI分牌前手牌数量不正确，请刷新或重试。", 3000);
        return;
    }

    const success = await gameStore.aiArrangeHand(); // Store action will update store's myHand, front, back
    if (success) {
        // Watchers will update local myHandState and arrangedHandState from store
        setClientFeedback("AI 已尝试分牌，请检查并调整。", 5000);
    } else {
        setClientFeedback(gameStore.error || "AI 分牌失败，请稍后再试或手动摆牌。", 5000);
    }
}
</script>

<style scoped>
/* ... (样式与上一版本 PlayerHand.vue 相同或类似, 确保类名匹配) ... */
.player-hand-organizer-draggable {
  padding: 15px; background-color: #e9f5fe; border-radius: 10px; box-shadow: 0 0 15px rgba(0,0,0,0.05);
}
.piles-layout-draggable { display: flex; flex-direction: column; align-items: center; gap: 18px; }
.pile-wrapper { width: 100%; max-width: 620px; }
.pile-wrapper p { text-align: center; margin: 0 0 8px 0; font-weight: 600; color: #2c5282; font-size: 1.05em; display: flex; justify-content: center; align-items: center; }
.draggable-area {
  display: flex; flex-wrap: wrap; justify-content: center; align-items: flex-start;
  padding: 10px; border: 2px dashed #add8e6; border-radius: 8px;
  background-color: #f0faff; min-height: 110px; transition: border-color 0.3s, background-color 0.3s;
}
.draggable-area:hover { border-color: #6495ed; }
.pile.pile-complete { border-color: #3cb371 !important; background-color: #f3fff3;}
.main-hand-area.middle-dun-active { border-style: solid; border-color: #4682b4; }
.dun-complete-badge { color: #4CAF50; font-size: 1.2em; margin-left: 8px; }
.selected-card-prompt { font-size: 0.8em; color: #007bff; margin-left: 10px; font-weight: normal; }
.inline-card-tiny { transform: scale(0.45); margin: -12px -18px; vertical-align: middle; }
.empty-pile-slot-text { width: 100%; text-align: center; color: #a0b0c0; font-style: italic; padding: 20px 0; font-size: 0.9em;}
.controls-area-draggable { display: flex; justify-content: center; flex-wrap: wrap; gap: 10px; margin-top: 25px; }
.control-button {
  padding: 10px 20px; font-size: 1em; border-radius: 20px; border: none;
  cursor: pointer; transition: all 0.3s; font-weight: 500;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
}
.auto-arrange-btn { background-color: #ffc107; color: #333; }
.ai-arrange-btn { background-color: #8e44ad; color: white; }
.submit-btn { background-color: #28a745; color: white; }
.control-button:disabled { background-color: #e9ecef; color: #6c757d; cursor: not-allowed; box-shadow: none;}
.control-button:hover:not(:disabled) { opacity: 0.85; transform: translateY(-1px); }
.feedback-message { text-align: center; margin-top: 15px; font-weight: 500; min-height: 1.2em; }
.feedback-message.error { color: #d9534f; }
.feedback-message.info { color: #007bff; }
/* Card.vue 的 .card-draggable 和 SortableJS 的类在 Card.vue 中定义 */
</style>
