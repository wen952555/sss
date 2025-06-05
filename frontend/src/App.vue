<template>
  <div id="thirteen-water-app-barebones" class="game-container-barebones">
    <main class="game-board-layout-barebones">
      <!-- 第1道横幅 (10%) -->
      <section class="layout-row-barebones" style="height: 10%;"></section>

      <!-- 第2道横幅 (25%) -->
      <section class="layout-row-barebones" style="height: 25%;"></section>

      <!-- 第3道横幅 (25%) -->
      <section class="layout-row-barebones" style="height: 25%;"></section>

      <!-- 第4道横幅 (25%) -->
      <section class="layout-row-barebones" style="height: 25%;"></section>
      
      <!-- 第5道横幅 (15%) -->
      <section class="layout-row-barebones" style="height: 15%;"></section>
    </main>
  </div>
</template>

<script setup>
// Script setup is completely empty as per request for a barebones layout
</script>

<style>
/* 全局 Reset - 确保没有默认边距和内边距影响布局 */
html, body {
  margin: 0;
  padding: 0;
  height: 100%;
  width: 100%;
  overflow: hidden; /* 防止意外的滚动条 */
  background-color: #f0f4f8; /* 可以设置一个背景色，或者移除 */
}

#thirteen-water-app-barebones {
  display: flex; /* 只为了让 main 能够撑满 */
  flex-direction: column;
  height: 100vh; 
  width: 100vw;
  box-sizing: border-box;
  /* 移除 max-width 和 margin: auto 以便全屏显示骨架 */
  /* background-color: #ffffff; */ /* 可以移除背景色，让body的背景色透出来 */
  /* box-shadow: 0 0 15px rgba(0,0,0,0.1); */ /* 移除阴影 */
}

.game-board-layout-barebones {
  flex-grow: 1; 
  display: flex;
  flex-direction: column; 
  width: 100%;
  height: 100%; /* 确保它能撑满父容器的高度 */
  /* padding: 10px; */ /* 移除内边距 */
  /* gap: 10px; */ /* 移除间隔 */
  box-sizing: border-box;
}

.layout-row-barebones {
  width: 100%;
  box-sizing: border-box; 
  border: 1px solid #e0e0e0; /* 保留一个细边框以区分区域，如果完全不要，可以移除 */
  /* padding: 0; */ /* 移除内边距 */
  /* background-color: #fdfdfd; */ /* 移除背景色 */
  /* border-radius: 0; */ /* 移除圆角 */
  /* overflow: hidden; */ /* 移除，除非特定区域需要 */
  /* display: flex; justify-content: center; align-items: center; */ /* 移除，因为内部没有内容需要对齐 */
}

/* 可以为每个横幅设置不同的背景色进行调试，如果需要 */
/*
.layout-row-barebones:nth-child(1) { background-color: rgba(255,0,0,0.1); }
.layout-row-barebones:nth-child(2) { background-color: rgba(0,255,0,0.1); }
.layout-row-barebones:nth-child(3) { background-color: rgba(0,0,255,0.1); }
.layout-row-barebones:nth-child(4) { background-color: rgba(255,255,0,0.1); }
.layout-row-barebones:nth-child(5) { background-color: rgba(255,0,255,0.1); }
*/
</style>
