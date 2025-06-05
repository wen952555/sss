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

const CARD_ASPECT_RATIO = 60 / 90; 
const NUM_CARDS_IN_HAND = 13;

const updateContainerWidth = () => {
  if (handDisplayContainerRef.value) {
    // 减去一些左右内边距，得到实际可用于放牌的宽度
    const padding = 20; // 假设左右各有10px的内边距或期望的边距
    handDisplayContainerWidth.value = handDisplayContainerRef.value.offsetWidth - padding;
    // console.log("Hand display container effective width:", handDisplayContainerWidth.value);
  }
};

onMounted(() => {
  nextTick(updateContainerWidth);
  window.addEventListener('resize', updateContainerWidth);
});
onUnmounted(() => { window.removeEventListener('resize', updateContainerWidth); });
watch(() => gameStore.currentHand, () => { nextTick(updateContainerWidth); }, { deep: true });


function getStackedCardStyle(index, totalCards) {
  if (totalCards === 0 || handDisplayContainerWidth.value <= 0) {
    return { opacity: 0, position: 'absolute' }; // 确保即使透明也占据空间
  }

  // --- 参数化调整 ---
  // 1. 卡牌在堆叠时，期望露出的最小宽度部分 (例如牌宽的 25%)
  const desiredVisibleCardPartWidthFactor = 0.35; // 增加这个值会让牌之间距离更宽
  // 2. 卡牌的基础宽度 (可以根据容器高度动态调整，或者先固定一个)
  let baseCardWidth = 60; // 假设基础宽度
  let baseCardHeight = baseCardWidth / CARD_ASPECT_RATIO;

  // 根据容器高度调整卡牌大小，使其尽可能大但保持比例，且不超过容器高度
  const containerHeight = handDisplayContainerRef.value ? handDisplayContainerRef.value.offsetHeight - 16 : 90; // 减去上下padding
  if (baseCardHeight > containerHeight) {
      baseCardHeight = containerHeight;
      baseCardWidth = baseCardHeight * CARD_ASPECT_RATIO;
  }
  // console.log(`Calculated card size: ${baseCardWidth}x${baseCardHeight}`);


  // 3. 计算每张牌的理想水平步进距离 (stepX)
  // 这是每张后续牌相对于前一张牌的left值的增量
  // 它等于我们希望每张牌露出的宽度
  let stepX = baseCardWidth * desiredVisibleCardPartWidthFactor;

  // 4. 计算所有牌按照这个stepX排列后的总宽度
  // 总宽度 = 第一张牌的宽度 + (剩余牌数 * stepX)
  let totalCalculatedWidth = baseCardWidth + (totalCards - 1) * stepX;

  // 5. 如果计算出的总宽度超出了容器可用宽度，则需要减小 stepX (即增加重叠)
  // 直到总宽度适应容器，或者 stepX 达到一个非常小的下限（例如只露出一点点边缘）
  const minStepX = baseCardWidth * 0.1; // 例如，牌最少也要露出10%的宽度

  if (totalCalculatedWidth > handDisplayContainerWidth.value && totalCards > 1) {
    //  handDisplayContainerWidth = cardWidth + (N-1)*newStepX
    // (N-1)*newStepX = handDisplayContainerWidth - cardWidth
    // newStepX = (handDisplayContainerWidth - cardWidth) / (N-1)
    stepX = (handDisplayContainerWidth.value - baseCardWidth) / (totalCards - 1);
    stepX = Math.max(stepX, minStepX); // 确保stepX不会过小
    totalCalculatedWidth = baseCardWidth + (totalCards - 1) * stepX; // 重新计算总宽度
    // console.log(`Width exceeded. New stepX: ${stepX}, New total width: ${totalCalculatedWidth}`);
  }
  
  // 如果你希望最后几张牌重叠更多，可以对最后几张牌的 stepX 进行特殊处理
  // 例如，从第10张牌开始，stepX 变得更小
  // if (index >= 9 && totalCards > 9) { // 例如从第10张牌开始 (index 9)
  //   stepX = Math.min(stepX, baseCardWidth * 0.15); // 最后几张牌只露出15%
  // }


  const leftOffset = index * stepX;

  return {
    position: 'absolute',
    left: `${leftOffset}px`,
    top: '50%', 
    transform: 'translateY(-50%)',
    width: `${baseCardWidth}px`,
    height: `${baseCardHeight}px`,
    zIndex: index,
    // transition: 'left 0.2s ease-out, width 0.2s ease-out, height 0.2s ease-out', // 平滑过渡
  };
}

