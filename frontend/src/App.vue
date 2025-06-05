<template>
  <div id="thirteen-water-app-modular" class="game-container-modular">
    <header class="app-header-modular">
      <h1>十三水在线对战</h1>
      <div class="header-info-modular">
        <p>牌桌模式 - 模块化添加</p>
      </div>
    </header>

    <main class="game-board-layout-modular">
      <!-- 第1道: 各玩家状态横幅显示 (占10%) -->
      <section class="layout-row-modular status-banner-row-modular" style="height: 10%;">
        <div class="placeholder-text">第一道：玩家状态区</div>
        <!-- 你可以根据需要填充实际的玩家状态显示 -->
      </section>

      <!-- 第2道: 理牌区 - 头道 (占25%) -->
      <section class="layout-row-modular card-dun-row-modular" style="height: 25%;">
        <div class="dun-label placeholder-text semi-transparent-text">头道</div>
        <div class="dun-cards-area">
          <!-- 这里将来会放头道的牌 -->
        </div>
      </section>

      <!-- 第3道: 理牌区 - 手牌 (占25%) -->
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

      <!-- 第4道: 理牌区 - 尾道 (占25%) -->
      <section class="layout-row-modular card-dun-row-modular" style="height: 25%;">
        <div class="dun-label placeholder-text semi-transparent-text">尾道</div>
        <div class="dun-cards-area">
          <!-- 这里将来会放尾道的牌 -->
        </div>
      </section>
      
      <!-- 第5道: 按钮区 (占15%) -->
      <section class="layout-row-modular button-action-row-modular" style="height: 15%;">
        <div class="button-area-content-modular">
          <button @click="handleTryPlay" :disabled="gameStore.isLoading">
            {{ gameStore.currentHand.length > 0 ? '重新试玩 (换牌)' : '试玩 (获取手牌)' }}
          </button>
          <!-- 以后可以添加更多按钮，例如提交牌型 -->
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
import { useGameStore } from './stores/gameStore'; // 确保路径正确
import CardDisplay from './components/CardDisplay.vue'; // 确保路径正确

const gameStore = useGameStore();
const handDisplayContainerRef = ref(null); 
const handDisplayContainerWidth = ref(0); 
const handDisplayContainerHeight = ref(0);

const CARD_ASPECT_RATIO = 60 / 90; 
const NUM_CARDS_IN_HAND = 13;
const HAND_AREA_HORIZONTAL_PADDING = 20; 
const HAND_AREA_VERTICAL_PADDING = 10; 


const updateContainerDimensions = () => {
  if (handDisplayContainerRef.value) {
    handDisplayContainerWidth.value = handDisplayContainerRef.value.offsetWidth - HAND_AREA_HORIZONTAL_PADDING;
    handDisplayContainerHeight.value = handDisplayContainerRef.value.offsetHeight - HAND_AREA_VERTICAL_PADDING;
  }
};

onMounted(() => {
  nextTick(updateContainerDimensions);
  window.addEventListener('resize', updateContainerDimensions);
});
onUnmounted(() => { window.removeEventListener('resize', updateContainerDimensions); });
watch(() => gameStore.currentHand, () => { nextTick(updateContainerDimensions); }, { deep: true });


