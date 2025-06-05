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
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'; // 引入 onUnmounted, watch, nextTick
import { useGameStore } from './stores/gameStore';
import CardDisplay from './components/CardDisplay.vue';

const gameStore = useGameStore();
const handDisplayContainerRef = ref(null); // ref 引用手牌区容器
const handDisplayContainerWidth = ref(0); // 手牌区容器的宽度

// 卡牌的原始宽高比 (例如：宽度63mm, 高度88mm, 比例约为 63/88 = 0.716)
// 或者基于 CardDisplay.vue 的css设定，例如 60px / 90px = 0.667
const CARD_ASPECT_RATIO = 60 / 90; // 假设 CardDisplay.vue 基础宽度60, 高度90
const NUM_CARDS_IN_HAND = 13;

// 更新容器宽度的函数
const updateContainerWidth = () => {
  if (handDisplayContainerRef.value) {
    handDisplayContainerWidth.value = handDisplayContainerRef.value.offsetWidth;
    // console.log("Hand display container width:", handDisplayContainerWidth.value);
  }
};

onMounted(() => {
  nextTick(() => { // 确保DOM元素已渲染
    updateContainerWidth();
  });
  window.addEventListener('resize', updateContainerWidth);
  // 页面加载时不自动发牌，等待用户点击“试玩”
});

onUnmounted(() => {
  window.removeEventListener('resize', updateContainerWidth);
});

watch(() => gameStore.currentHand, () => {
    // 当手牌变化时（例如重新发牌），也可能需要重新计算容器宽度（如果布局是动态的）
    // 但通常容器宽度在 resize 时更新就够了
    // nextTick(updateContainerWidth); // 如果需要更频繁更新
}, { deep: true });


function getStackedCardStyle(index, totalCards) {
  if (totalCards === 0 || handDisplayContainerWidth.value === 0) {
    return { opacity: 0 }; // 如果没有牌或容器宽度未知，则不显示
  }

  // 1. 计算单张牌的理想宽度以适应容器
  // 我们希望牌之间有一些重叠，但不能完全重叠
  // 假设我们希望至少露出每张牌的一小部分，比如20%的宽度
  const minVisibleCardWidthPart = 0.20; // 每张牌至少可见20%
  // 或者，设定一个最大重叠的牌数，比如10张牌就能占满宽度
  const effectiveCardsToFit = Math.min(totalCards, 10); // 例如，最多按10张牌来计算占满宽度

  let cardWidth = handDisplayContainerWidth.value / (1 + (effectiveCardsToFit - 1) * (1 - 0.75)); // 0.75是重叠因子，表示露出25%
  // 限制卡牌的最大高度不能超过容器高度 (减去一些padding)
  const containerHeight = handDisplayContainerRef.value ? handDisplayContainerRef.value.offsetHeight - 16 : 90; // 减去padding
  let cardHeight = containerHeight;
  cardWidth = Math.min(cardWidth, cardHeight * CARD_ASPECT_RATIO); // 根据高度和比例限制宽度
  cardHeight = cardWidth / CARD_ASPECT_RATIO; // 根据最终宽度重新计算高度

  // 确保卡牌不会过小
  const minCardWidth = 30; // 最小卡牌宽度
  if (cardWidth < minCardWidth) {
      cardWidth = minCardWidth;
      cardHeight = cardWidth / CARD_ASPECT_RATIO;
  }
  
  // 计算重叠量，使得所有牌能尽可能填满容器宽度
  // totalVisibleWidth = cardWidth + (totalCards - 1) * (cardWidth - overlapAmount)
  // handDisplayContainerWidth.value = cardWidth + (totalCards - 1) * stepX
  // stepX = (handDisplayContainerWidth.value - cardWidth) / (totalCards - 1)
  let stepX = cardWidth * (1 - 0.75); // 默认露出25%
  if (totalCards > 1) {
      const totalWidthForAllCards = cardWidth + (totalCards - 1) * stepX;
      if (totalWidthForAllCards > handDisplayContainerWidth.value - 20) { // 减去一些边距
          // 如果默认重叠后总宽度超出容器，则需要增加重叠，减小stepX
          stepX = (handDisplayContainerWidth.value - cardWidth - 20) / (totalCards - 1);
          stepX = Math.max(stepX, cardWidth * minVisibleCardWidthPart); // 确保至少露出一点
      }
  } else {
      stepX = cardWidth; // 只有一张牌
  }


  const leftOffset = index * stepX;

  return {
    position: 'absolute',
    left: `${leftOffset}px`,
    top: '50%', // 垂直居中
    transform: 'translateY(-50%)', // 配合top 50% 实现垂直居中
    width: `${cardWidth}px`,
    height: `${cardHeight}px`,
    zIndex: index,
    // boxShadow: '0px 0px 3px rgba(0,0,0,0.3)', // 给点阴影增加层次感
  };
}

async function handleTryPlay() {
  await gameStore.fetchInitialHand();
  nextTick(updateContainerWidth); // 发牌后更新容器宽度并重新计算样式
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

.status-banner-row-modular { flex-shrink: 0; }
.card-dun-row-modular { flex-shrink: 0; justify-content: center; /* 让内部的 dun-cards-area 居中 */ align-items: center; }
.dun-label { width: 100%; text-align: center; margin-bottom: 5px; font-weight: bold; color: #555; z-index: 1; position: relative; }

.dun-cards-area {
  display: flex; /* 虽然子元素是绝对定位，但flex可以帮助对齐占位符等 */
  justify-content: center; 
  align-items: center; 
  width: 100%; 
  min-height: 95px; 
  position: relative; /* 非常重要，用于绝对定位的子卡牌 */
  box-sizing: border-box;
}

/* 手牌区（第3道横幅）的特殊样式 */
.hand-display-section .dun-cards-area {
  justify-content: flex-start; /* 卡牌从左边开始堆叠 */
  /* padding-left: 10px; */ /* 由JS计算left，所以这里padding可能不需要 */
  /* padding-right: 10px; */
  width: calc(100% - 20px); /* 给左右留点边距 */
  margin: 0 auto; /* 水平居中这个区域 */
}

.stacked-card {
  /* CardDisplay.vue 自身的样式会定义宽高，但会被这里的动态style覆盖 */
  /* 这里通过 getStackedCardStyle 动态设置 left, top, width, height, z-index */
  /* transition: all 0.2s ease-out; */ /* 可以给所有属性加过渡 */
}


.button-action-row-modular { flex-shrink: 0; flex-direction: row; gap: 10px; align-items: center; }
.button-action-row-modular button { font-size: 0.9em; padding: 8px 15px; background-color: #007bff; color:white; border:none; border-radius: 4px; cursor:pointer; }
.button-action-row-modular button:disabled { background-color: #ccc; }
.app-footer-modular { padding: 8px 20px; text-align: center; font-size: 0.8em; color: #6c757d; border-top: 1px solid #eee; flex-shrink: 0; }
</style>
