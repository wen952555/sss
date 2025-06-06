<template>
  <div class="player-hand-organizer-compact">
    <!-- <h4>
      摆牌区
      <span v-if="selectedCard" class="selected-card-indicator">
        (已选: <Card :card="selectedCard" :is-face-up="true" class="inline-card"/> - 点击目标墩放置)
      </span>
    </h4> -->

    <div class="arranged-piles-compact">
      <!-- 头墩 -->
      <div class="pile front-pile droppable-area" @click="handleClickPile('front')">
        <p>头墩 (3张) - {{ gameStore.arrangedHand.front.length }}/3</p>
        <div class="hand-row">
          <Card
            v-for="(card, index) in gameStore.arrangedHand.front"
            :key="`front-${card.id}`"
            :card="card"
            :is-face-up="true"
            :selected="selectedCard && selectedCard.id === card.id && selectedCardOrigin?.pileName === 'front'"
            @click.stop="handleClickCardInPile('front', card, index)"
          />
        </div>
      </div>

      <!-- 新的手牌区 (原中墩位置) -->
      <div class="pile hand-zone-pile droppable-area" @click="handleClickPile('myHand')">
        <p>
            手牌区 ({{ gameStore.myHand.length }}张)
            <span v-if="selectedCard" class="selected-card-indicator-inline">
                - 已选: <Card :card="selectedCard" :is-face-up="true" class="inline-card-small"/>
            </span>
        </p>
        <div class="hand-row main-hand-display">
          <Card
            v-for="(card, index) in gameStore.myHand"
            :key="`myhand-${card.id}`"
            :card="card"
            :is-face-up="true"
            :selected="selectedCard && selectedCard.id === card.id && selectedCardOrigin?.pileName === 'myHand'"
            @click.stop="handleClickCardInMyHand(card, index)"
          />
          <div v-if="gameStore.myHand.length === 0 && !selectedCard" class="empty-pile-text">从墩可移回此处</div>
        </div>
      </div>

      <!-- 尾墩 -->
      <div class="pile back-pile droppable-area" @click="handleClickPile('back')">
        <p>尾墩 (5张) - {{ gameStore.arrangedHand.back.length }}/5</p>
        <div class="hand-row">
          <Card
            v-for="(card, index) in gameStore.arrangedHand.back"
            :key="`back-${card.id}`"
            :card="card"
            :is-face-up="true"
            :selected="selectedCard && selectedCard.id === card.id && selectedCardOrigin?.pileName === 'back'"
            @click.stop="handleClickCardInPile('back', card, index)"
          />
        </div>
      </div>
    </div>

    <div class="actions-container">
        <button @click="autoArrangeSimple" :disabled="initialHandCount !== 13 || !gameStore.canSubmitHand" class="action-button">
            简单自动摆牌
        </button>
        <button @click="submitHandWrapper" :disabled="!canSubmitEffectively" class="submit-button">
        提交牌型
        </button>
    </div>
    <p v-if="gameStore.error || clientError" class="error-message">{{ gameStore.error || clientError }}</p>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useGameStore } from '../store/game';
import Card from './Card.vue';

const gameStore = useGameStore();
const selectedCard = ref(null);
const selectedCardOrigin = ref(null); // { pileName: 'myHand' | 'front' | 'middle' | 'back', index: number, cardId: string }
const clientError = ref(null);
const initialHandCount = ref(0); // 用于自动摆牌按钮的状态

const pileLimits = { front: 3, middle: 5, back: 5 }; // myHand (新的手牌区) 没有上限，直到13张

// 监视 gameState.myHand 的变化，以更新 initialHandCount (主要用于发牌后)
watch(() => gameStore.myHand, (newHand) => {
    if (newHand && newHand.length === 13 && gameStore.arrangedHand.front.length === 0 && gameStore.arrangedHand.middle.length === 0 && gameStore.arrangedHand.back.length === 0) {
        initialHandCount.value = 13;
    } else if (newHand && newHand.length === 0 && gameStore.arrangedHand.front.length > 0) {
        // 如果手牌区空了，但墩里有牌，说明已经开始摆了
        initialHandCount.value = 0; // 或者保持为13，如果自动摆牌允许从墩开始
    }
}, { immediate: true, deep: true });


function setClientError(message) {
    clientError.value = message;
    setTimeout(() => { clientError.value = null; }, 3000);
}

// 点击新的“手牌区”中的牌
function handleClickCardInMyHand(card, index) {
  if (selectedCard.value && selectedCard.value.id === card.id && selectedCardOrigin.value?.pileName === 'myHand') {
    selectedCard.value = null;
    selectedCardOrigin.value = null;
  } else {
    selectedCard.value = card;
    selectedCardOrigin.value = { pileName: 'myHand', index, cardId: card.id };
  }
}

