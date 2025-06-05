<template>
  <div id="thirteen-water-app" class="game-container">
    <header class="app-header">
      <h1>十三水在线对战 (核心摆牌模式)</h1>
      <div class="header-info" v-if="gameStore.playerSessionId">
          会话ID: <small>{{ gameStore.playerSessionId.substring(0, 8) }}...</small>
      </div>
    </header>

    <main class="game-board-layout">
      <!-- 第1道: 各玩家状态横幅显示 (占10%) -->
      <section class="layout-row status-banner-row" style="height: 10%;">
        <div class="status-banner-content">
          <div v-if="gameStore.myPlayerDetails" class="player-status-summary">
            玩家: {{ gameStore.myPlayerDetails.name || '当前玩家' }} 
            (分数: {{ gameStore.myPlayerDetails.score || 0 }})
          </div>
          <div v-else-if="!gameStore.isLoading && (!gameStore.myCards || gameStore.myCards.length === 0)">请先获取手牌</div>
          <div v-else-if="gameStore.isLoading">状态加载中...</div>
        </div>
      </section>

      <!-- 第2道: 理牌区 - 头墩 (占25%) -->
      <section class="layout-row card-arrangement-dun front-dun-area" style="height: 25%;">
        <h4>头墩 (3张) <span v-if="arrangedCards.front.length > 0">- {{ FrontendGameLogic.getHandType(arrangedCards.front).name }}</span></h4>
        <div class="dun-cards-display">
            <CardDisplay v-for="card in arrangedCards.front" :key="'f-'+card.id" :card="card" @click="moveCardFromDunToAvailable('front', card)" class="clickable-card"/>
        </div>
        <button v-if="selectedAvailableCard && arrangedCards.front.length < 3" @click="placeSelectedCardInDun('front')" class="place-button">放入头墩</button>
        <p v-else-if="arrangedCards.front.length < 3" class="dun-placeholder">还需 {{3 - arrangedCards.front.length}} 张</p>
      </section>

      <!-- 第3道: 理牌区 - 中墩 (占25%) -->
      <section class="layout-row card-arrangement-dun mid-dun-area" style="height: 25%;">
        <h4>中墩 (5张) <span v-if="arrangedCards.mid.length > 0">- {{ FrontendGameLogic.getHandType(arrangedCards.mid).name }}</span></h4>
        <div class="dun-cards-display">
            <CardDisplay v-for="card in arrangedCards.mid" :key="'m-'+card.id" :card="card" @click="moveCardFromDunToAvailable('mid', card)" class="clickable-card"/>
        </div>
        <button v-if="selectedAvailableCard && arrangedCards.mid.length < 5" @click="placeSelectedCardInDun('mid')" class="place-button">放入中墩</button>
        <p v-else-if="arrangedCards.mid.length < 5" class="dun-placeholder">还需 {{5 - arrangedCards.mid.length}} 张</p>
      </section>

      <!-- 第4道: 理牌区 - 尾墩 (占25%) -->
      <section class="layout-row card-arrangement-dun back-dun-area" style="height: 25%;">
        <h4>尾墩 (5张) <span v-if="arrangedCards.back.length > 0">- {{ FrontendGameLogic.getHandType(arrangedCards.back).name }}</span></h4>
        <div class="dun-cards-display">
            <CardDisplay v-for="card in arrangedCards.back" :key="'b-'+card.id" :card="card" @click="moveCardFromDunToAvailable('back', card)" class="clickable-card"/>
        </div>
        <button v-if="selectedAvailableCard && arrangedCards.back.length < 5" @click="placeSelectedCardInDun('back')" class="place-button">放入尾墩</button>
        <p v-else-if="arrangedCards.back.length < 5" class="dun-placeholder">还需 {{5 - arrangedCards.back.length}} 张</p>
      </section>
      
      <!-- "待选牌区" - 这部分会在按钮区上方，逻辑上是理牌的一部分 -->
      <div class="available-cards-picker-area" v-if="availableCardsForPlacement.length > 0 && !handIsSubmitted">
          <h4>可选的牌 (点击选择一张，再点击上方墩的“放入”按钮):</h4>
          <div class="available-cards-list">
            <CardDisplay v-for="card in availableCardsForPlacement" :key="card.id" :card="card" :is-selected="selectedAvailableCard?.id === card.id" @select="toggleSelectAvailableCard(card)"/>
          </div>
      </div>
      <div v-if="牌墩错误提示" class="error-message-main">{{ 牌墩错误提示 }}</div>


      <!-- 第5道: 按钮区 (占15%) -->
      <section class="layout-row button-action-row" style="height: 15%;">
        <div class="button-area-content">
          <button @click="fetchNewHand" :disabled="gameStore.isLoading">
            {{手牌存在且未提交 ? '重新发牌' : '获取新手牌' }}
          </button>
          <button @click="submitArrangedHands" :disabled="!canSubmit" class="submit-final-button">
            {{ handIsSubmitted ? '已提交' : '确认提交牌型' }}
          </button>
           <button @click="resetArrangement" :disabled="handIsSubmitted || gameStore.isLoading || !手牌存在">重置摆牌</button>
        </div>
      </section>
    </main>

    <footer class="app-footer">
      <p>简易十三水游戏 - Vue & PHP</p>
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useGameStore } from './stores/gameStore';
import CardDisplay from './components/CardDisplay.vue';
import { GameLogic as FrontendGameLogic } from './utils/frontendGameLogic';

