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
        <div class="placeholder-text">第一道：玩家状态区 (占位)</div>
      </section>

      <!-- 第2道: 理牌区 - 头道 (占25%) -->
      <section class="layout-row-modular card-dun-row-modular" style="height: 25%;">
        <div class="dun-label placeholder-text semi-transparent-text">头道</div>
        <div class="dun-cards-area">
          <!-- 牌显示区域 -->
        </div>
      </section>

      <!-- 第3道: 理牌区 - 手牌 (占25%) -->
      <section class="layout-row-modular card-dun-row-modular hand-display-section" style="height: 25%;">
        <div class="dun-label placeholder-text semi-transparent-text">手牌</div>
        <!-- 修改：应用新的堆叠样式 -->
        <div class="dun-cards-area stacked-hand-display-area">
          <CardDisplay 
            v-for="(card, index) in gameStore.currentHand" 
            :key="card.id" 
            :card="card"
            class="stacked-card"
            :style="getCardStyle(index, gameStore.currentHand.length)"
          />
        </div>
      </section>

      <!-- 第4道: 理牌区 - 尾道 (占25%) -->
      <section class="layout-row-modular card-dun-row-modular" style="height: 25%;">
        <div class="dun-label placeholder-text semi-transparent-text">尾道</div>
        <div class="dun-cards-area">
          <!-- 牌显示区域 -->
        </div>
      </section>
      
      <!-- 第5道: 按钮区 (占15%) -->
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
import { onMounted } from 'vue';
import { useGameStore } from './stores/gameStore'; // 确保路径正确
import CardDisplay from './components/CardDisplay.vue'; // 确保路径正确

const gameStore = useGameStore();

async function handleTryPlay() {
  await gameStore.fetchInitialHand();
}

// 计算每张牌的样式以实现堆叠效果
function getCardStyle(index, totalCards) {
  if (totalCards <= 1) {
    return {}; // 只有一张牌或没有牌，不需要特殊样式
  }
  // 这个值需要根据牌的宽度和期望的重叠度进行调整
  // 假设牌的宽度是60px (CardDisplay.vue 中定义的)
  // 我们希望13张牌能在容器内显示完，即使有重叠
  const cardWidth = 60; 
  // 容器的可用宽度，可以尝试获取，但这里为了简单先估算一个值
  // 或者让重叠固定，例如每张牌向左偏移自身宽度的70-80%
  const overlapFactor = 0.75; // 每张牌覆盖前一张牌的75%宽度
  const overlap = cardWidth * overlapFactor; 
  
  // 对于第一张牌 (index 0)，不应用 marginLeft
  // 后续的牌，相对于正常位置向左移动 overlap * index 的距离
  // 但由于它们是inline-flex, 直接设置负的marginLeft会导致它们挤压前面的元素
  // 所以我们改为让除了第一张牌之外的牌，都有一个负的左边距
  // 或者使用绝对定位，但这会使父容器高度塌陷，需要额外处理
  
  // 简单方式：给除了第一张牌以外的牌一个负的左边距
  if (index > 0) {
      // return { marginLeft: `-${overlap}px` };
      // 为了让牌看起来是从左到右“发”出来的，并且后面的牌盖住前面的牌一点点
      // 我们需要让每张牌都相对于其“自然”位置向左移动
      // 并且可能需要 z-index 来控制堆叠顺序 (虽然默认顺序可能就正确)
      // 一个更简单的堆叠是每张牌都向左移动，并且后面的牌z-index更高
      // 但如果只用 margin-left: -Xpx，它们会简单地并排然后重叠
      
      // 使用绝对定位来实现精确堆叠
      // 父容器 .stacked-hand-display-area 需要 position: relative;
      const leftOffset = index * (cardWidth - overlap); // 每张牌的起始位置
      return {
          position: 'absolute',
          left: `${leftOffset}px`,
          zIndex: index // 后发的牌在上面
      };
  }
  return { position: 'absolute', left: '0px', zIndex: index }; // 第一张牌
}


onMounted(() => {
  // 页面加载时不自动发牌，等待用户点击“试玩”
});
</script>

<style>
/* 全局 Reset 和基础样式 */
html, body { margin: 0; padding: 0; height: 100%; width: 100%; overflow: hidden; background-color: #f0f4f8; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; }
#thirteen-water-app-modular { display: flex; flex-direction: column; height: 100vh; width: 100vw; box-sizing: border-box; }
.app-header-modular { padding: 10px 20px; background-color: #007bff; color: white; text-align: center; flex-shrink: 0; }
.app-header-modular h1 { margin: 0; font-size: 1.5em; }
.header-info-modular { margin-top: 3px; font-size: 0.75em; opacity: 0.9; }

.game-board-layout-modular { flex-grow: 1; display: flex; flex-direction: column; width: 100%; height: 100%; padding: 5px; gap: 5px; box-sizing: border-box; overflow: hidden; }
.layout-row-modular { width: 100%; box-sizing: border-box; border: 1px dashed #d0d0d0; padding: 8px; display: flex; flex-direction: column; justify-content: center; align-items: center; background-color: #f9f9f9; border-radius: 3px; position: relative; overflow: visible; /* 改为 visible 或 clip，以便绝对定位的牌能正确显示 */ }

.placeholder-text { color: #aaa; font-style: italic; font-size: 0.9em; }
.semi-transparent-text { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 2.5em; color: rgba(0, 0, 0, 0.08); font-weight: bold; z-index: 0; pointer-events: none; white-space: nowrap; }

.status-banner-row-modular { flex-shrink: 0; }
.card-dun-row-modular { flex-shrink: 0; justify-content: flex-start; align-items: center; }
.dun-label { width: 100%; text-align: center; margin-bottom: 5px; font-weight: bold; color: #555; z-index: 1; position: relative; }
.dun-cards-area { display: flex; flex-wrap: nowrap; /* 防止牌换行 */ justify-content: center; align-items: center; width: 100%; min-height: 95px; /* 确保牌的高度 */ gap: 3px; z-index: 1; position: relative; /* 为了绝对定位的子元素 */ padding-left: 5px; /* 给第一张牌留出空间 */ }

/* 手牌区（第3道横幅）的特殊样式 */
.hand-display-section .dun-cards-area {
  /* 允许内容水平溢出，但不显示滚动条，依赖卡牌的绝对定位来控制显示范围 */
  overflow-x: visible; /* 或者 clip，如果计算精确 */
  justify-content: flex-start; /* 卡牌从左边开始堆叠 */
  padding-left: 10px; /* 给堆叠的牌一些起始边距 */
  padding-right: 10px;
}

.stacked-card {
  /* CardDisplay.vue 自身的样式会定义宽高 */
  /* 这里通过 getCardStyle 动态设置 left 和 z-index */
  transition: left 0.3s ease-out; /* 添加一点动画效果 */
}


.button-action-row-modular { flex-shrink: 0; flex-direction: row; gap: 10px; align-items: center; }
.button-action-row-modular button { font-size: 0.9em; padding: 8px 15px; background-color: #007bff; color:white; border:none; border-radius: 4px; cursor:pointer; }
.button-action-row-modular button:disabled { background-color: #ccc; }
.app-footer-modular { padding: 8px 20px; text-align: center; font-size: 0.8em; color: #6c757d; border-top: 1px solid #eee; flex-shrink: 0; }
</style>