async function handleTryPlay() {
  await gameStore.fetchInitialHand();
  // fetchInitialHand 后 gameStore.myCards 会更新，触发 watch，然后 nextTick(updateContainerWidth)
}
</script>

<style>
/* 全局 Reset 和基础样式 */
html, body { margin: 0; padding: 0; height: 100%; width: 100%; overflow: hidden; background-color: #f0f4f8; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; }
#thirteen-water-app-modular { display: flex; flex-direction: column; height: 100vh; width: 100vw; box-sizing: border-box; }
.app-header-modular { padding: 10px 20px; background-color: #007bff; color: white; text-align: center; flex-shrink: 0; }
.app-header-modular h1 { margin: 0; font-size: 1.5em; }
.header-info-modular { margin-top: 3px; font-size: 0.75em; opacity: 0.9; }

.game-board-layout-modular { flex-grow: 1; display: flex; flex-direction: column; width: 100%; height: 100%; padding: 5px; gap: 5px; box-sizing: border-box; overflow: hidden; }
.layout-row-modular { width: 100%; box-sizing: border-box; border: 1px dashed #d0d0d0; padding: 8px; display: flex; flex-direction: column; justify-content: center; align-items: center; background-color: #f9f9f9; border-radius: 3px; position: relative; overflow: hidden; /* 改为 hidden 防止绝对定位的牌溢出太多 */ }

.placeholder-text { color: #aaa; font-style: italic; font-size: 0.9em; }
.semi-transparent-text { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 2.5em; color: rgba(0, 0, 0, 0.08); font-weight: bold; z-index: 0; pointer-events: none; white-space: nowrap; }

.status-banner-row-modular { flex-shrink: 0; } /* height is inline */
.card-dun-row-modular { flex-shrink: 0; justify-content: center; align-items: center; } /* height is inline */
.dun-label { width: 100%; text-align: center; margin-bottom: 5px; font-weight: bold; color: #555; z-index: 1; position: relative; }

.dun-cards-area {
  display: flex; 
  align-items: center; 
  width: 100%; 
  min-height: 95px; 
  position: relative; /* 用于绝对定位的子卡牌 */
  box-sizing: border-box;
}

/* 手牌区（第3道横幅）的特殊样式 */
.hand-display-section .dun-cards-area {
  justify-content: flex-start; /* 卡牌从左边开始堆叠 */
  /* padding-left and padding-right control the overall horizontal position of the stack */
  padding-left: 10px; 
  padding-right: 10px; 
}

.stacked-card {
  /* 确保 CardDisplay.vue 中的 .card-display-item 没有设置 position: absolute; */
  /* 这里的样式会被动态 style 对象覆盖或增强 */
}


.button-action-row-modular { flex-shrink: 0; flex-direction: row; gap: 10px; align-items: center; } /* height is inline */
.button-action-row-modular button { font-size: 0.9em; padding: 8px 15px; background-color: #007bff; color:white; border:none; border-radius: 4px; cursor:pointer; }
.button-action-row-modular button:disabled { background-color: #ccc; }
.app-footer-modular { padding: 8px 20px; text-align: center; font-size: 0.8em; color: #6c757d; border-top: 1px solid #eee; flex-shrink: 0; }
</style>