function getStackedCardStyle(index, totalCards) {
  if (totalCards === 0 || handDisplayContainerWidth.value <= 0 || handDisplayContainerHeight.value <= 0) {
    return { opacity: 0, position: 'absolute' }; 
  }

  let cardHeight = handDisplayContainerHeight.value;
  let cardWidth = cardHeight * CARD_ASPECT_RATIO;

  const minVisiblePartFactor = 0.20; 
  let calculatedCardWidth = handDisplayContainerWidth.value / (1 + (totalCards - 1) * minVisiblePartFactor);
  
  if ((calculatedCardWidth / CARD_ASPECT_RATIO) > handDisplayContainerHeight.value && handDisplayContainerHeight.value > 0) {
      calculatedCardWidth = handDisplayContainerHeight.value * CARD_ASPECT_RATIO;
  }
  
  cardWidth = calculatedCardWidth;
  cardHeight = cardWidth / CARD_ASPECT_RATIO;

  const minCardWidthThreshold = 20; // 可以适当调小一点，看效果
  if (cardWidth < minCardWidthThreshold && totalCards > 0) {
      const originalCardWidthForMinScale = minCardWidthThreshold / CARD_ASPECT_RATIO > handDisplayContainerHeight.value ? 
                                          handDisplayContainerHeight.value * CARD_ASPECT_RATIO : minCardWidthThreshold;
      cardWidth = originalCardWidthForMinScale;
      cardHeight = cardWidth / CARD_ASPECT_RATIO;
  }
  
  let stepX;
  if (totalCards <= 1) {
    stepX = cardWidth; 
  } else {
    stepX = (handDisplayContainerWidth.value - cardWidth) / (totalCards - 1);
  }
  stepX = Math.max(stepX, cardWidth * 0.10); 
  stepX = Math.min(stepX, cardWidth * 0.5); // 限制最大间距，避免过于分散，比如最多露出50% 

  // 非均匀 stepX 的逻辑 (如上一版)
  const wideVisibleFactor = 0.50; 
  const mediumVisibleFactor = 0.35; 
  const narrowVisibleFactor = 0.20; // 调整最后几张牌的可见度

  const numWideCards = Math.floor(totalCards * 0.4); // 例如前40%的牌
  const numMediumCards = Math.floor(totalCards * 0.4); // 中间40%

  let effectiveStepX;
  if (index < numWideCards) {
    effectiveStepX = cardWidth * wideVisibleFactor;
  } else if (index < numWideCards + numMediumCards) {
    effectiveStepX = cardWidth * mediumVisibleFactor;
  } else {
    effectiveStepX = cardWidth * narrowVisibleFactor;
  }

  // 重新计算总宽度并按需缩放 stepX
  let theoreticalTotalWidth = cardWidth; // 第一张牌
  for(let i = 1; i < totalCards; i++) {
      let tempStepX;
      if (i < numWideCards) tempStepX = cardWidth * wideVisibleFactor;
      else if (i < numWideCards + numMediumCards) tempStepX = cardWidth * mediumVisibleFactor;
      else tempStepX = cardWidth * narrowVisibleFactor;
      theoreticalTotalWidth += tempStepX;
  }

  if (theoreticalTotalWidth > handDisplayContainerWidth.value && handDisplayContainerWidth.value > 0 && totalCards > 1) {
      const общейШириныДляСжатия = theoreticalTotalWidth - cardWidth; // 总的需要压缩的偏移量
      const доступнойШириныДляСжатия = handDisplayContainerWidth.value - cardWidth;
      const compressionFactor = доступнойШириныДляСжатия / общейШириныДляСжатия;
      
      if (index < numWideCards) effectiveStepX *= compressionFactor;
      else if (index < numWideCards + numMediumCards) effectiveStepX *= compressionFactor;
      else effectiveStepX *= compressionFactor;
      
      effectiveStepX = Math.max(effectiveStepX, cardWidth * 0.08); // 再次确保最小可见部分
  }


  let currentLeftOffset = 0;
  for (let i = 0; i < index; i++) {
      let stepForThisCard;
      if (i < numWideCards ) { // 注意边界条件，第一张牌后开始计算step
          stepForThisCard = cardWidth * wideVisibleFactor;
      } else if (i < numWideCards + numMediumCards ) {
          stepForThisCard = cardWidth * mediumVisibleFactor;
      } else {
          stepForThisCard = cardWidth * narrowVisibleFactor;
      }
      if (theoreticalTotalWidth > handDisplayContainerWidth.value && handDisplayContainerWidth.value > 0 && totalCards > 1) {
          const общейШириныДляСжатия = theoreticalTotalWidth - cardWidth;
          const доступнойШириныДляСжатия = handDisplayContainerWidth.value - cardWidth;
          const compressionFactor = доступнойШириныДляСжатия / общейШириныДляСжатия;
          stepForThisCard *= compressionFactor;
          stepForThisCard = Math.max(stepForThisCard, cardWidth * 0.08);
      }
      currentLeftOffset += stepForThisCard;
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

async function handleTryPlay() {
  await gameStore.fetchInitialHand();
  nextTick(updateContainerDimensions); 
}
</script>

<style>
/* 全局 Reset 和基础样式与上一版相同 */
html, body { margin: 0; padding: 0; height: 100%; width: 100%; overflow: hidden; background-color: #f0f4f8; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; }
#thirteen-water-app-modular { display: flex; flex-direction: column; height: 100vh; width: 100vw; box-sizing: border-box; }
.app-header-modular { padding: 10px 20px; background-color: #007bff; color: white; text-align: center; flex-shrink: 0; }
.app-header-modular h1 { margin: 0; font-size: 1.5em; }
.header-info-modular { margin-top: 3px; font-size: 0.75em; opacity: 0.9; }

.game-board-layout-modular { flex-grow: 1; display: flex; flex-direction: column; width: 100%; height: 100%; padding: 5px; gap: 5px; box-sizing: border-box; overflow: hidden; }
.layout-row-modular { width: 100%; box-sizing: border-box; border: 1px dashed #d0d0d0; padding: 8px; display: flex; flex-direction: column; justify-content: center; align-items: center; background-color: #f9f9f9; border-radius: 3px; position: relative; overflow: hidden; }

.placeholder-text { color: #aaa; font-style: italic; font-size: 0.9em; }
.semi-transparent-text { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 3em; color: rgba(0, 0, 0, 0.05); font-weight: bold; z-index: 0; pointer-events: none; white-space: nowrap; }

.status-banner-row-modular { flex-shrink: 0; }
.card-dun-row-modular { flex-shrink: 0; justify-content: center; align-items: center; }
.dun-label { width: 100%; text-align: center; margin-bottom: 5px; font-weight: bold; color: #555; z-index: 2; position: relative; }

.dun-cards-area {
  display: flex; 
  align-items: center; 
  width: 100%; 
  height: 100%; 
  position: relative; 
  box-sizing: border-box;
}

.hand-display-section .dun-cards-area {
  justify-content: flex-start; 
  padding-left: 10px; 
  padding-right: 10px; 
}

.stacked-card {
  /* 确保 CardDisplay.vue 中的根元素没有设置 position:absolute */
  /* border: 1px solid #777; */ /* 调试用 */
  /* background-color: white; */ /* 调试用 */
}

.button-action-row-modular { flex-shrink: 0; flex-direction: row; gap: 10px; align-items: center; }
.button-action-row-modular button { font-size: 0.9em; padding: 8px 15px; background-color: #007bff; color:white; border:none; border-radius: 4px; cursor:pointer; }
.button-action-row-modular button:disabled { background-color: #ccc; }
.app-footer-modular { padding: 8px 20px; text-align: center; font-size: 0.8em; color: #6c757d; border-top: 1px solid #eee; flex-shrink: 0; }
</style>
