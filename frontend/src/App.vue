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
            class="stacked-card-item" 
            :style="calculateCardStyle(index, gameStore.currentHand.length)"
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
const containerWidth = ref(0);
const containerHeight = ref(0); // 父容器高度

// 卡牌固定宽高比
const CARD_ASPECT_RATIO = 60 / 90; // 例如 宽60 高90
// 卡牌在手牌区的基础高度 (可以根据容器高度动态调整，或固定)
const BASE_CARD_HEIGHT_IN_HAND = 80; // px，可以根据实际效果调整

const updateDimensions = () => {
  if (handDisplayContainerRef.value) {
    // 获取手牌区容器的实际可用宽度和高度 (减去padding)
    const style = getComputedStyle(handDisplayContainerRef.value);
    const paddingLeft = parseFloat(style.paddingLeft) || 0;
    const paddingRight = parseFloat(style.paddingRight) || 0;
    const paddingTop = parseFloat(style.paddingTop) || 0;
    const paddingBottom = parseFloat(style.paddingBottom) || 0;
    
    containerWidth.value = handDisplayContainerRef.value.clientWidth - paddingLeft - paddingRight;
    containerHeight.value = handDisplayContainerRef.value.clientHeight - paddingTop - paddingBottom;
    // console.log(`Container effective dimensions: W=${containerWidth.value}, H=${containerHeight.value}`);
  }
};

onMounted(() => {
  nextTick(updateDimensions); // 确保DOM渲染后获取尺寸
  window.addEventListener('resize', updateDimensions);
});
onUnmounted(() => {
  window.removeEventListener('resize', updateDimensions);
});
// 当手牌变化时，也可能需要重新获取容器尺寸（如果容器尺寸依赖内容，虽然这里是固定百分比）
watch(() => gameStore.currentHand, () => { nextTick(updateDimensions); }, { deep: true });


function calculateCardStyle(index, totalCards) {
  if (totalCards === 0 || containerWidth.value <= 0 || containerHeight.value <= 0) {
    return { opacity: 0, position: 'absolute' }; 
  }

  // 1. 确定卡牌的渲染尺寸
  // 优先使用 BASE_CARD_HEIGHT_IN_HAND，并根据比例计算宽度
  let cardRenderHeight = BASE_CARD_HEIGHT_IN_HAND;
  let cardRenderWidth = cardRenderHeight * CARD_ASPECT_RATIO;

  // 如果根据此高度计算出的宽度，在堆叠后会超出容器宽度，则需要缩小卡牌
  // 或者，如果卡牌高度本身就大于容器可用高度，则以容器高度为准
  if (cardRenderHeight > containerHeight.value) {
    cardRenderHeight = containerHeight.value;
    cardRenderWidth = cardRenderHeight * CARD_ASPECT_RATIO;
  }

  // 2. 计算每张牌的水平偏移量 (stepX)，即每张牌露出的宽度
  // 目标：(N-1)*stepX + cardRenderWidth <= containerWidth.value
  // stepX = (containerWidth.value - cardRenderWidth) / (totalCards - 1)
  let stepX;
  if (totalCards <= 1) {
    stepX = cardRenderWidth; // 只有一张牌，它自己就是步进（虽然用不上left）
  } else {
    // 尝试让牌堆总宽度等于容器宽度
    stepX = (containerWidth.value - cardRenderWidth) / (totalCards - 1);
  }

  // 3. 对stepX进行一些限制，确保不会太拥挤或太分散
  const minVisiblePart = cardRenderWidth * 0.10; // 每张牌最少露出10%
  const maxVisiblePart = cardRenderWidth * 0.50; // 每张牌最多露出50% (如果你想要更分散，可以调大)
  
  stepX = Math.max(stepX, minVisiblePart);
  stepX = Math.min(stepX, maxVisiblePart);

  // 如果经过上述限制后，总宽度仍然可能超出，这通常意味着牌本身相对于容器太宽了
  // 在这种情况下，上面的 cardRenderWidth 和 cardRenderHeight 的计算应该已经处理了最大尺寸
  // 这里的 stepX 是在确定了牌的尺寸后，再去适应宽度

  const left = index * stepX;

  return {
    position: 'absolute',
    left: `${left}px`,
    top: '50%', // 垂直居中
    transform: 'translateY(-50%)',
    width: `${cardRenderWidth}px`,
    height: `${cardRenderHeight}px`,
    zIndex: index,
    boxShadow: '0px 1px 3px rgba(0,0,0,0.2)',
    // transition: 'left 0.1s linear', // 可以去掉或保留平滑效果
  };
}

