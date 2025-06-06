<template>
  <div class="player-hand-organizer">
    <h4>
      我的手牌
      <span v-if="selectedCard" class="selected-card-indicator">
        (已选: <Card :card="selectedCard" :is-face-up="true" class="inline-card"/> - 点击目标墩放置，或再次点击手牌取消)
      </span>
    </h4>
    <div class="my-hand-area hand-row droppable-area" @click="handleClickMyHandArea">
      <Card
        v-for="(card, index) in gameStore.myHand"
        :key="`myhand-${card.id}`"
        :card="card"
        :is-face-up="true"
        :selected="selectedCard && selectedCard.id === card.id"
        @click.stop="handleClickCardInMyHand(card, index)"
      />
      <div v-if="gameStore.myHand.length === 0 && !selectedCard" class="empty-pile-text">手牌区已空</div>
      <div v-if="gameStore.myHand.length === 0 && selectedCard" class="empty-pile-text">点击此处放回已选牌</div>
    </div>

    <h4>摆牌区 (点击牌可移回手牌区)</h4>
    <div class="arranged-piles">
      <div class="pile front-pile droppable-area" @click="handleClickPile('front')">
        <p>头墩 (3张) - {{ gameStore.arrangedHand.front.length }}/3</p>
        <div class="hand-row">
          <Card
            v-for="(card, index) in gameStore.arrangedHand.front"
            :key="`front-${card.id}`"
            :card="card"
            :is-face-up="true"
            @click.stop="handleClickCardInPile('front', card, index)"
          />
        </div>
      </div>
      <div class="pile middle-pile droppable-area" @click="handleClickPile('middle')">
        <p>中墩 (5张) - {{ gameStore.arrangedHand.middle.length }}/5</p>
        <div class="hand-row">
          <Card
            v-for="(card, index) in gameStore.arrangedHand.middle"
            :key="`middle-${card.id}`"
            :card="card"
            :is-face-up="true"
            @click.stop="handleClickCardInPile('middle', card, index)"
          />
        </div>
      </div>
      <div class="pile back-pile droppable-area" @click="handleClickPile('back')">
        <p>尾墩 (5张) - {{ gameStore.arrangedHand.back.length }}/5</p>
        <div class="hand-row">
          <Card
            v-for="(card, index) in gameStore.arrangedHand.back"
            :key="`back-${card.id}`"
            :card="card"
            :is-face-up="true"
            @click.stop="handleClickCardInPile('back', card, index)"
          />
        </div>
      </div>
    </div>
    <div class="actions-container">
        <button @click="autoArrangeSimple" :disabled="gameStore.myHand.length !== 13 || !gameStore.canSubmitHand" class="action-button">
            简单自动摆牌 (测试)
        </button>
        <button @click="submitHandWrapper" :disabled="!canSubmitEffectively" class="submit-button">
        提交牌型
        </button>
    </div>
    <p v-if="gameStore.error" class="error-message">{{ gameStore.error }}</p>
    <p v-if="clientError" class="error-message">{{ clientError }}</p>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useGameStore } from '../store/game';
import Card from './Card.vue';

const gameStore = useGameStore();
const selectedCard = ref(null);
const selectedCardOrigin = ref(null); // { pileName: 'myHand' | 'front' | 'middle' | 'back', index: number }
const clientError = ref(null);

const pileLimits = { front: 3, middle: 5, back: 5, myHand: 13 };

function setClientError(message) {
    clientError.value = message;
    setTimeout(() => { clientError.value = null; }, 3000);
}

// 点击手牌区的某张牌
function handleClickCardInMyHand(card, index) {
  if (selectedCard.value && selectedCard.value.id === card.id) {
    // 如果再次点击已选中的牌，则取消选择
    selectedCard.value = null;
    selectedCardOrigin.value = null;
  } else {
    // 选择这张牌
    selectedCard.value = card;
    selectedCardOrigin.value = { pileName: 'myHand', index };
  }
}

