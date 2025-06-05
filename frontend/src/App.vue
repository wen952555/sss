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
const handDisplayContainerHeight = ref(0);
// 移除了 handDisplayContainerWidth 作为主要驱动因素，因为 stepX 将更固定

const CARD_ASPECT_RATIO = 60 / 90; 
const NUM_CARDS_IN_HAND = 13;
const HAND_AREA_VERTICAL_PADDING = 16; // 上下各8px的padding

const updateContainerHeight = () => { // 只更新高度，宽度由牌堆自然决定
  if (handDisplayContainerRef.value) {
    handDisplayContainerHeight.value = handDisplayContainerRef.value.offsetHeight - HAND_AREA_VERTICAL_PADDING;
    // console.log(`Hand display container effective H: ${handDisplayContainerHeight.value}`);
  }
};

onMounted(() => {
  nextTick(updateContainerHeight);
  window.addEventListener('resize', updateContainerHeight);
});
onUnmounted(() => { window.removeEventListener('resize', updateContainerHeight); });
watch(() => gameStore.currentHand, () => { nextTick(updateContainerHeight); }, { deep: true });


function getStackedCardStyle(index, totalCards) {
  if (totalCards === 0 || handDisplayContainerHeight.value <= 0) {
    return { opacity: 0, position: 'absolute' }; 
  }

  // 1. 以容器高度为基准，计算卡牌的理想高度和宽度
  let cardHeight = handDisplayContainerHeight.value;
  let cardWidth = cardHeight * CARD_ASPECT_RATIO;

  // 确保卡牌不会过小或过大 (可以根据需要设置阈值)
  const minCardWidth = 30;
  const maxCardWidth = 70; // 例如，不超过一个标准卡牌宽度
  if (cardWidth < minCardWidth) {
      cardWidth = minCardWidth;
      cardHeight = cardWidth / CARD_ASPECT_RATIO;
  }
  if (cardWidth > maxCardWidth) {
      cardWidth = maxCardWidth;
      cardHeight = cardWidth / CARD_ASPECT_RATIO;
  }
  
  // 2. 定义每张牌（除了最后一张）露出的固定宽度 (stepX)
  // 你说“每张只显示左边的1厘米的宽度”，我们用牌宽的一个比例来模拟
  // 例如，如果牌宽是60px，我们希望露出15px (大约是宽度的25%)
  const visiblePartOfCardFactor = 0.20; // 每张牌露出自身宽度的20%
  let stepX = cardWidth * visiblePartOfCardFactor;

  // 如果是最后一张牌，它不需要为下一张牌留出偏移，但它的left值仍然是基于前面的累加
  // 对于除了最后一张牌之外的所有牌，它们的"贡献宽度"是stepX
  // 最后一张牌会完整显示它的cardWidth (从它的left点开始)
  
  // 计算当前牌的 left offset
  // 第一张牌 (index 0) 的 left 是 0
  // 第二张牌 (index 1) 的 left 是 stepX
  // 第三张牌 (index 2) 的 left 是 2 * stepX, 以此类推
  const leftOffset = index * stepX;

  return {
    position: 'absolute',
    left: `${leftOffset}px`,
    top: '50%', 
    transform: 'translateY(-50%)', // 垂直居中
    width: `${cardWidth}px`,
    height: `${cardHeight}px`,
    zIndex: index, // 后发的牌在上面
    boxShadow: '0px 1px 2px rgba(0,0,0,0.15)',
  };
}

async function handleTryPlay() { /* ... (与上一版相同) ... */ }
</script>

<style>
/* 全局 Reset 和基础样式与上一版相同 */
html, body { margin: 0; padding: 0; height: 100%; width: 100%; overflow: hidden; background-color: #f0f4f8; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; }
#thirteen-water-app-modular { display: flex; flex-direction: column; height: 100vh; width: 100vw; box-sizing: border-box; }
.app-header-modular { padding: 10px 20px; background-color: #007bff; color: white; text-align: center; flex-shrink: 0; }
.app-header-modular h1 { margin: 0; font-size: 1.5em; }
.header-info-modular { margin-top: 3px; font-size: 0.75em; opacity: 0.9; }

.game-board-layout-modular { flex-grow: 1; display: flex; flex-direction: column; width: 100%; height: 100%; padding: 5px; gap: 5px; box-sizing: border-box; overflow: hidden; }
.layout-row-modular { width: 100%; box-sizing: border-box; border: 1px dashed #d0d0d0; padding: 8px; display: flex; flex-direction: column; justify-content: center; align-items: center; background-color: #f9f9f9; border-radius: 3px; position: relative; overflow: hidden; /* 对于手牌区，如果牌堆超出，会被这里裁剪 */ }

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

/* 手牌区（第3道横幅）的特殊样式 */
.hand-display-section .dun-cards-area {
  justify-content: flex-start; /* 卡牌从左边开始堆叠 */
  padding-left: 10px; /* 给第一张牌的左边留出一点边距 */
  padding-right: 10px; /* 也给右边留点边距，以防最后一张牌贴边 */
  /* overflow: hidden; /* 确保如果牌堆太宽，超出部分被裁剪 */
}

.stacked-card {
  /* CardDisplay.vue 自身的样式会定义宽高，但会被这里的动态style覆盖 */
  border: 1px solid #aaa; /* 给牌加个边框看得清楚点 */
  border-radius: 3px; 
  background-color: white; 
}

.button-action-row-modular { flex-shrink: 0; flex-direction: row; gap: 10px; align-items: center; }
.button-action-row-modular button { font-size: 0.9em; padding: 8px 15px; background-color: #007bff; color:white; border:none; border-radius: 4px; cursor:pointer; }
.button-action-row-modular button:disabled { background-color: #ccc; }
.app-footer-modular { padding: 8px 20px; text-align: center; font-size: 0.8em; color: #6c757d; border-top: 1px solid #eee; flex-shrink: 0; }
</style>
