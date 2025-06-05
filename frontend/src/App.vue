<template>
  <div id="thirteen-water-app" class="game-container">
    <header class="app-header">
      <h1>十三水在线对战 (核心摆牌模式)</h1>
      <div class="header-info" v-if="gameStore.playerSessionId">
          会话ID: <small>{{ gameStore.playerSessionId.substring(0, 8) }}...</small>
      </div>
    </header>

    <main class="game-board-layout">
      <!-- 第1道: 各玩家状态横幅显示 (占10%) -->
      <section class="layout-row status-banner-row">
        <div class="status-banner-content">
          <!-- 暂时占位，以后可以放多个玩家的简要状态 -->
          <div v-if="gameStore.myPlayerDetails" class="player-status-summary">
            玩家: {{ gameStore.myPlayerDetails.name || '当前玩家' }} 
            (分数: {{ gameStore.myPlayerDetails.score || 0 }})
          </div>
          <div v-else-if="!gameStore.isLoading">请先获取手牌</div>
          <!-- 以后这里可以 v-for 渲染其他玩家的摘要 -->
        </div>
      </section>

      <!-- 第2, 3, 4道: 理牌区 (各占25%，合并为一个大区域或分三块) -->
      <!-- 为了简化，先将 PlayerHandInput 放入一个占据整体75%的区域 -->
      <section class="layout-row card-arrangement-area">
        <PlayerHandInput 
          v-if="gameStore.myCards && gameStore.myCards.length > 0 && !handIsSubmitted"
          :initial-cards="gameStore.myCards"
          :is-submitted="handIsSubmitted" 
          @hand-submitted="onHandSubmitted" 
        />
        <div v-else-if="handIsSubmitted" class="submitted-info-main">
            <p>牌型已提交！等待处理...</p>
            <!-- 可以考虑显示已提交的牌墩 -->
        </div>
        <div v-else-if="!gameStore.isLoading && !gameStore.hasError && (!gameStore.myCards || gameStore.myCards.length === 0)" class="no-cards-info">
            <p>请点击下方“获取新手牌”开始游戏。</p>
        </div>
         <div v-if="gameStore.isLoading && (!gameStore.myCards || gameStore.myCards.length === 0)" class="loading-message-main">
            正在加载手牌...
        </div>
        <div v-if="gameStore.hasError" class="error-message-main">
            错误: {{ gameStore.error }}
        </div>
      </section>

      <!-- 第5道: 按钮区 (占15%) -->
      <section class="layout-row button-action-row">
        <div class="button-area-content">
          <button @click="fetchNewHand" :disabled="gameStore.isLoading">
            {{ (gameStore.myCards && gameStore.myCards.length > 0 && !handIsSubmitted) ? '重新发牌' : '获取新手牌' }}
          </button>
          <!-- 提交按钮现在在 PlayerHandInput 内部，但也可以在这里放一个全局的，根据 PlayerHandInput 的状态决定是否可用 -->
          <!-- <button 
            v-if="gameStore.myCards.length > 0 && !handIsSubmitted" 
            @click="triggerSubmitFromApp" 
            :disabled="!canAppSubmit || gameStore.isLoading"
            >
            从App提交 (测试)
          </button> -->
        </div>
      </section>
    </main>

    <footer class="app-footer">
      <p>简易十三水游戏 - Vue & PHP</p>
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useGameStore } from './stores/gameStore';
import PlayerHandInput from './components/PlayerHandInput.vue';
// 如果要创建 PlayerStatusSummary.vue
// import PlayerStatusSummary from './components/PlayerStatusSummary.vue';


const gameStore = useGameStore();
const handIsSubmitted = ref(false); 

// 用于从 App.vue 触发 PlayerHandInput 内部的提交逻辑 (如果需要)
// const playerHandInputRef = ref(null); 
// const canAppSubmit = computed(() => playerHandInputRef.value?.canSubmitHandFromParent());
// function triggerSubmitFromApp() {
//   playerHandInputRef.value?.submitFromParent();
// }


async function onHandSubmitted(arrangedHands) {
  await gameStore.submitArrangedHand(arrangedHands.front, arrangedHands.mid, arrangedHands.back);
  if (!gameStore.error) {
    handIsSubmitted.value = true;
    // 可以在这里添加一些提交成功后的逻辑，比如短暂显示消息
    setTimeout(() => {
        // 简化模式下，可以自动获取新手牌开始下一轮，或者显示一个“再来一局”的按钮
        // fetchNewHand(); // 例如：3秒后自动获取新手牌
    }, 3000);
  }
}

