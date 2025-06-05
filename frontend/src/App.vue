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
      <section class="layout-row-modular card-dun-row-modular" style="height: 25%;">
        <div class="dun-label placeholder-text semi-transparent-text">手牌</div>
        <div class="dun-cards-area hand-display-area">
          <CardDisplay 
            v-for="card in gameStore.currentHand" 
            :key="card.id" 
            :card="card"
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
          <!-- 以后可以添加更多按钮 -->
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
  // console.log("试玩按钮点击");
  await gameStore.fetchInitialHand();
}

onMounted(() => {
  // 页面加载时不自动发牌，等待用户点击“试玩”
  // console.log("App.vue (Modular) mounted.");
});
</script>

<style>
/* 全局 Reset 和基础样式 */
html, body {
  margin: 0;
  padding: 0;
  height: 100%;
  width: 100%;
  overflow: hidden; 
  background-color: #f0f4f8; 
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  color: #333;
}

#thirteen-water-app-modular {
  display: flex; 
  flex-direction: column;
  height: 100vh; 
  width: 100vw;
  box-sizing: border-box;
}

.app-header-modular {
  padding: 10px 20px;
  background-color: #007bff;
  color: white;
  text-align: center;
  flex-shrink: 0; 
}
.app-header-modular h1 { margin: 0; font-size: 1.5em; }
.header-info-modular { margin-top: 3px; font-size: 0.75em; opacity: 0.9; }

.game-board-layout-modular {
  flex-grow: 1; 
  display: flex;
  flex-direction: column; 
  width: 100%;
  height: 100%; 
  padding: 5px; 
  gap: 5px; 
  box-sizing: border-box;
  overflow: hidden;
}

.layout-row-modular {
  width: 100%;
  box-sizing: border-box; 
  border: 1px dashed #d0d0d0; /* 浅色虚线边框 */
  padding: 8px; 
  display: flex; 
  flex-direction: column; /* 默认内容垂直排列 */
  justify-content: center; 
  align-items: center; 
  background-color: #f9f9f9; /* 非常浅的背景色 */
  border-radius: 3px;
  position: relative; /* 为了绝对定位内部的半透明文字 */
  overflow: auto; /* 如果内容超出，允许滚动 */
}

.placeholder-text { /* 用于所有横幅的占位文字 */
  color: #aaa;
  font-style: italic;
  font-size: 0.9em;
}
.semi-transparent-text { /* 用于墩位名称的半透明效果 */
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 2.5em; /* 调大字号 */
  color: rgba(0, 0, 0, 0.08); /* 非常淡的半透明黑色 */
  font-weight: bold;
  z-index: 0; /* 确保在牌的下方 */
  pointer-events: none; /* 文字不干扰鼠标事件 */
  white-space: nowrap; /* 防止文字换行 */
}

.status-banner-row-modular { /* 10% */
  flex-shrink: 0;
}

.card-dun-row-modular { /* 25% */
  flex-shrink: 0;
  justify-content: flex-start; /* 内容从顶部开始，方便牌的显示 */
  align-items: center; /* 水平居中 */
}
.dun-label { /* 用于显示 "头道", "手牌", "尾道" */
  width: 100%;
  text-align: center;
  margin-bottom: 5px; /* 与牌区隔开一点 */
  font-weight: bold;
  color: #555;
  z-index: 1; /* 确保在半透明文字上方 */
  position: relative; /* 使 z-index 生效 */
}
.dun-cards-area {
  display: flex;
  flex-wrap: wrap; /* 允许牌换行 */
  justify-content: center; /* 牌在区域内居中 */
  align-items: center; /* 牌垂直居中 */
  width: 100%;
  min-height: 70px; /* 给点最小高度 */
  gap: 3px; /* 牌之间的间隙 */
  z-index: 1; /* 确保牌在半透明文字上方 */
  position: relative;
}
.hand-display-area { /* 第三道手牌区的特殊样式，如果需要 */
  /* background-color: #e8f4fd; */ /* 可以给个不同的背景色调试 */
}


.button-action-row-modular { /* 15% */
  flex-shrink: 0;
  flex-direction: row; 
  gap: 10px;
  align-items: center; 
}
.button-action-row-modular button { 
  font-size: 0.9em; padding: 8px 15px; 
  background-color: #007bff; color:white; border:none; border-radius: 4px; cursor:pointer;
}
.button-action-row-modular button:disabled { background-color: #ccc; }


.app-footer-modular { 
  padding: 8px 20px; text-align: center; font-size: 0.8em; 
  color: #6c757d; border-top: 1px solid #eee; flex-shrink: 0; 
}
</style>
