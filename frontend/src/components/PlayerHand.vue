<template
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
             - 选: <Card :card="selectedCard" :is-face-up="true" class="inline-card-tiny"/>
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
            智能整理 (头/中/尾)
        </button>
        <button @click="submitHandWrapper" :disabled="!canSubmitEffectively" class="control-button submit-btn">
            提交牌型
        </button>
    </div>
    <p v-if="gameStore.error || clientError" class="feedback-message error">{{ gameStore.error || clientError }}</p>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useGameStore } from '../store/game';
import Card from './Card.vue';

const gameStore = useGameStore();
const selectedCard = ref(null); // { card: CardObject, fromPile: string, fromIndex: number }
const clientError = ref(null);

const pileLimits = { front: 3, middle: 5, back: 5 };
const totalCards = 13;

// 动态计算中间区域的标签
const isMiddleDunActive = computed(() => {
  return gameStore.arrangedHand.front.length === pileLimits.front &&
         gameStore.arrangedHand.back.length === pileLimits.back &&
         gameStore.myHand.length === (totalCards - pileLimits.front - pileLimits.back); // 也就是5张
});

const middleDunLabel = computed(() => {
  return isMiddleDunActive.value ? "中墩" : "手牌区";
});

const canAutoArrange = computed(() => {
    // 只有当所有牌都在手牌区时才允许自动整理
    return gameStore.myHand.length === totalCards &&
           gameStore.arrangedHand.front.length === 0 &&
           gameStore.arrangedHand.back.length === 0 &&
           gameStore.canSubmitHand; // 游戏状态允许
});

const isDunComplete = (pileName) => {
    if (pileName === 'front') return gameStore.arrangedHand.front.length === pileLimits.front;
    if (pileName === 'back') return gameStore.arrangedHand.back.length === pileLimits.back;
    if (pileName === 'middle' && isMiddleDunActive.value) return gameStore.myHand.length === pileLimits.middle;
    return false;
};


function setClientError(message, duration = 3000) {
    clientError.value = message;
    if (duration > 0) {
        setTimeout(() => { clientError.value = null; }, duration);
    }
}

function isSelected(card, pileName) {
    return selectedCard.value && selectedCard.value.card.id === card.id && selectedCard.value.fromPile === pileName;
}

// 点击“手牌区”（原中墩）的牌
function handleClickCardInMyHand(card, index) {
  if (isSelected(card, 'myHand')) { // 重复点击已选中的牌则取消
    selectedCard.value = null;
  } else { // 选择这张牌
    selectedCard.value = { card, fromPile: 'myHand', fromIndex: index };
  }
}

// 点击“头墩”或“尾墩”的牌
function handleClickCardInArrangedPile(pileName, card, index) {
  if (selectedCard.value) { // 如果有牌被选中
    // 场景1: 选中的牌不是这个墩的，尝试放入这个墩（如果规则允许互换或从手牌区放入）
    // 当前简化逻辑：不允许墩与墩直接互换，只能通过手牌区中转
    if (selectedCard.value.fromPile === 'myHand') {
        setClientError("请先将选中的牌放回手牌区，再操作此墩的牌。"); // 或者直接取消选择
        selectedCard.value = null; // 取消选择，让用户重新操作
        return;
    }
    // 场景2: 选中的牌就是这个墩的 (重复点击)，则取消选择
    if (isSelected(card, pileName)) {
        selectedCard.value = null;
        return;
    }
    // 场景3: 选中的牌是另一个墩的牌，不允许直接移动，提示通过手牌区
    if (selectedCard.value.fromPile !== 'myHand' && selectedCard.value.fromPile !== pileName) {
        setClientError("墩之间的牌请通过手牌区移动。");
        selectedCard.value = null;
        return;
    }

  } else { // 如果没有牌被选中，则将这张墩牌移回“手牌区”
    const success = gameStore.moveCard(card, pileName, 'myHand', index);
    if (!success) setClientError(`无法将牌从 ${pileName} 移回手牌区。`);
  }
}

// 点击目标墩的空白区域（头墩、尾墩、手牌区）
function handleClickTargetPile(targetPileName) {
  if (!selectedCard.value) return; // 没有选中的牌，点击空白无效

  const { card, fromPile, fromIndex } = selectedCard.value;

  if (fromPile === targetPileName) { // 点击了选中牌所在区域的空白，取消选择
    selectedCard.value = null;
    return;
  }

  let targetLimit = Infinity; // 手牌区没有上限
  if (targetPileName === 'front') targetLimit = pileLimits.front;
  else if (targetPileName === 'back') targetLimit = pileLimits.back;
  // 如果目标是 'myHand' (手牌区)，则没有数量限制（直到13张）

  let currentTargetLength = 0;
  if (targetPileName === 'myHand') currentTargetLength = gameStore.myHand.length;
  else currentTargetLength = gameStore.arrangedHand[targetPileName].length;

  if (currentTargetLength < targetLimit) {
    const success = gameStore.moveCard(card, fromPile, targetPileName, fromIndex);
    if (success) {
      selectedCard.value = null; // 成功移动后取消选择
    } else {
      setClientError(`无法将牌移动到 ${targetPileName}。`);
    }
  } else {
    setClientError(`墩位 ${targetPileName} 已满！`);
  }
}

const canSubmitEffectively = computed(() => {
  return gameStore.canSubmitHand && // 游戏状态允许
         gameStore.arrangedHand.front.length === pileLimits.front &&
         gameStore.arrangedHand.back.length === pileLimits.back &&
         gameStore.myHand.length === pileLimits.middle; // 手牌区（即中墩）必须是5张
});