// 点击某个墩里的牌 (头墩/尾墩)
function handleClickCardInPile(pileName, card, index) {
  if (selectedCard.value) { // 如果有已选中的牌
    // 尝试将选中的牌放入此墩 (如果此墩不是选中牌的来源)
    if (selectedCardOrigin.value && selectedCardOrigin.value.pileName !== pileName) {
      if (gameStore.arrangedHand[pileName].length < pileLimits[pileName]) {
        const success = gameStore.moveCard(
          selectedCard.value,
          selectedCardOrigin.value.pileName,
          pileName,
          selectedCardOrigin.value.index
        );
        if (success) {
            selectedCard.value = null;
            selectedCardOrigin.value = null;
        } else {
            setClientError(`无法将牌放入 ${pileName}`);
        }
      } else {
        setClientError(`墩位 ${pileName} 已满！`);
      }
    } else if (selectedCardOrigin.value && selectedCardOrigin.value.pileName === pileName && selectedCard.value.id === card.id) {
        // 重复点击同一个墩里已选中的牌，取消选择
        selectedCard.value = null;
        selectedCardOrigin.value = null;
    } else if (selectedCardOrigin.value && selectedCardOrigin.value.pileName === pileName && selectedCard.value.id !== card.id) {
        // 点击同一个墩里另一张未选中的牌，切换选择（如果需要这个行为）
        // 或者，将这张牌移回手牌区（当前选择）
        gameStore.moveCard(card, pileName, 'myHand', index);
    }

  } else { // 如果没有选中的牌
    // 将点击的这张墩牌移回“手牌区”(myHand)
    gameStore.moveCard(card, pileName, 'myHand', index);
  }
}

// 点击墩的空白区域 (头/尾/新的手牌区)
function handleClickPile(targetPileName) {
  if (selectedCard.value && selectedCardOrigin.value) {
    const sourcePileName = selectedCardOrigin.value.pileName;

    if (sourcePileName === targetPileName) { // 点击了选中牌所在墩的空白区域
        selectedCard.value = null; // 取消选择
        selectedCardOrigin.value = null;
        return;
    }

    if (targetPileName === 'myHand') { // 目标是新的手牌区
      gameStore.moveCard(
        selectedCard.value,
        sourcePileName,
        'myHand',
        selectedCardOrigin.value.index
      );
      selectedCard.value = null;
      selectedCardOrigin.value = null;
    } else { // 目标是头墩或尾墩
      if (gameStore.arrangedHand[targetPileName].length < pileLimits[targetPileName]) {
        const success = gameStore.moveCard(
          selectedCard.value,
          sourcePileName,
          targetPileName,
          selectedCardOrigin.value.index
        );
        if (success) {
            selectedCard.value = null;
            selectedCardOrigin.value = null;
        } else {
             setClientError(`无法将牌放入 ${targetPileName}`);
        }
      } else {
        setClientError(`墩位 ${targetPileName} 已满！`);
      }
    }
  }
  // 如果没有选中牌，点击墩的空白区域不执行任何操作 (除非是手牌区空白，那由handleClickCardInMyHand处理)
}


const canSubmitEffectively = computed(() => {
  return gameStore.canSubmitHand &&
         gameStore.arrangedHand.front.length === pileLimits.front &&
         // 中墩现在是手牌区，不参与这个判断
         gameStore.arrangedHand.back.length === pileLimits.back &&
         gameStore.myHand.length === (13 - pileLimits.front - pileLimits.back); // 手牌区剩余牌数应为 13 - 3 - 5 = 5
});

async function submitHandWrapper() {
    // 提交时，需要将 myHand (新的手牌区)的内容视为中墩
    if (gameStore.myHand.length !== 5) {
        setClientError("手牌区（中墩）必须有5张牌才能提交。");
        return;
    }
    if (gameStore.arrangedHand.front.length !== 3 || gameStore.arrangedHand.back.length !== 5) {
        setClientError("头墩或尾墩牌数不正确。");
        return;
    }
    if (!gameStore.canSubmitHand) {
        setClientError("当前不能提交牌型。");
        return;
    }

    clientError.value = null;
    // 构建提交数据时，将 myHand 作为 middle
    const handToSubmitLogic = {
        front: gameStore.arrangedHand.front.map(c => c.id),
        middle: gameStore.myHand.map(c => c.id), // myHand 现在是中墩
        back: gameStore.arrangedHand.back.map(c => c.id),
    };

    // 调用 store 中的 action，但传递正确的墩牌数据
    gameStore.isLoading = true;
    gameStore.error = null;
    try {
        const response = await api.submitHand(gameStore.gameId, gameStore.playerId, handToSubmitLogic);
        if (response.success) {
            await gameStore.fetchGameState();
        } else {
            gameStore.error = response.error || '提交牌型失败';
        }
    } catch (err) {
        gameStore.error = err.message || '提交牌型时发生网络错误';
    } finally {
        gameStore.isLoading = false;
    }
}