const gameStore = useGameStore();
const handIsSubmitted = ref(false);

const availableCardsForPlacement = ref([]); // 原来的 unassignedCards，表示当前可供选择放入墩的牌
const arrangedCards = ref({ front: [], mid: [], back: [] });
const selectedAvailableCard = ref(null); // 当前从 availableCardsForPlacement 选中的牌
const 牌墩错误提示 = ref('');

const 手牌存在 = computed(() => gameStore.myCards && gameStore.myCards.length === 13);
const 手牌存在且未提交 = computed(() => 手牌存在.value && !handIsSubmitted.value);


watch(() => gameStore.myCards, (newCards) => {
  if (newCards && newCards.length === 13) {
    // console.log("[App.vue] Watcher myCards: New cards received, resetting arrangement.");
    resetArrangement();
  } else if (!newCards || newCards.length === 0) {
    // console.log("[App.vue] Watcher myCards: Cards cleared, resetting arrangement.");
    resetArrangement(); // 也清空界面
  }
}, { deep: true });

function resetArrangement() {
  // console.log("[App.vue] resetArrangement called.");
  availableCardsForPlacement.value = gameStore.myCards ? [...gameStore.myCards].sort((a,b) => b.value - a.value) : [];
  arrangedCards.value = { front: [], mid: [], back: [] };
  selectedAvailableCard.value = null;
  handIsSubmitted.value = false;
  牌墩错误提示.value = '';
}

function toggleSelectAvailableCard(card) {
  if (handIsSubmitted.value) return;
  if (selectedAvailableCard.value?.id === card.id) {
    selectedAvailableCard.value = null;
  } else {
    selectedAvailableCard.value = card;
  }
}

function placeSelectedCardInDun(dunName) {
  if (!selectedAvailableCard.value || handIsSubmitted.value) return;
  const dunLimit = dunName === 'front' ? 3 : 5;

  if (arrangedCards.value[dunName].length < dunLimit) {
    arrangedCards.value[dunName].push(selectedAvailableCard.value);
    availableCardsForPlacement.value = availableCardsForPlacement.value.filter(c => c.id !== selectedAvailableCard.value.id);
    selectedAvailableCard.value = null; // 放入后取消选择
    validateDuns();
  } else {
    alert(`${dunName === 'front' ? '头' : dunName === 'mid' ? '中' : '尾'}墩已满！`);
  }
}

function moveCardFromDunToAvailable(dunName, cardToMove) {
    if (handIsSubmitted.value) return;
    arrangedCards.value[dunName] = arrangedCards.value[dunName].filter(c => c.id !== cardToMove.id);
    availableCardsForPlacement.value.push(cardToMove);
    availableCardsForPlacement.value.sort((a,b) => b.value - a.value);
    // 从墩移回时不自动选中，让用户重新从available区选择
    selectedAvailableCard.value = null; 
    validateDuns();
}

const canSubmit = computed(() => {
    return arrangedCards.value.front.length === 3 &&
           arrangedCards.value.mid.length === 5 &&
           arrangedCards.value.back.length === 5 &&
           availableCardsForPlacement.value.length === 0 && // 所有牌都已分配
           !牌墩错误提示.value &&
           !handIsSubmitted.value;
});

function validateDuns() {
    牌墩错误提示.value = '';
    if (arrangedCards.value.front.length === 0 && arrangedCards.value.mid.length === 0 && arrangedCards.value.back.length === 0 && availableCardsForPlacement.value.length === 13) {
        return; // 初始状态或完全重置，不提示
    }
    if (arrangedCards.value.front.length === 3 && arrangedCards.value.mid.length === 5 && arrangedCards.value.back.length === 5) {
        const frontType = FrontendGameLogic.getHandType(arrangedCards.value.front);
        const midType = FrontendGameLogic.getHandType(arrangedCards.value.mid);
        const backType = FrontendGameLogic.getHandType(arrangedCards.value.back);

        if (FrontendGameLogic.compareHandTypes(frontType, midType) > 0) {
            牌墩错误提示.value = "倒水：头墩牌型不能大于中墩！"; return;
        }
        if (FrontendGameLogic.compareHandTypes(midType, backType) > 0) {
            牌墩错误提示.value = "倒水：中墩牌型不能大于尾墩！"; return;
        }
    } else {
        // 可以选择在这里提示墩牌数量不足，或者让各个墩的提示自行处理
    }
}
watch(arrangedCards, validateDuns, {deep: true});