// 点击手牌区的空白区域 (用于放回已选中的牌)
function handleClickMyHandArea() {
    if (selectedCard.value && selectedCardOrigin.value && selectedCardOrigin.value.pileName !== 'myHand') {
        // 如果有选中的牌，且不是来自手牌区，则将其移回手牌区
        gameStore.moveCard(
            selectedCard.value,
            selectedCardOrigin.value.pileName,
            'myHand',
            selectedCardOrigin.value.index
        );
        selectedCard.value = null;
        selectedCardOrigin.value = null;
    } else if (selectedCard.value && selectedCardOrigin.value && selectedCardOrigin.value.pileName === 'myHand') {
        // 如果选中的牌来自手牌区，点击手牌区空白相当于取消选择
        selectedCard.value = null;
        selectedCardOrigin.value = null;
    }
}

// 点击某个墩里的牌 (将其移回手牌区)
function handleClickCardInPile(pileName, card, index) {
  if (selectedCard.value) {
    // 如果当前有选中的牌，则尝试将选中的牌放入此墩 (如果此墩不是选中牌的来源)
    if (selectedCardOrigin.value && selectedCardOrigin.value.pileName !== pileName) {
        if (gameStore.arrangedHand[pileName].length < pileLimits[pileName]) {
            gameStore.moveCard(
                selectedCard.value,
                selectedCardOrigin.value.pileName,
                pileName,
                selectedCardOrigin.value.index
            );
            selectedCard.value = null;
            selectedCardOrigin.value = null;
        } else {
            setClientError(`墩位 ${pileName} 已满！`);
        }
    } else {
         // 如果选中的牌就是这个墩的，或者没选中牌，那么就尝试把这张墩里的牌移回手牌
        gameStore.moveCard(card, pileName, 'myHand', index);
        if (selectedCard.value && selectedCard.value.id === card.id) { // 如果移走的是刚选中的牌
            selectedCard.value = null;
            selectedCardOrigin.value = null;
        }
    }
  } else {
    // 如果没有选中的牌，则将点击的这张墩牌移回手牌区
    gameStore.moveCard(card, pileName, 'myHand', index);
  }
}

// 点击某个墩的空白区域 (用于放置选中的牌)
function handleClickPile(targetPileName) {
  if (selectedCard.value && selectedCardOrigin.value) {
    // 确保不是从同一个墩移到同一个墩 (虽然 moveCard 应该能处理，但这里可以提前避免)
    if (selectedCardOrigin.value.pileName === targetPileName) {
        if (selectedCardOrigin.value.pileName !== 'myHand') { // 如果是从墩选的，再点同个墩空白，取消选择
            selectedCard.value = null;
            selectedCardOrigin.value = null;
        }
        return;
    }

    if (gameStore.arrangedHand[targetPileName].length < pileLimits[targetPileName]) {
      gameStore.moveCard(
        selectedCard.value,
        selectedCardOrigin.value.pileName,
        targetPileName,
        selectedCardOrigin.value.index
      );
      selectedCard.value = null;
      selectedCardOrigin.value = null;
    } else {
      setClientError(`墩位 ${targetPileName} 已满！`);
    }
  }
  // 如果没有选中牌，点击墩的空白区域不执行任何操作
}


const canSubmitEffectively = computed(() => {
  return gameStore.canSubmitHand && // store getter 检查游戏状态和是否已提交
         gameStore.arrangedHand.front.length === pileLimits.front &&
         gameStore.arrangedHand.middle.length === pileLimits.middle &&
         gameStore.arrangedHand.back.length === pileLimits.back &&
         gameStore.myHand.length === 0;
});

async function submitHandWrapper() {
    if (!canSubmitEffectively.value) {
        setClientError("牌型未摆满或不符合提交条件。");
        return;
    }
    // 清除之前的客户端错误
    clientError.value = null;
    // store 中的 submitArrangedHand 已经包含了API调用和错误处理
    await gameStore.submitArrangedHand();
}

