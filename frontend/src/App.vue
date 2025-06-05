<template>
  <div id="thirteen-water-app" class="game-container">
    <header class="app-header">
      <h1>十三水在线对战</h1>
      <!-- 头部可以保留，或者也简化 -->
      <div class="header-info">
        <!-- 简化，暂时移除会话ID和房间号显示 -->
        <p>牌桌模式</p>
      </div>
    </header>

    <main class="game-board-layout">
      <!-- 第1道: 各玩家状态横幅显示 (占10%) -->
      <section class="layout-row status-banner-row" style="height: 10%;">
        <div class="placeholder-content">
          <p>第一道横幅：玩家状态区 (10%)</p>
        </div>
      </section>

      <!-- 第2道: 理牌区 - 头墩 (占25%) -->
      <section class="layout-row card-arrangement-dun front-dun-area" style="height: 25%;">
        <div class="placeholder-content">
          <p>第二道横幅：头墩区 (25%)</p>
        </div>
      </section>

      <!-- 第3道: 理牌区 - 中墩 (占25%) -->
      <section class="layout-row card-arrangement-dun mid-dun-area" style="height: 25%;">
        <div class="placeholder-content">
          <p>第三道横幅：中墩区 (25%)</p>
        </div>
      </section>

      <!-- 第4道: 理牌区 - 尾墩 (占25%) -->
      <section class="layout-row card-arrangement-dun back-dun-area" style="height: 25%;">
        <div class="placeholder-content">
          <p>第四道横幅：尾墩区 (25%)</p>
        </div>
      </section>
      
      <!-- 第5道: 按钮区 (占15%) -->
      <section class="layout-row button-action-row" style="height: 15%;">
        <div class="placeholder-content">
          <p>第五道横幅：按钮区 (15%)</p>
        </div>
      </section>
    </main>

    <footer class="app-footer">
      <p>简易十三水游戏</p>
    </footer>
  </div>
</template>

<script setup>
// Script setup is kept minimal for this barebones layout
// import { ref, onMounted } from 'vue';
// import { useGameStore } from './stores/gameStore'; // Temporarily unused

// const gameStore = useGameStore(); // Temporarily unused

// onMounted(() => {
//   console.log("Barebones App.vue mounted.");
//   // No automatic actions like fetching hands in this version
// });
</script>

<style>
/* 全局 Reset 和基础样式 */
html, body {
  margin: 0;
  padding: 0;
  height: 100%;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background-color: #f0f4f8; /* 淡雅的背景色 */
  color: #333;
}

#thirteen-water-app {
  display: flex;
  flex-direction: column;
  height: 100vh; /* 强制占满整个视口 */
  max-width: 900px; /* 或根据你的设计调整 */
  margin: 0 auto; /* 水平居中 */
  background-color: #ffffff;
  box-shadow: 0 0 15px rgba(0,0,0,0.1);
}

.app-header {
  padding: 15px 20px;
  background-color: #007bff;
  color: white;
  text-align: center;
  flex-shrink: 0; /* 防止头部被压缩 */
}
.app-header h1 {
  margin: 0;
  font-size: 1.8em;
}
.header-info {
  margin-top: 5px;
  font-size: 0.9em;
  opacity: 0.9;
}

.game-board-layout {
  flex-grow: 1; /* 使 main 内容区占据剩余空间 */
  display: flex;
  flex-direction: column; /* 垂直排列五个横幅 */
  padding: 10px; /* 给整个牌桌一些内边距 */
  gap: 10px; /* 横幅之间的间隔 */
  overflow: hidden; /* 防止内部滚动条影响整体布局 */
}

.layout-row {
  width: 100%;
  box-sizing: border-box; /* 内边距和边框不增加总宽度 */
  border: 1px dashed #ccc; /* 临时边框，方便看区域划分 */
  padding: 8px; /* 给每个横幅一些内边距 */
  display: flex; 
  justify-content: center; /* 水平居中占位符文本 */
  align-items: center; /* 垂直居中占位符文本 */
  background-color: #fdfdfd;
  border-radius: 4px;
  overflow: hidden; 
}
.placeholder-content {
  text-align: center;
  color: #888;
  font-style: italic;
}

/* 高度分配给每个横幅 */
.status-banner-row { flex-shrink: 0; /* 不被压缩 */ } /* height is set inline */
.card-arrangement-dun { flex-shrink: 0; } /* height is set inline */
.button-action-row { flex-shrink: 0; } /* height is set inline */


.app-footer {
  padding: 10px 20px;
  text-align: center;
  font-size: 0.85em;
  color: #6c757d;
  border-top: 1px solid #eee;
  flex-shrink: 0; /* 防止被压缩 */
}
</style>
