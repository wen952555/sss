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
          <CardDisplay 
            v-for="(card, index) in gameStore.currentHand" 
            :key="card.id" 
            :card="card"
            class="stacked-card"
            :style="getStackedCardStyle(index, gameStore.currentHand.length)"
          />
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
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useGameStore } from './stores/gameStore';
import CardDisplay from './components/CardDisplay.vue';

const gameStore = useGameStore();
const handDisplayContainerRef = ref(null); 
const handDisplayContainerWidth = ref(0); 
const handDisplayContainerHeight = ref(0);

const CARD_ASPECT_RATIO = 60 / 90; 
const NUM_CARDS_IN_HAND = 13;
// 手牌区域左右总的内边距或期望的边距，用于计算有效宽度
const HAND_AREA_HORIZONTAL_PADDING = 20; 
// 手牌区域上下总的内边距或期望的边距，用于计算有效高度
const HAND_AREA_VERTICAL_PADDING = 10; 


const updateContainerDimensions = () => {
  if (handDisplayContainerRef.value) {
    handDisplayContainerWidth.value = handDisplayContainerRef.value.offsetWidth - HAND_AREA_HORIZONTAL_PADDING;
    handDisplayContainerHeight.value = handDisplayContainerRef.value.offsetHeight - HAND_AREA_VERTICAL_PADDING;
    // console.log(`Hand display container effective W: ${handDisplayContainerWidth.value}, H: ${handDisplayContainerHeight.value}`);
  }
};

onMounted(() => { /* ... (与上一版相同) ... */ });
onUnmounted(() => { /* ... (与上一版相同) ... */ });
watch(() => gameStore.currentHand, () => { /* ... (与上一版相同) ... */ }, { deep: true });

function getStackedCardStyle(index, totalCards) {
  if (totalCards === 0 || handDisplayContainerWidth.value <= 0 || handDisplayContainerHeight.value <= 0) {
    return { opacity: 0, position: 'absolute' }; 
  }

  // 1. 以容器高度为基准，计算卡牌的理想高度和宽度
  let cardHeight = handDisplayContainerHeight.value; // 尝试占满容器可用高度
  let cardWidth = cardHeight * CARD_ASPECT_RATIO;

  // 2. 定义不同阶段的牌的可见宽度因子
  const wideVisibleFactor = 0.50; // 前面几张牌，希望露出自身宽度的 50%
  const mediumVisibleFactor = 0.35; // 中间几张牌，露出 35%
  const narrowVisibleFactor = 0.15; // 最后几张牌，露出 15% (可能只显示小半张)

  // 定义每个阶段有多少张牌 (这些值可以调整)
  const numWideCards = 5; // 前5张牌使用较宽的间距
  const numMediumCards = 5; // 接下来5张牌使用中等间距
  // 剩余的牌 (totalCards - numWideCards - numMediumCards) 将使用最窄的间距

  let stepX;
  if (index < numWideCards) {
    stepX = cardWidth * wideVisibleFactor;
  } else if (index < numWideCards + numMediumCards) {
    stepX = cardWidth * mediumVisibleFactor;
  } else {
    stepX = cardWidth * narrowVisibleFactor;
  }
  
  // 计算按照这种非均匀stepX排列后，理论上需要的总宽度
  let theoreticalTotalWidth = 0;
  if (totalCards > 0) {
    theoreticalTotalWidth = cardWidth; // 第一张牌的完整宽度
    for (let i = 1; i < totalCards; i++) {
      let currentStepX;
      if (i < numWideCards) {
        currentStepX = cardWidth * wideVisibleFactor;
      } else if (i < numWideCards + numMediumCards) {
        currentStepX = cardWidth * mediumVisibleFactor;
      } else {
        currentStepX = cardWidth * narrowVisibleFactor;
      }
      theoreticalTotalWidth += currentStepX;
    }
  }

  // 3. 如果理论总宽度超出了容器可用宽度，则按比例缩小所有东西 (卡牌大小和stepX)
  let scaleFactor = 1;
  if (theoreticalTotalWidth > handDisplayContainerWidth.value && handDisplayContainerWidth.value > 0) {
    scaleFactor = handDisplayContainerWidth.value / theoreticalTotalWidth;
    cardWidth *= scaleFactor;
    cardHeight *= scaleFactor; // 高度也按比例缩小以保持宽高比
    // stepX 也会在下面重新计算时因为 cardWidth 变小而自动变小
    // console.log(`Scaling needed. Scale factor: ${scaleFactor.toFixed(2)}. New cardWidth: ${cardWidth.toFixed(2)}`);
  }

  // 确保卡牌不会过小
  const minCardWidthThreshold = 20; 
  if (cardWidth < minCardWidthThreshold && totalCards > 0) { // 避免除以0
      const minScaleFactor = minCardWidthThreshold / (cardWidth / scaleFactor); // 恢复原始cardWidth再计算缩放
      cardWidth = minCardWidthThreshold;
      cardHeight = cardWidth / CARD_ASPECT_RATIO;
      scaleFactor = minScaleFactor; // 更新缩放因子，保证stepX也按此最小尺寸计算
      // console.log(`Card too small, enforced min width. New cardWidth: ${cardWidth}, New scaleFactor for stepX: ${scaleFactor}`);
  }


  // 4. 根据最终的 cardWidth 和缩放后的可见因子重新计算实际的 left 偏移
  // leftOffset 是累加的
  let currentLeftOffset = 0;
  for (let i = 0; i < index; i++) {
      let effectiveStepX;
      if (i < numWideCards -1) { // 注意这里是 numWideCards-1，因为第一张牌是完整的
          effectiveStepX = (cardWidth / scaleFactor) * wideVisibleFactor * scaleFactor; // 应用缩放
      } else if (i < numWideCards + numMediumCards -1) {
          effectiveStepX = (cardWidth / scaleFactor) * mediumVisibleFactor * scaleFactor;
      } else {
          effectiveStepX = (cardWidth / scaleFactor) * narrowVisibleFactor * scaleFactor;
      }
      // 如果因为缩放导致 stepX 过小，给一个保底值
      effectiveStepX = Math.max(effectiveStepX, cardWidth * 0.05); // 最少也偏移一点点
      currentLeftOffset += effectiveStepX;
  }


  return {
    position: 'absolute',
    left: `${currentLeftOffset}px`,
    top: '50%', 
    transform: 'translateY(-50%)',
    width: `${cardWidth}px`,
    height: `${cardHeight}px`,
    zIndex: index,
    boxShadow: '0px 1px 2px rgba(0,0,0,0.15)',
  };
}

async function handleTryPlay() { /* ... (与上一版相同) ... */ }
</script>

<style>
/* ... (全局样式与上一版相同) ... */
/* 手牌区（第3道横幅）的特殊样式 */
.hand-display-section .dun-cards-area {
  justify-content: flex-start; 
  /* padding-left and padding-right now effectively control the start of the stack and available space */
  /* The effective width for cards is handDisplayContainerWidth calculated in JS */
  /* Ensure cards can visually overflow if calculation makes them slightly wider than this CSS box in some edge cases, */
  /* but the layout-row-modular has overflow:hidden to clip it to the banner. */
  overflow: visible; /* Allow cards to be absolutely positioned correctly */
}

.stacked-card {
  /* border: 1px solid #777; */ /* 可以移除或保留用于调试 */
  /* background-color: white; */
  /* transition: left 0.1s ease-out, width 0.1s ease-out, height 0.1s ease-out; */ /* 移除过渡以避免计算干扰 */
}
/* 其他样式与上一版相同 */
</style>