function autoArrangeSimple() {
    if (initialHandCount.value !== 13) {
        setClientError("请等待发牌完毕 (13张手牌)。");
        return;
    }
    // 确保所有牌都在myHand (新的手牌区)
    ['front', 'back'].forEach(pileName => {
        while(gameStore.arrangedHand[pileName].length > 0) {
            gameStore.moveCard(gameStore.arrangedHand[pileName][0], pileName, 'myHand', 0);
        }
    });
    // 如果中墩之前有牌 (理论上不应该，因为中墩现在是 myHand)，也移回
    // while(gameStore.arrangedHand.middle.length > 0) {
    //    gameStore.moveCard(gameStore.arrangedHand.middle[0], 'middle', 'myHand', 0);
    // }


    const sortedHandForAuto = [...gameStore.myHand].sort((a, b) => a.rank - b.rank);
    
    // 清空 store 中的 myHand，因为 moveCard 会从中取牌
    gameStore.myHand.length = 0;
    sortedHandForAuto.forEach(card => gameStore.myHand.push(card)); // 重新填充，确保顺序

    // 摆放
    for (let i = 0; i < 3; i++) { // 头墩
        if (gameStore.myHand.length > 0) gameStore.moveCard(gameStore.myHand[0], 'myHand', 'front', 0);
    }
    // 中墩的5张牌会留在myHand区域
    // 尾墩的5张牌 (取myHand中剩余牌的后5张)
    // 此时 myHand 应该有 13-3 = 10 张牌
    const cardsForBack = gameStore.myHand.slice(gameStore.myHand.length - 5);
    for (const card of cardsForBack.reverse()) { // 从尾部开始取，放到尾墩
        const idx = gameStore.myHand.findIndex(c => c.id === card.id);
        if (idx !== -1) gameStore.moveCard(gameStore.myHand[idx], 'myHand', 'back', idx);
    }

    selectedCard.value = null;
    selectedCardOrigin.value = null;
    initialHandCount.value = 0; // 摆牌后重置
}

</script>

<style scoped>
.player-hand-organizer-compact {
  padding: 10px;
  background-color: #f0f8ff; /* 淡蓝色背景 */
  border-radius: 8px;
}
.selected-card-indicator-inline {
  font-size: 0.85em;
  color: #007bff;
  font-weight: normal;
}
.inline-card-small {
    transform: scale(0.5);
    margin: -15px -20px;
    vertical-align: middle;
}

.arranged-piles-compact {
  display: flex;
  flex-direction: column; /* 头墩、手牌区、尾墩垂直排列 */
  gap: 12px;
  margin-bottom: 15px;
  align-items: center; /* 居中显示各个墩 */
}
.pile {
  border: 1px solid #b0c4de; /* 淡钢蓝色边框 */
  padding: 8px;
  background-color: #fff;
  border-radius: 6px;
  width: 90%; /* 墩位宽度 */
  max-width: 550px; /* 最大宽度，防止在大屏幕上过宽 */
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}
.pile p {
  margin-top: 0;
  margin-bottom: 8px;
  font-weight: bold;
  color: #4682b4; /* 钢蓝色文字 */
  font-size: 0.95em;
  text-align: center;
}
.hand-row {
  display: flex;
  flex-wrap: wrap;
  min-height: 90px; /* 适应卡牌高度 */
  justify-content: center; /* 卡牌居中 */
  padding: 5px 0;
}
.main-hand-display { /* 新的手牌区特别样式 */
    min-height: 100px; /* 可以放更多牌 */
    border: 2px dashed #77aaff; /* 更明显的边框 */
    background-color: #f8fcff;
}
.main-hand-display .card, .pile .card {
    margin: 2px; /* 统一卡牌间距 */
}

.droppable-area:hover {
  border-color: #4682b4;
  background-color: #f0f8ff;
}
.empty-pile-text {
    width: 100%;
    text-align: center;
    color: #aaa;
    font-style: italic;
    padding: 15px 0;
}
.actions-container {
    margin-top: 15px;
    display: flex;
    justify-content: center;
    gap: 15px;
}
.action-button, .submit-button {
  padding: 10px 20px; /* 按钮稍大一些 */
}
.error-message {
  text-align: center;
}
.card.selected {
  outline: 3px solid #ff4500; /* 橙红色选择框 */
  outline-offset: 0px;
  transform: translateY(-3px); /* 轻微上浮 */
  box-shadow: 0 4px 8px rgba(255, 69, 0, 0.4);
}
</style>