async function submitHandWrapper() {
    if (!canSubmitEffectively.value) {
        setClientError("牌型未按 头3-中5-尾5 摆满或不符合提交条件。");
        return;
    }
    clientError.value = null;
    // 构建提交数据时，将 myHand 作为 middle
    const handToSubmitLogic = {
        front: gameStore.arrangedHand.front.map(c => c.id),
        middle: gameStore.myHand.map(c => c.id),
        back: gameStore.arrangedHand.back.map(c => c.id),
    };
    // 调用 store 中的 action
    await gameStore.submitArrangedHandInternal(handToSubmitLogic); // 使用新的内部提交方法
}

// 智能整理，目标是形成 头3 中5 尾5
function autoArrangeForSubmission() {
    if (!canAutoArrange.value) {
        setClientError("请确保所有13张牌都在手牌区才能智能整理。");
        return;
    }
    // 假设所有牌都在 myHand
    const sortedHand = [...gameStore.myHand].sort((a, b) => b.rank - a.rank); // 按点数降序

    // 清空墩位 (牌会回到 myHand，但因为我们已经有了 sortedHand，所以可以直接操作)
    gameStore.clearArrangedPilesForAuto(); // 需要在store中添加这个action

    // 重新填充 myHand 以便 moveCard 能正确操作
    gameStore.myHand.length = 0;
    sortedHand.forEach(c => gameStore.myHand.push(c));

    // 尾墩：最大的5张牌
    for (let i = 0; i < pileLimits.back; i++) {
        if (gameStore.myHand.length > 0) gameStore.moveCard(gameStore.myHand[0], 'myHand', 'back', 0);
    }
    // 中墩：接下来中等的5张牌 (会留在 myHand)
    // 头墩：最小的3张牌
    // 此时myHand应该有 13-5 = 8张牌，取最小的3张
    const cardsForFront = [...gameStore.myHand].sort((a,b) => a.rank - b.rank).slice(0, pileLimits.front);

    for (const card of cardsForFront) {
        const idxInMyHand = gameStore.myHand.findIndex(c => c.id === card.id);
        if (idxInMyHand !== -1) {
            gameStore.moveCard(gameStore.myHand[idxInMyHand], 'myHand', 'front', idxInMyHand);
        }
    }
    // 此时 myHand 应该剩下 8-3 = 5 张牌作为中墩

    selectedCard.value = null;
    setClientError("已尝试智能整理，请检查并调整。", 5000);
}

</script>

<style scoped>
.player-hand-organizer-streamlined {
  padding: 15px;
  background-color: #e6f0f7; /* 更柔和的背景 */
  border-radius: 8px;
}
.piles-layout {
  display: flex;
  flex-direction: column; /* 墩位垂直排列 */
  align-items: center; /* 墩位居中 */
  gap: 15px; /* 墩位之间的间隙 */
}
.pile {
  width: 95%;
  max-width: 600px; /* 限制最大宽度 */
  padding: 10px;
  border: 1px solid #c5d9e8;
  border-radius: 8px;
  background-color: #fff;
  box-shadow: 0 3px 6px rgba(0,0,0,0.08);
  transition: all 0.2s ease-in-out;
}
.pile.pile-complete {
    border-color: #4CAF50; /* 绿色边框表示完成 */
    background-color: #f0fff0; /* 淡绿色背景 */
}
.pile p {
  text-align: center;
  margin: 0 0 10px 0;
  font-weight: 600;
  color: #3a5a78;
  font-size: 1em;
  display: flex;
  justify-content: center;
  align-items: center;
}
.dun-complete-badge {
    color: #4CAF50;
    font-size: 1.2em;
    margin-left: 8px;
}
.selected-card-prompt {
    font-size: 0.8em;
    color: #007bff;
    margin-left: 10px;
    font-weight: normal;
}
.inline-card-tiny {
    transform: scale(0.45);
    margin: -12px -18px;
    vertical-align: middle;
}
.hand-row.pile-content {
  display: flex;
  flex-wrap: wrap;
  justify-content: center; /* 牌张居中 */
  min-height: 85px; /* 根据卡牌大小调整 */
}
.hand-row.pile-content .card {
  margin: 3px;
}
.main-hand-area { /* 中间的“手牌区”/“中墩” */
  border-style: dashed;
  border-width: 2px;
  background-color: #f8fbfd;
}
.main-hand-area.middle-dun-active { /* 当它作为中墩时 */
  border-style: solid;
  border-color: #5c9dde;
}
.droppable-target:hover {
  border-color: #5c9dde;
  transform: translateY(-2px);
}
.empty-notice {
  width: 100%;
  text-align: center;
  color: #99aabb;
  font-style: italic;
  padding: 20px 0;
}
.controls-area {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 20px;
}
.control-button {
  padding: 10px 20px;
  font-size: 1em;
  border-radius: 20px; /* 圆角按钮 */
  border: none;
  cursor: pointer;
  transition: all 0.3s;
  font-weight: 500;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
}
.auto-arrange-btn {
  background-color: #ffc107; /* 黄色 */
  color: #333;
}
.auto-arrange-btn:hover:not(:disabled) { background-color: #e0a800; }
.submit-btn {
  background-color: #28a745; /* 绿色 */
  color: white;
}
.submit-btn:hover:not(:disabled) { background-color: #218838; }
.control-button:disabled {
  background-color: #e9ecef;
  color: #6c757d;
  cursor: not-allowed;
  box-shadow: none;
}
.feedback-message.error {
  text-align: center;
  color: #d9534f; /* 红色错误 */
  margin-top: 15px;
  font-weight: 500;
}
.card.selected {
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.5), 0 4px 10px rgba(0,0,0,0.1);
  transform: scale(1.05) translateY(-4px);
}
</style>
