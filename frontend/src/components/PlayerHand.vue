<template>
  <div class="player-hand-organizer-streamlined"> <!-- 使用之前的类名以保持样式 -->
    <div class="piles-layout-draggable"> <!-- 类名保留，样式可能还适用 -->
      <!-- 头墩 -->
      <div class="pile-wrapper">
        <p>
          头墩 ({{ gameStore.arrangedHand.front.length }}/{{ pileLimits.front }})
          <span v-if="isDunComplete('front')" class="dun-complete-badge">✓</span>
        </p>
        <div
          class="pile front-pile draggable-area" <!-- draggable-area 类名保留，视觉上像可交互 -->
          :class="{ 'pile-complete': isDunComplete('front') }"
          @click="handleClickTargetPile('front')"
        >
          <Card
            v-for="(card, index) in gameStore.arrangedHand.front"
            :key="`front-${card.id}`"
            :card="card"
            :is-face-up="true"
            :selected="isSelected(card, 'front')"
            @click.stop="handleClickCardInArrangedPile('front', card, index)"
          />
          <div v-if="gameStore.arrangedHand.front.length < pileLimits.front && !selectedCardForDisplay" class="empty-pile-slot-text">
             点击手牌后点此放置 ({{pileLimits.front - gameStore.arrangedHand.front.length}}张空位)
          </div>
        </div>
      </div>

      <!-- 手牌区 / 中墩区 (动态变化) -->
      <div class="pile-wrapper">
        <p>
          {{ middleDunLabel }} ({{ gameStore.myHand.length }}{{ isMiddleDunActive ? ('/'+pileLimits.middle) : '' }}张)
          <span v-if="isMiddleDunActive && isDunComplete('middle')" class="dun-complete-badge">✓</span>
          <span v-if="selectedCardForDisplay" class="selected-card-prompt">
             - 选: <Card :card="selectedCardForDisplay.card" :is-face-up="true" class="inline-card-tiny"/>
          </span>
        </p>
        <div
          class="pile main-hand-area draggable-area"
          :class="{ 'middle-dun-active': isMiddleDunActive, 'pile-complete': isMiddleDunActive && isDunComplete('middle')}"
          @click="handleClickTargetPile('myHand')"
        >
          <Card
            v-for="(card, index) in gameStore.myHand"
            :key="`myhand-${card.id}`"
            :card="card"
            :is-face-up="true"
            :selected="isSelected(card, 'myHand')"
            @click.stop="handleClickCardInMyHand(card, index)"
          />
           <div v-if="gameStore.myHand.length === 0 && !selectedCardForDisplay" class="empty-pile-slot-text">
              手牌区 (点击墩牌可移回)
           </div>
        </div>
      </div>

      <!-- 尾墩 -->
      <div class="pile-wrapper">
        <p>
          尾墩 ({{ gameStore.arrangedHand.back.length }}/{{ pileLimits.back }})
          <span v-if="isDunComplete('back')" class="dun-complete-badge">✓</span>
        </p>
        <div
          class="pile back-pile draggable-area"
          :class="{ 'pile-complete': isDunComplete('back') }"
          @click="handleClickTargetPile('back')"
        >
          <Card
            v-for="(card, index) in gameStore.arrangedHand.back"
            :key="`back-${card.id}`"
            :card="card"
            :is-face-up="true"
            :selected="isSelected(card, 'back')"
            @click.stop="handleClickCardInArrangedPile('back', card, index)"
          />
           <div v-if="gameStore.arrangedHand.back.length < pileLimits.back && !selectedCardForDisplay" class="empty-pile-slot-text">
              点击手牌后点此放置 ({{pileLimits.back - gameStore.arrangedHand.back.length}}张空位)
           </div>
        </div>
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
     <!-- API 错误由 GameBoard.vue 显示，这里只显示本组件的操作反馈 -->
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'; // watch, reactive 可能不再直接需要，因为v-model没了
import { useGameStore } from '../store/game';
import Card from './Card.vue';
// import draggable from 'vuedraggablenext'; // 确保这行被删除或注释

const gameStore = useGameStore();
const selectedCardForDisplay = ref(null); // 用于点击交互的选中牌状态 { card, fromPile, fromIndex }
const clientErrorFeedback = ref(null);

const pileLimits = { front: 3, middle: 5, back: 5 };
const totalCards = 13;

// --- Computed Properties ---
const isMiddleDunActive = computed(() => {
  return gameStore.arrangedHand.front.length === pileLimits.front &&
         gameStore.arrangedHand.back.length === pileLimits.back &&
         gameStore.myHand.length === (totalCards - pileLimits.front - pileLimits.back); // Should be 5
});

const middleDunLabel = computed(() => {
  return isMiddleDunActive.value ? "中墩" : "手牌区";
});