async function submitArrangedHands() {
  if (!canSubmit.value) {
    if(牌墩错误提示.value) alert(`提交失败: ${牌墩错误提示.value}`);
    else alert("请确保所有牌墩都已正确摆放（头3，中5，尾5），且所有牌都已分配。");
    return;
  }
  await gameStore.submitArrangedHand(arrangedCards.value.front, arrangedCards.value.mid, arrangedCards.value.back);
  if (!gameStore.error) {
    handIsSubmitted.value = true;
  } else {
    alert(`提交时发生错误: ${gameStore.error}`);
  }
}

async function fetchNewHand() {
  await gameStore.fetchInitialHand(); // store会更新myCards, 触发watcher调用resetArrangement
}

onMounted(async () => {
    await gameStore.fetchInitialHand();
});

</script>

<style>
/* 全局 Reset 和基础样式 */
html, body { margin: 0; padding: 0; height: 100%; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f0f4f8; color: #333; }
#thirteen-water-app { display: flex; flex-direction: column; height: 100vh; max-width: 900px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 0 15px rgba(0,0,0,0.1); }
.app-header { padding: 10px 20px; background-color: #007bff; color: white; text-align: center; flex-shrink: 0; }
.app-header h1 { margin: 0; font-size: 1.5em; }
.header-info { margin-top: 3px; font-size: 0.75em; opacity: 0.9; }

.game-board-layout {
  flex-grow: 1; 
  display: flex;
  flex-direction: column;
  padding: 8px; 
  gap: 8px; /* 横幅之间的间隔 */
  overflow: hidden;
}

.layout-row {
  width: 100%;
  box-sizing: border-box; 
  /* border: 1px solid #e0e0e0;  */ /* 可以移除或保留用于调试 */
  padding: 5px; 
  display: flex; 
  flex-direction: column; 
  justify-content: center; 
  align-items: center; 
  background-color: #fdfdfd;
  border-radius: 3px;
  overflow: hidden;
}

.status-banner-row { /* 10% */
  flex-shrink: 0; /* 不被压缩 */
  flex-basis: 10%; /* 使用 flex-basis 来精确控制比例 */
  justify-content: space-around;
  flex-direction: row; 
}
.player-status-summary { padding: 3px 8px; border: 1px solid #ccc; border-radius: 3px; background-color: #fff; font-size: 0.8em; }

.card-arrangement-dun { /* 各墩25% */
  flex-shrink: 0;
  flex-basis: 23%; /* 稍微减小一点，给 unassigned-cards-area 留空间，总共接近 75% */
  align-items: center; /* 内容居中 */
  padding-top: 5px;
  border: 1px dashed #ccc; /* 区分墩区 */
}
.card-arrangement-dun h4 { font-size: 0.9em; margin: 0 0 5px 0; text-align: center; width: 100%; }
.dun-cards-display {
    display: flex;
    flex-wrap: wrap; 
    justify-content: center; 
    align-items: center;
    width: 100%;
    min-height: 65px; 
}
.dun-placeholder { font-size: 0.8em; color: #888; margin: 5px 0 0 0; }
.clickable-card { cursor: pointer; border: 1px solid transparent; }
.clickable-card:hover { border-color: #007bff; }
.place-button {
    font-size: 0.75em;
    padding: 2px 6px;
    margin-top: 3px;
    background-color: #f0f0f0;
    border: 1px solid #ccc;
    border-radius: 3px;
    cursor: pointer;
}
.place-button:disabled { background-color: #e9ecef; cursor: not-allowed; }


.available-cards-picker-area { /* 这部分逻辑上属于理牌区，放在按钮区上方 */
    flex-shrink: 0;
    flex-basis: auto; /* 高度由内容决定，或者给一个 flex-grow:1 来填充剩余 */
    padding: 8px; margin: 5px 0; border-radius: 4px;
    background-color: #e7f3ff;
    text-align: center;
    border: 1px solid #b8daff;
    min-height: 80px; /* 至少能显示一行牌 */
}
.available-cards-picker-area h4 { margin: 0 0 8px 0; font-size: 0.9em; }
.available-cards-list {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 2px;
}


.error-message-main { color: red; font-weight: bold; text-align: center; padding: 5px; font-size: 0.9em; width:100%;}


.button-action-row { /* 15% */
  flex-shrink: 0;
  flex-basis: 15%;
  flex-direction: row; 
  gap: 10px;
  align-items: center; /* 按钮垂直居中 */
}
.button-action-row button { font-size: 0.9em; padding: 8px 15px; }
.submit-final-button { background-color: #28a745; color:white;}
.submit-final-button:disabled { background-color: #ccc;}


.app-footer { padding: 8px 20px; text-align: center; font-size: 0.8em; color: #6c757d; border-top: 1px solid #eee; flex-shrink: 0; }
</style>