async function handleTryPlay() {
  await gameStore.fetchInitialHand();
  nextTick(updateDimensions); 
}
</script>

<style>
html, body { margin: 0; padding: 0; height: 100%; width: 100%; overflow: hidden; background-color: #f0f4f8; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; }
#thirteen-water-app-modular { display: flex; flex-direction: column; height: 100vh; width: 100vw; box-sizing: border-box; }
.app-header-modular { padding: 10px 20px; background-color: #007bff; color: white; text-align: center; flex-shrink: 0; }
.app-header-modular h1 { margin: 0; font-size: 1.5em; }
.header-info-modular { margin-top: 3px; font-size: 0.75em; opacity: 0.9; }

.game-board-layout-modular { flex-grow: 1; display: flex; flex-direction: column; width: 100%; height: 100%; padding: 5px; gap: 5px; box-sizing: border-box; overflow: hidden; }
.layout-row-modular { width: 100%; box-sizing: border-box; border: 1px dashed #d0d0d0; padding: 8px; display: flex; flex-direction: column; justify-content: center; align-items: center; background-color: #f9f9f9; border-radius: 3px; position: relative; overflow: hidden; /* 确保绝对定位的子元素被裁剪 */ }

.placeholder-text { color: #aaa; font-style: italic; font-size: 0.9em; }
.semi-transparent-text { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 3em; color: rgba(0, 0, 0, 0.05); font-weight: bold; z-index: 0; pointer-events: none; white-space: nowrap; }

.status-banner-row-modular { flex-shrink: 0; }
.card-dun-row-modular { flex-shrink: 0; justify-content: center; align-items: center; }
.dun-label { width: 100%; text-align: center; margin-bottom: 5px; font-weight: bold; color: #555; z-index: 2; position: relative; }

.dun-cards-area {
  display: block; /* 改为 block 或 flex，但子元素是绝对定位，所以它主要作为定位父级 */
  width: 100%; 
  height: 100%; 
  position: relative; /* 重要：作为绝对定位的卡牌的参考容器 */
  box-sizing: border-box;
}

/* 手牌区（第3道横幅）的特殊样式 */
.hand-display-section .dun-cards-area {
  /* padding 控制整个牌堆在横幅内的起始边距 */
  /* 这个 padding 会影响 updateDimensions 中计算的 containerWidth */
  padding-left: 10px; 
  padding-right: 10px; 
}

.stacked-card-item { /* 确保 CardDisplay 组件的根元素class是这个或者类似的 */
  /* position: absolute; 由JS动态设置 */
  /* width, height, left, top, z-index 也由JS动态设置 */
  border: 1px solid #888; /* 给牌一个清晰的边框 */
  border-radius: 4px; /* 轻微的圆角 */
  background-color: white; /* 确保牌有背景 */
}

.button-action-row-modular { flex-shrink: 0; flex-direction: row; gap: 10px; align-items: center; }
.button-action-row-modular button { font-size: 0.9em; padding: 8px 15px; background-color: #007bff; color:white; border:none; border-radius: 4px; cursor:pointer; }
.button-action-row-modular button:disabled { background-color: #ccc; }
.app-footer-modular { padding: 8px 20px; text-align: center; font-size: 0.8em; color: #6c757d; border-top: 1px solid #eee; flex-shrink: 0; }
</style>
