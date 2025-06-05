<template>
  <div id="thirteen-water-app-modular" class="game-container-modular">
    <header class="app-header-modular">
      <h1>十三水在线对战</h1>
      <div class="header-info-modular">
        <p>牌桌模式 - 模块化添加</p>
      </div>
    </header>

    <main class="game-board-layout-modular">
      <!-- 第1道 -->
      <section class="layout-row-modular status-banner-row-modular" style="height: 10%;">
        <div class="placeholder-text">第一道：玩家状态区</div>
      </section>

      <!-- 第2道 -->
      <section class="layout-row-modular card-dun-row-modular" style="height: 25%;">
        <div class="dun-label placeholder-text semi-transparent-text">头道</div>
        <div class="dun-cards-area"></div>
      </section>

      <!-- 第3道: 手牌区 -->
      <section ref="handDisplayContainerRef" class="layout-row-modular card-dun-row-modular hand-display-section" style="height: 25%;">
        <div class="dun-label placeholder-text semi-transparent-text">手牌</div>
        <div class="dun-cards-area stacked-hand-display-area">
          <!-- 卡牌显示 -->
          <CardDisplay 
            v-for="(card, index) in gameStore.currentHand" 
            :key="card.id" 
            :card="card"
            class="stacked-card"
            :style="getStackedCardStyle(index, gameStore.currentHand.length)"
          />
          <!-- 如果没有牌且不在加载中，显示提示 -->
          <p v-if="gameStore.currentHand.length === 0 && !gameStore.isLoading && !gameStore.error" class="placeholder-text">
            点击下方 "试玩" 获取手牌
          </p>
           <p v-if="gameStore.isLoading" class="placeholder-text">正在获取手牌...</p>
           <p v-if="gameStore.error" class="placeholder-text error-text">获取手牌失败: {{ gameStore.error }}</p>
        </div>
      </section>

      <!-- 第4道 -->
      <section class="layout-row-modular card-dun-row-modular" style="height: 25%;">
        <div class="dun-label placeholder-text semi-transparent-text">尾道</div>
        <div class="dun-cards-area"></div>
      </section>
      
      <!-- 第5道 -->
      <section class="layout-row-modular button-action-row-modular" style="height: 15%;">
        <div class="button-area-content-modular">
          <button @click="handleTryPlay" :disabled="gameStore.isLoading">
            {{ gameStore.currentHand.length > 0 ? '重新试玩 (换牌)' : '试玩 (获取手牌)' }}
          </button>
        </div>
      </section>
    </main>

    <footer class="app-footer-modular">
      <p>简易十三水游戏</p>
    </footer>
  </div>
</template>

<script setup>
// ... (import 与上一版相同) ...
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useGameStore } from './stores/gameStore';
import CardDisplay from './components/CardDisplay.vue';

const gameStore = useGameStore();
const handDisplayContainerRef = ref(null); 
const handDisplayContainerHeight = ref(0); 
const handDisplayContainerWidth = ref(0); // 保留宽度，以防万一计算需要

// ... (CARD_ASPECT_RATIO, NUM_CARDS_IN_HAND, PADDING 常量与上一版相同) ...
const CARD_ASPECT_RATIO = 60 / 90;
const HAND_AREA_HORIZONTAL_PADDING = 20; 
const HAND_AREA_VERTICAL_PADDING = 16;

const updateContainerDimensions = () => { /* ... (与上一版相同) ... */ };
onMounted(() => { /* ... (与上一版相同) ... */ });
onUnmounted(() => { /* ... (与上一版相同) ... */ });
watch(() => gameStore.currentHand, () => { /* ... (与上一版相同) ... */ }, { deep: true });
function getStackedCardStyle(index, totalCards) { /* ... (与上一版相同，确保这个函数没有错误) ... */ }


async function handleTryPlay() {
  console.log("[App.vue] handleTryPlay button clicked."); // 日志A
  try {
    await gameStore.fetchInitialHand();
    console.log("[App.vue] fetchInitialHand completed. Current hand count:", gameStore.currentHand.length); // 日志B
    if (gameStore.error) {
      console.error("[App.vue] Error after fetchInitialHand:", gameStore.error); // 日志C
    }
    // 确保在获取手牌后更新容器尺寸，以便样式计算正确
    nextTick(() => {
        updateContainerDimensions();
        // console.log("[App.vue] Container dimensions updated after fetching hand."); // 日志D
    });
  } catch (e) {
      console.error("[App.vue] Exception in handleTryPlay:", e); // 日志E
  }
}
</script>

<style>
/* ... (样式与上一版相同，确保 .stacked-hand-display-area 和 .stacked-card 的样式正确) ... */
.error-text { color: red; font-weight: bold; }
</style>