const canAutoArrangeInternal = computed(() => {
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

const canSubmitEffectivelyInternal = computed(() => {
  return gameStore.canSubmitHand &&
         gameStore.arrangedHand.front.length === pileLimits.front &&
         gameStore.arrangedHand.back.length === pileLimits.back &&
         gameStore.myHand.length === pileLimits.middle;
});

// --- Client Feedback ---
function setClientErrorFeedback(message, duration = 3000) {
    clientErrorFeedback.value = message;
    if (duration > 0 && message) {
        setTimeout(() => { clientErrorFeedback.value = null; }, duration);
    } else if (!message) {
        clientErrorFeedback.value = null;
    }
}

// --- Click Interaction Logic (Restored and Adapted) ---
function isSelected(card, pileName) {
    return selectedCardForDisplay.value &&
           selectedCardForDisplay.value.card.id === card.id &&
           selectedCardForDisplay.value.fromPile === pileName;
}

function handleClickCardInMyHand(card, index) {
  if (isSelected(card, 'myHand')) {
    selectedCardForDisplay.value = null; // 取消选择
  } else {
    selectedCardForDisplay.value = { card, fromPile: 'myHand', fromIndex: index };
  }
}

function handleClickCardInArrangedPile(pileName, card, index) {
  if (selectedCardForDisplay.value) {
    // 如果当前有选中的牌 (只能是来自 'myHand')
    if (selectedCardForDisplay.value.fromPile === 'myHand') {
        setClientErrorFeedback("已选中手牌，请点击目标墩的空白区域来放置。", 2000);
        // 不取消选择，让用户可以继续点击目标墩
        return;
    }
    // 如果错误地选中了其他墩的牌（理论上不应发生，因为选中逻辑主要在myHand）
    // 或者重复点击了已选中的墩牌，则取消选择
    if (isSelected(card, pileName) || selectedCardForDisplay.value.fromPile !== 'myHand') {
        selectedCardForDisplay.value = null;
        return;
    }
  } else {
    // 如果没有牌被选中，则将这张墩牌移回“手牌区”
    const success = gameStore.moveCard(card, pileName, 'myHand', index);
    if (!success) setClientErrorFeedback(`无法将牌从 ${pileName} 移回手牌区。`);
  }
}

function handleClickTargetPile(targetPileName) {
  if (!selectedCardForDisplay.value) { // 如果没有选中的牌，点击空白区域无效
      // 例外：如果点击的是已摆放墩的空白，且该墩有牌，可以考虑将最后一张移回手牌（可选交互）
      // if (targetPileName !== 'myHand' && gameStore.arrangedHand[targetPileName].length > 0) {
      //   const pile = gameStore.arrangedHand[targetPileName];
      //   gameStore.moveCard(pile[pile.length - 1], targetPileName, 'myHand', pile.length - 1);
      // }
      return;
  }

  const { card, fromPile, fromIndex } = selectedCardForDisplay.value;

  // 如果点击的是选中牌当前所在的区域的空白处，则取消选择
  if (fromPile === targetPileName) {
    selectedCardForDisplay.value = null;
    return;
  }

  // 只能从 'myHand' 移动到 'front' 或 'back'
  if (fromPile !== 'myHand' && (targetPileName === 'front' || targetPileName === 'back')) {
      setClientErrorFeedback("只能从手牌区向头/尾墩放牌。", 2000);
      return;
  }
  // 只能从 'front' 或 'back' 移动到 'myHand' (这个由 handleClickCardInArrangedPile 处理)

  let targetLimit = Infinity; // myHand (手牌区) 理论上最多13张
  if (targetPileName === 'front') targetLimit = pileLimits.front;
  else if (targetPileName === 'back') targetLimit = pileLimits.back;

  let currentTargetLength = 0;
  if (targetPileName === 'myHand') currentTargetLength = gameStore.myHand.length;
  else currentTargetLength = gameStore.arrangedHand[targetPileName]?.length || 0;


  if (currentTargetLength < targetLimit) {
    // 确保是从 myHand 移到墩，或者从墩移到 myHand
    if ((fromPile === 'myHand' && (targetPileName === 'front' || targetPileName === 'back')) ||
        ((fromPile === 'front' || fromPile === 'back') && targetPileName === 'myHand') ) {
        
        const success = gameStore.moveCard(card, fromPile, targetPileName, fromIndex);
        if (success) {
          selectedCardForDisplay.value = null; // 成功移动后取消选择
        } else {
          setClientErrorFeedback(`无法将牌移动到 ${targetPileName}。`);
        }
    } else {
        setClientErrorFeedback("无效的牌张移动路径。", 2000);
    }
  } else {
    setClientErrorFeedback(`墩位 ${targetPileName === 'myHand' ? middleDunLabel.value : targetPileName} 已满！`);
  }
}

// --- Button Actions ---
async function submitHandWrapper() {
    if (!canSubmitEffectivelyInternal.value) {
        setClientErrorFeedback("牌型未按 头3-中5-尾5 摆满或不符合提交条件。");
        return;
    }
    setClientErrorFeedback(null);
    const handToSubmitLogic = {
        front: gameStore.arrangedHand.front.map(c => c.id),
        middle: gameStore.myHand.map(c => c.id), // myHand 作为中墩
        back: gameStore.arrangedHand.back.map(c => c.id),
    };
    await gameStore.submitArrangedHandInternal(handToSubmitLogic);
}

function autoArrangeForSubmission() {
    if (!canAutoArrangeInternal.value) {
        setClientErrorFeedback("请确保所有13张牌都在手牌区才能智能整理。");
        return;
    }
    gameStore.clearArrangedPilesForAuto(); // 牌会回到 myHand

    if (gameStore.myHand.length !== totalCards) {
        setClientErrorFeedback("智能整理前手牌数量不正确，请刷新或重试。");
        return;
    }
    // 智能整理逻辑现在依赖于 store 的 moveCard
    const sortedHandForOps = [...gameStore.myHand].sort((a, b) => b.rank - a.rank);

    // 先将排序后的牌重新按顺序放入 store 的 myHand (如果 clearArrangedPilesForAuto 顺序不对)
    gameStore.myHand.length = 0;
    sortedHandForOps.forEach(c => gameStore.myHand.push(c));

    // 尾墩：最大的5张牌
    for (let i = 0; i < pileLimits.back; i++) {
        if (gameStore.myHand.length > 0) {
             // 总是从myHand的第一个元素开始移动（因为它是最大的未分配牌）
            gameStore.moveCard(gameStore.myHand[0], 'myHand', 'back', 0);
        }
    }
    // 头墩：最小的3张牌
    const remainingInMyHandForFront = [...gameStore.myHand].sort((a, b) => a.rank - b.rank);
    //  (先不直接修改 myHand，从中挑选)
    
    for (let i = 0; i < pileLimits.front; i++) {
        if (remainingInMyHandForFront.length > 0) {
            const cardToMoveToFront = remainingInMyHandForFront[i]; // 依次取最小的
            const idxInMyHand = gameStore.myHand.findIndex(c => c.id === cardToMoveToFront.id);
            if (idxInMyHand !== -1) {
                gameStore.moveCard(gameStore.myHand[idxInMyHand], 'myHand', 'front', idxInMyHand);
            }
        }
    }
    selectedCardForDisplay.value = null;
    setClientErrorFeedback("已尝试智能整理，请检查并调整。", 5000);
}

async function handleAiArrange() {
    if (!canAutoArrangeInternal.value) {
        setClientErrorFeedback("请确保所有13张牌都在手牌区才能使用 AI 分牌。");
        return;
    }
    setClientErrorFeedback(null);
    gameStore.clearArrangedPilesForAuto();
     if (gameStore.myHand.length !== totalCards) {
        setClientErrorFeedback("AI分牌前手牌数量不正确，请刷新或重试。");
        return;
    }

    const success = await gameStore.aiArrangeHand();
    if (success) {
        setClientErrorFeedback("AI 已尝试分牌，请检查并调整。", 5000);
        selectedCardForDisplay.value = null;
    } else {
        setClientErrorFeedback(gameStore.error || "AI 分牌失败，请稍后再试或手动摆牌。", 5000);
    }
}
</script>

<style scoped>
/* ... (样式与上一版本 PlayerHand.vue 相同) ... */
.player-hand-organizer-streamlined { padding: 15px; background-color: #e6f0f7; border-radius: 8px; }
.piles-layout-draggable { display: flex; flex-direction: column; align-items: center; gap: 15px; }
.pile-wrapper { width: 100%; max-width: 620px; }
.pile-wrapper p { text-align: center; margin: 0 0 8px 0; font-weight: 600; color: #2c5282; font-size: 1.05em; display: flex; justify-content: center; align-items: center; }
.draggable-area { /* 保留这个类名，但不再是draggable组件 */
  display: flex; flex-wrap: wrap; justify-content: center; align-items: flex-start;
  padding: 10px; border: 2px dashed #add8e6; border-radius: 8px;
  background-color: #f0faff; min-height: 110px; transition: border-color 0.3s, background-color 0.3s;
  cursor: default; /* 改回默认手势，因为现在是点击交互 */
}
.draggable-area:hover { border-color: #6495ed; } /* 悬停时仍高亮可交互区域 */
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
.card.selected { /* Card.vue 中定义的 selected 样式会应用 */
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.5), 0 4px 10px rgba(0,0,0,0.1);
  transform: scale(1.05) translateY(-4px);
}
</style>
