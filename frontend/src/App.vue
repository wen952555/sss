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
        <!-- dun-cards-area 现在需要能容纳绝对定位的牌 -->
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
const handDisplayContainerHeight = ref(0); // 新增：容器高度

const CARD_ASPECT_RATIO = 60 / 90; // 假设 CardDisplay.vue 基础宽度60, 高度90
const NUM_CARDS_IN_HAND = 13;
const HORIZONTAL_PADDING_IN_HAND_AREA = 20; // 手牌区域左右总的内边距或期望边距

const updateContainerDimensions = () => {
  if (handDisplayContainerRef.value) {
    handDisplayContainerWidth.value = handDisplayContainerRef.value.offsetWidth - HORIZONTAL_PADDING_IN_HAND_AREA;
    handDisplayContainerHeight.value = handDisplayContainerRef.value.offsetHeight - 16; // 减去上下padding (8px * 2)
    // console.log(`Hand display container effective W: ${handDisplayContainerWidth.value}, H: ${handDisplayContainerHeight.value}`);
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

  // 1. 根据容器高度和卡牌宽高比，计算卡牌的最大可能高度和对应的宽度
  let cardHeight = handDisplayContainerHeight.value;
  let cardWidth = cardHeight * CARD_ASPECT_RATIO;

  // 2. 如果这样计算出的总宽度 (假设完全不重叠) 会超出容器宽度，则需要缩小卡牌
  //    或者，我们直接以“占满宽度”为目标来计算卡牌的可见部分宽度
  //    总宽度 = 单张牌宽度 + (N-1) * stepX
  //    我们希望总宽度约等于 handDisplayContainerWidth.value
  
  // 假设我们希望每张牌至少露出其宽度的 minVisiblePartFactor 部分
  const minVisiblePartFactor = 0.20; // 例如，每张牌至少露出20%
  // 那么每张牌的理想 stepX 就是 cardWidth * minVisiblePartFactor

  // 为了让13张牌尽可能占满宽度，我们可以反推理想的 cardWidth 和 stepX
  // W_container = cardWidth + (N-1) * stepX
  // 如果 stepX = cardWidth * factor, 那么
  // W_container = cardWidth + (N-1) * cardWidth * factor
  // W_container = cardWidth * (1 + (N-1) * factor)
  // cardWidth = W_container / (1 + (N-1) * factor)

  let calculatedCardWidth = handDisplayContainerWidth.value / (1 + (totalCards - 1) * minVisiblePartFactor);
  
  // 但是这个 cardWidth 不能使其对应的高度超过容器高度
  if ((calculatedCardWidth / CARD_ASPECT_RATIO) > handDisplayContainerHeight.value) {
      // 如果根据宽度算出的高度超了，则以高度为准反推宽度
      calculatedCardWidth = handDisplayContainerHeight.value * CARD_ASPECT_RATIO;
  }
  // 得到最终的 cardWidth 和 cardHeight
  cardWidth = calculatedCardWidth;
  cardHeight = cardWidth / CARD_ASPECT_RATIO;

  // 确保卡牌不会过小
  const minCardWidthThreshold = 25; 
  if (cardWidth < minCardWidthThreshold) {
      cardWidth = minCardWidthThreshold;
      cardHeight = cardWidth / CARD_ASPECT_RATIO;
  }
  
  // 3. 根据最终的 cardWidth 重新计算 stepX，以使其刚好填满容器或接近填满
  let stepX;
  if (totalCards <= 1) {
    stepX = cardWidth; // 只有一张牌，stepX 就是它自己的宽度（虽然用不上）
  } else {
    // 目标是让所有牌的总宽度接近 handDisplayContainerWidth.value
    // totalCards * stepX (近似，因为第一张牌会完整显示一部分)
    // 更精确：cardWidth + (totalCards - 1) * stepX = handDisplayContainerWidth.value
    stepX = (handDisplayContainerWidth.value - cardWidth) / (totalCards - 1);
  }
  // 确保 stepX 不会小于一个最小值 (例如牌宽的10%)，也不会大于牌宽本身(无重叠)
  stepX = Math.max(stepX, cardWidth * 0.10); 
  stepX = Math.min(stepX, cardWidth); 
  
  // 如果你希望最后一张牌尽可能完整显示，而前面的牌重叠更多，这里的逻辑会更复杂
  // 例如，可以为前面的牌使用一个较小的 stepX，为最后一张牌留出更多空间。
  // 为了简化，我们先用均匀的 stepX。

  const leftOffset = index * stepX;

  return {
    position: 'absolute',
    left: `${leftOffset}px`,
    top: '50%', 
    transform: 'translateY(-50%)',
    width: `${cardWidth}px`,
    height: `${cardHeight}px`,
    zIndex: index,
    boxShadow: '0px 1px 3px rgba(0,0,0,0.2)', // 加一点阴影
    // transition: 'left 0.1s linear, width 0.1s linear, height 0.1s linear', // 避免动画干扰尺寸计算
  };
}

async function handleTryPlay() {
  await gameStore.fetchInitialHand();
  // 手牌数据更新后，Vue的响应式系统会重新渲染v-for, 
  // getStackedCardStyle 会被调用。
  // 我们需要确保 handDisplayContainerWidth 和 handDisplayContainerHeight 也是最新的。
  // nextTick 确保在DOM更新后执行
  nextTick(() => {
    updateContainerDimensions(); 
    // 这里可能不需要强制重新计算所有style，因为getStackedCardStyle会依赖更新后的容器尺寸
  });
}
</script>

<style>
html, body { margin: 0; padding: 0; height: 100%; width: 100%; overflow: hidden; background-color: #f0f4f8; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; }
#thirteen-water-app-modular { display: flex; flex-direction: column; height: 100vh; width: 100vw; box-sizing: border-box; }
.app-header-modular { padding: 10px 20px; background-color: #007bff; color: white; text-align: center; flex-shrink: 0; }
.app-header-modular h1 { margin: 0; font-size: 1.5em; }
.header-info-modular { margin-top: 3px; font-size: 0.75em; opacity: 0.9; }

.game-board-layout-modular { flex-grow: 1; display: flex; flex-direction: column; width: 100%; height: 100%; padding: 5px; gap: 5px; box-sizing: border-box; overflow: hidden; }
.layout-row-modular { width: 100%; box-sizing: border-box; border: 1px dashed #d0d0d0; padding: 8px; display: flex; flex-direction: column; justify-content: center; align-items: center; background-color: #f9f9f9; border-radius: 3px; position: relative; overflow: hidden; }

.placeholder-text { color: #aaa; font-style: italic; font-size: 0.9em; }
.semi-transparent-text { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 3em; /* 增大字号 */ color: rgba(0, 0, 0, 0.05); /* 更淡 */ font-weight: bold; z-index: 0; pointer-events: none; white-space: nowrap; }

.status-banner-row-modular { flex-shrink: 0; }
.card-dun-row-modular { flex-shrink: 0; justify-content: center; align-items: center; }
.dun-label { width: 100%; text-align: center; margin-bottom: 5px; font-weight: bold; color: #555; z-index: 2; /* 确保在牌的上方，但在半透明文字之下可能更好，或者让牌有更高z-index */ position: relative; }

.dun-cards-area {
  display: flex; 
  align-items: center; 
  width: 100%; 
  /* min-height: 95px;  会被卡牌实际高度撑开 */
  height: 100%; /* 让这个区域撑满其父横幅的高度 */
  position: relative; 
  box-sizing: border-box;
}

/* 手牌区（第3道横幅）的特殊样式 */
.hand-display-section .dun-cards-area {
  justify-content: flex-start; /* 卡牌从左边开始堆叠 */
  /* padding 控制整个牌堆在横幅内的边距 */
  padding-left: 10px; 
  padding-right: 10px; 
}

.stacked-card {
  /* CardDisplay.vue 自身的样式会定义宽高，但会被这里的动态style覆盖 */
  border: 1px solid #777; /* 给牌加个边框看得清楚点 */
  border-radius: 4px; /* 与CardDisplay.vue内部一致或稍作调整 */
  background-color: white; /* 确保牌有背景色 */
}

.button-action-row-modular { flex-shrink: 0; flex-direction: row; gap: 10px; align-items: center; }
.button-action-row-modular button { font-size: 0.9em; padding: 8px 15px; background-color: #007bff; color:white; border:none; border-radius: 4px; cursor:pointer; }
.button-action-row-modular button:disabled { background-color: #ccc; }
.app-footer-modular { padding: 8px 20px; text-align: center; font-size: 0.8em; color: #6c757d; border-top: 1px solid #eee; flex-shrink: 0; }
</style>