async function fetchNewHand() {
  handIsSubmitted.value = false; // 重置提交状态
  gameStore.clearCoreData(); // 清理旧手牌等核心数据，但不清理session_id
  await gameStore.fetchInitialHand();
}

onMounted(async () => {
    await gameStore.fetchInitialHand();
});

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
  min-height: 100vh; /* 使应用至少占据整个视口高度 */
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
  border-bottom: 3px solid #0056b3;
}
.app-header h1 {
  margin: 0;
  font-size: 1.8em;
}
.header-info {
  margin-top: 5px;
  font-size: 0.8em;
  opacity: 0.9;
}

.game-board-layout {
  flex-grow: 1; /* 使 main 内容区占据剩余空间 */
  display: flex;
  flex-direction: column; /* 垂直排列五个横幅 */
  padding: 10px; /* 给整个牌桌一些内边距 */
  gap: 10px; /* 横幅之间的间隔 */
}

.layout-row {
  width: 100%;
  box-sizing: border-box; /* 内边距和边框不增加总宽度 */
  border: 1px solid #dde; /* 临时边框，方便看区域 */
  padding: 8px; /* 给每个横幅一些内边距 */
  display: flex; /* 用于内部元素对齐 */
  justify-content: center;
  align-items: center;
  background-color: #fdfdfd;
  border-radius: 4px;
}

/* 第1道: 各玩家状态横幅显示 (占10%) */
.status-banner-row {
  min-height: 10vh; /* 使用视口高度的百分比 */
  /* 或者 flex-basis: 10%; 如果父容器 game-board-layout 是 flex container */
  /* background-color: #e9f7ff; */ /* 淡蓝色背景 */
}
.status-banner-content {
  width: 100%;
  display: flex; /* 如果有多个玩家状态并排显示 */
  justify-content: space-around;
  align-items: center;
  font-size: 0.9em;
}
.player-status-summary {
  padding: 5px 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background-color: #fff;
}


/* 第2, 3, 4道: 理牌区 (合并为75%) */
.card-arrangement-area {
  min-height: 60vh; /* 主要操作区域，占据较多高度 */
  /* 或者 flex-basis: 75%; */
  display: flex; /* 确保 PlayerHandInput 或提示信息能居中等 */
  flex-direction: column; /* 如果内部有多个元素垂直排列 */
  justify-content: flex-start; /* 内容从顶部开始 */
  align-items: stretch; /* PlayerHandInput 宽度充满 */
  padding: 15px; /* 给理牌区更多内边距 */
  overflow-y: auto; /* 如果内容过多，允许滚动 */
}
/* PlayerHandInput 组件的样式在其内部定义，这里确保它能正确填充 */
.card-arrangement-area > .player-hand-input {
    width: 100%;
    flex-grow: 1; /* 如果需要它填满剩余空间 */
}
.no-cards-info, .loading-message-main, .error-message-main, .submitted-info-main {
    text-align: center;
    padding: 20px;
    font-size: 1.1em;
    color: #555;
}
.error-message-main { color: red; }
.submitted-info-main { color: green; }


/* 第5道: 按钮区 (占15%) */
.button-action-row {
  min-height: 12vh; 
  /* 或者 flex-basis: 15%; */
  /* background-color: #f8f9fa; */ /* 浅灰色背景 */
}
.button-area-content {
  display: flex;
  gap: 15px;
}
.button-area-content button {
  padding: 10px 20px;
  font-size: 1em;
  border-radius: 5px;
  cursor: pointer;
  border: none;
  background-color: #007bff;
  color: white;
}
.button-area-content button:disabled {
  background-color: #ccc;
}


.app-footer {
  padding: 10px 20px;
  text-align: center;
  font-size: 0.85em;
  color: #6c757d;
  border-top: 1px solid #eee;
  margin-top: auto; /* 将 footer 推到底部，如果内容不足以撑满屏幕 */
}

/* loading 和 error message 的通用样式 (如果需要) */
.loading-message, .error-message {
  /* ... (与上一版相同) ... */
}

</style>
