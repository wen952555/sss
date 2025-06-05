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
        <div class="dun-label-background semi-transparent-text">头道</div>
        <div class="dun-cards-area">
            <!-- 头道牌显示区 -->
        </div>
      </section>

      <!-- 第3道: 手牌区 -->
      <section ref="handDisplayContainerRef" class="layout-row-modular card-dun-row-modular hand-display-section" style="height: 25%;">
        <div class="dun-label-background semi-transparent-text">手牌</div>
        <div class="dun-cards-area stacked-hand-display-area">
          <CardDisplay 
            v-for="(card, index) in gameStore.currentHand" 
            :key="card.id" 
            :card="card"
            class="stacked-card-item" 
            :style="getStackedCardStyle(index, gameStore.currentHand.length)"
          />
        </div>
      </section>

      <!-- 第4道 -->
      <section class="layout-row-modular card-dun-row-modular" style="height: 25%;">
        <div class="dun-label-background semi-transparent-text">尾道</div>
        <div class="dun-cards-area">
            <!-- 尾道牌显示区 -->
        </div>
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
// const containerWidth = ref(0); // 不再直接使用容器宽度来反推牌大小或stepX
const containerHeight = ref(0);

const CARD_ASPECT_RATIO = 60 / 90; // 牌的宽高比
const CARD_BASE_HEIGHT = 80; // 手牌区期望的卡牌高度 (px) - 可以调整这个值
// 你希望每张牌（除了最后一张）露出多少宽度，相对于牌自身宽度的一个比例
const CARD_VISIBLE_PART_FACTOR = 0.22; // 例如，每张牌露出22%的宽度。调整这个值来改变间距！

const updateContainerHeight = () => {
  if (handDisplayContainerRef.value) {
    const style = getComputedStyle(handDisplayContainerRef.value);
    const paddingTop = parseFloat(style.paddingTop) || 0;
    const paddingBottom = parseFloat(style.paddingBottom) || 0;
    containerHeight.value = handDisplayContainerRef.value.clientHeight - paddingTop - paddingBottom;
    // console.log(`Hand display container effective H: ${containerHeight.value}`);
  }
};

onMounted(() => { /* ... (与上一版相同) ... */ });
onUnmounted(() => { /* ... (与上一版相同) ... */ });
watch(() => gameStore.currentHand, () => { /* ... (与上一版相同) ... */ }, { deep: true });

function getStackedCardStyle(index, totalCards) {
  if (totalCards === 0 || containerHeight.value <= 0) {
    return { opacity: 0, position: 'absolute' }; 
  }

  // 1. 确定卡牌的渲染高度和宽度
  // 优先使用 CARD_BASE_HEIGHT，但不能超过容器的实际可用高度
  let renderCardHeight = Math.min(CARD_BASE_HEIGHT, containerHeight.value);
  let renderCardWidth = renderCardHeight * CARD_ASPECT_RATIO;

  // 2. 计算每张牌的水平偏移量 (stepX)
  // stepX 是每张后续牌相对于前一张牌的left值的增量
  // 它等于我们希望每张牌露出的宽度
  let stepX = renderCardWidth * CARD_VISIBLE_PART_FACTOR;

  // 3. 计算当前牌的 left offset
  // 第一张牌 (index 0) 的 left 是 0 (或一个小的起始padding)
  const leftOffset = index * stepX;

  return {
    position: 'absolute',
    left: `${leftOffset}px`,
    top: '50%', 
    transform: 'translateY(-50%)', // 垂直居中
    width: `${renderCardWidth}px`,
    height: `${renderCardHeight}px`,
    zIndex: index, // 后发的牌在上面
    boxShadow: '1px 1px 3px rgba(0,0,0,0.2)', // 增加一点立体感
  };
}

async function handleTryPlay() { /* ... (与上一版相同) ... */ }
</script>

<style>
html, body { margin: 0; padding: 0; height: 100%; width: 100%; overflow: hidden; background-color: #f0f4f8; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; }
#thirteen-water-app-modular { display: flex; flex-direction: column; height: 100vh; width: 100vw; box-sizing: border-box; }
.app-header-modular { padding: 10px 20px; background-color: #007bff; color: white; text-align: center; flex-shrink: 0; }
.app-header-modular h1 { margin: 0; font-size: 1.5em; }
.header-info-modular { margin-top: 3px; font-size: 0.75em; opacity: 0.9; }

.game-board-layout-modular { flex-grow: 1; display: flex; flex-direction: column; width: 100%; height: 100%; padding: 5px; gap: 5px; box-sizing: border-box; overflow: hidden; }
.layout-row-modular { width: 100%; box-sizing: border-box; border: 1px dashed #d0d0d0; padding: 8px; display: flex; flex-direction: column; justify-content: center; align-items: center; background-color: #f9f9f9; border-radius: 3px; position: relative; overflow: hidden; }

.placeholder-text { /* 用于第一道横幅的文字 */
  color: #aaa; font-style: italic; font-size: 0.9em; 
  z-index: 1; /* 确保在半透明背景字之上 */
  position: relative;
}
.semi-transparent-text { /* 作为背景的“头道”、“手牌”、“尾道” */
  position: absolute; 
  top: 50%; left: 50%; 
  transform: translate(-50%, -50%); 
  font-size: 4em; /* 调大字号 */ 
  color: rgba(0, 0, 0, 0.05); /* 非常淡的颜色 */ 
  font-weight: bold; 
  z-index: 0; /* 在最底层 */
  pointer-events: none; 
  white-space: nowrap; 
}
/* 为了让 .dun-label-background 也能应用这个样式，我们改个名字 */
.dun-label-background { /* 应用于包裹半透明文字的 div */
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    position: absolute; /* 确保它能撑满父容器 */
    top: 0;
    left: 0;
}


.status-banner-row-modular { flex-shrink: 0; }
.card-dun-row-modular { flex-shrink: 0; justify-content: center; align-items: center; }
/* .dun-label 不再需要，因为半透明文字已作为背景 */

.dun-cards-area {
  width: 100%; 
  height: 100%; 
  position: relative; /* 作为绝对定位卡牌的参考容器 */
  box-sizing: border-box;
  display: flex; /* 帮助内部元素对齐，即使它们是绝对定位的 */
  align-items: center; /* 垂直居中牌堆 */
  justify-content: flex-start; /* 牌堆从左开始 */
}

/* 手牌区（第3道横幅）的特殊样式 */
.hand-display-section .dun-cards-area {
  /* padding 控制整个牌堆在横幅内的起始边距 */
  padding-left: 15px; /* 给第一张牌的左边留出更多边距 */
  padding-right: 15px; /* 也给右边留点边距 */
}

.stacked-card-item { 
  /* position, width, height, left, top, z-index 由JS动态设置 */
  border: 1px solid #999; 
  border-radius: 4px; 
  background-color: white; 
}

.button-action-row-modular { flex-shrink: 0; flex-direction: row; gap: 10px; align-items: center; }
.button-action-row-modular button { font-size: 0.9em; padding: 8px 15px; background-color: #007bff; color:white; border:none; border-radius: 4px; cursor:pointer; }
.button-action-row-modular button:disabled { background-color: #ccc; }
.app-footer-modular { padding: 8px 20px; text-align: center; font-size: 0.8em; color: #6c757d; border-top: 1px solid #eee; flex-shrink: 0; }
</style>