// 简单的自动摆牌逻辑 (非常基础，仅用于快速测试)
function autoArrangeSimple() {
    if (gameStore.myHand.length !== 13) {
        setClientError("手牌必须有13张才能自动摆牌。");
        return;
    }
    // 清空墩位
    ['front', 'middle', 'back'].forEach(pileName => {
        while(gameStore.arrangedHand[pileName].length > 0) {
            gameStore.moveCard(gameStore.arrangedHand[pileName][0], pileName, 'myHand', 0);
        }
    });

    // 简单的排序：按点数排序 (实际十三水自动理牌复杂得多)
    const sortedHand = [...gameStore.myHand].sort((a, b) => a.rank - b.rank);

    // 摆放：前3张放头墩，中5张放中墩，后5张放尾墩
    // 注意：这里是从myHand直接操作，需要确保moveCard能正确处理
    // 更好的做法是先从sortedHand构建墩，然后一次性更新store，或者多次调用moveCard
    
    // 先把牌移到临时数组，避免在迭代时修改myHand导致问题
    const tempHand = [...gameStore.myHand];
    gameStore.myHand.length = 0; // 清空store中的myHand

    // 将排序后的牌放回头墩
    sortedHand.forEach(card => gameStore.myHand.push(card));


    for (let i = 0; i < 3; i++) {
        if (gameStore.myHand.length > 0) {
            gameStore.moveCard(gameStore.myHand[0], 'myHand', 'front', 0);
        }
    }
    for (let i = 0; i < 5; i++) {
         if (gameStore.myHand.length > 0) {
            gameStore.moveCard(gameStore.myHand[0], 'myHand', 'middle', 0);
        }
    }
    for (let i = 0; i < 5; i++) {
         if (gameStore.myHand.length > 0) {
            gameStore.moveCard(gameStore.myHand[0], 'myHand', 'back', 0);
        }
    }
    selectedCard.value = null;
    selectedCardOrigin.value = null;
}

</script>

<style scoped>
.player-hand-organizer {
  padding: 15px;
  border: 1px solid #eee;
  margin-bottom: 20px;
  background-color: #f9f9f9;
  border-radius: 5px;
}
.player-hand-organizer h4 {
    margin-top: 10px;
    margin-bottom: 8px;
}
.selected-card-indicator {
  font-size: 0.9em;
  color: #007bff;
  margin-left: 10px;
  font-weight: normal;
}
.inline-card { /* 用于selected-card-indicator中的牌 */
    transform: scale(0.6);
    margin: -10px -15px; /* 调整以适应缩小后的尺寸 */
    vertical-align: middle;
}

.my-hand-area, .hand-row {
  display: flex;
  flex-wrap: wrap;
  min-height: 105px; /* 适应卡牌高度 */
  padding: 5px;
  margin-bottom: 10px;
  border-radius: 4px;
}
.droppable-area {
  border: 2px dashed #ccc;
  transition: border-color 0.3s;
}
.droppable-area:hover {
  border-color: #007bff;
}
.empty-pile-text {
    width: 100%;
    text-align: center;
    color: #aaa;
    font-style: italic;
    padding: 20px 0;
}
.arranged-piles {
  display: flex;
  flex-direction: column; /* 改为垂直排列墩位 */
  gap: 10px; /* 墩位之间的间隔 */
  margin-bottom: 15px;
}
.pile {
  border: 1px solid #ddd;
  padding: 10px;
  min-width: 280px; /* 适应5张牌+文字 */
  width: fit-content; /* 宽度自适应内容 */
  max-width: 100%;
  background-color: #fff;
  border-radius: 5px;
}
.pile p {
  margin-top: 0;
  margin-bottom: 5px;
  font-weight: bold;
  color: #555;
}
.actions-container {
    margin-top: 15px;
    display: flex;
    gap: 10px;
}
.action-button, .submit-button {
  padding: 10px 15px;
  font-size: 1em;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.2s;
}
.action-button {
  background-color: #17a2b8; /* 青色 */
}
.action-button:hover:not(:disabled) {
  background-color: #138496;
}
.submit-button {
  background-color: #28a745; /* 绿色 */
}
.submit-button:hover:not(:disabled) {
  background-color: #218838;
}
.action-button:disabled, .submit-button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}
.error-message {
  color: red;
  margin-top: 10px;
  font-weight: bold;
}
.card.selected { /* Card.vue 中的 selected 样式会被应用 */
  outline: 3px solid #007bff;
  outline-offset: 1px;
  box-shadow: 0 0 12px rgba(0, 123, 255, 0.7);
}

/* 使墩内的牌水平排列 */
.pile .hand-row {
    justify-content: flex-start; /* 从左开始排列 */
}
</style>
