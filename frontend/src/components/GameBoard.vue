<template>
  <div class="game-table-container">
    <!-- 顶部信息横幅 (保持或微调) -->
    <div class="game-info-banner">
      <div class="banner-left">
        <span>ID: {{ gameStore.gameId?.slice(-6) }}</span>
        <span>状态: <strong :class="statusClass">{{ gameStatusDisplay }}</strong></span>
      </div>
      <div class="banner-center player-turns-compact">
        <span v-for="player in gameStore.gameState?.players" :key="player.id"
              class="player-status-tag"
              :class="{
                'is-current': player.id === gameStore.playerId,
                'is-host': player.is_host,
                'is-submitted': player.submitted_hand && gameStore.gameStatus === 'arranging',
                'is-disconnected': !player.connected
              }">
          {{ player.name.substring(0, 4) }}{{ player.id === gameStore.playerId ? '(你)' : '' }}
          <span v-if="player.submitted_hand && gameStore.gameStatus === 'arranging'">✓</span>
          <span v-if="!player.connected && gameStore.gameStatus !== 'waiting_for_players'">⚡</span>
        </span>
      </div>
      <div class="banner-right">
        <span v-if="gameStore.currentPlayerData" class="current-player-score">
          得分: {{ gameStore.currentPlayerData.score }}
        </span>
        <button
          v-if="gameStore.gameStatus === 'waiting_for_players' && gameStore.isHost && gameStore.canDeal"
          @click="handleDealCards"
          :disabled="gameStore.isLoading"
          class="banner-button deal-btn">
          开始游戏
        </button>
        <button
          v-if="gameStore.gameStatus === 'game_over' && gameStore.isHost"
          @click="restartGame"
          :disabled="gameStore.isLoading"
          class="banner-button restart-btn">
          再来一局
        </button>
        <button @click="leaveGameAndClearData" :disabled="gameStore.isLoading" class="banner-button leave-btn">离开</button>
      </div>
    </div>

    <!-- 主要牌桌区域 -->
    <div class="poker-table-area">
      <div class="table-surface">
        <!-- 其他玩家的位置 (示例：最多支持4人，一个顶部，一个左，一个右) -->
        <div v-for="(player, index) in opponentPositions" :key="player.id"
             :class="['opponent-player-slot', player.positionClass]">
          <div class="player-info-on-table">
            <span class="player-name">{{ player.name.substring(0,5) }} {{ player.is_host ? '👑' : '' }}</span>
            <span class="player-score">分:{{ player.score }}</span>
            <span v-if="!player.connected" class="status-indicator disconnected">断</span>
            <span v-else-if="gameStore.gameStatus === 'arranging' && player.submitted_hand" class="status-indicator submitted">✓</span>
          </div>
          <div class="opponent-hand-display">
            <!-- 在摆牌阶段显示牌背 -->
            <template v-if="gameStore.gameStatus === 'arranging' && player.connected && !player.submitted_hand">
              <div class="card-stack-opponent">
                <Card v-for="i in 13" :key="`back-${player.id}-${i}`" :card="{id:'back'}" :is-face-up="false" class="stacked"/>
              </div>
            </template>
            <!-- 在比牌或结束阶段显示摊开的牌 -->
            <template v-else-if="(gameStore.gameStatus === 'comparing' || gameStore.gameStatus === 'game_over') && player.evaluated_hand">
              <div class="opponent-arranged-cards">
                <div v-if="player.evaluated_hand.is_special_overall" class="special-hand-name-opponent">
                  {{ player.evaluated_hand.special_details.name_cn || player.evaluated_hand.special_details.name }}
                </div>
                <div class="dun-row-opponent">
                  <strong>头:</strong>
                  <Card v-for="cid in player.submitted_hand?.front" :key="`opp-f-${cid}`" :card="{id:cid}" class="table-card small"/>
                </div>
                <div class="dun-row-opponent">
                  <strong>中:</strong>
                  <Card v-for="cid in player.submitted_hand?.middle" :key="`opp-m-${cid}`" :card="{id:cid}" class="table-card small"/>
                </div>
                <div class="dun-row-opponent">
                  <strong>尾:</strong>
                  <Card v-for="cid in player.submitted_hand?.back" :key="`opp-b-${cid}`" :card="{id:cid}" class="table-card small"/>
                </div>
              </div>
            </template>
             <div v-else-if="gameStore.gameStatus === 'waiting_for_players' && !player.id.startsWith('empty-')" class="waiting-text">等待中</div>
             <div v-else-if="player.id.startsWith('empty-')" class="empty-seat-text">空位</div>

          </div>
        </div>

        <!-- 游戏日志 (可以放在牌桌中间或一个角落) -->
        <div class="game-log-on-table" v-if="gameStore.gameState && gameStore.gameState.log.length > 0">
          <p v-for="(log, index) in gameStore.gameState.log.slice(-2)" :key="`log-table-${index}`">{{ log }}</p>
        </div>

      </div>
    </div>

    <!-- 当前玩家的操作区域 (通常在底部) -->
    <div class="current-player-zone" v-if="gameStore.gameState">
      <div v-if="isCurrentPlayerArranging" class="current-player-arranging-area">
        <PlayerHand />
      </div>
      <div v-else-if="gameStore.gameStatus === 'waiting_for_players' && !gameStore.isHost && gameStore.currentPlayerData" class="waiting-for-host">
        等待房主开始游戏...
      </div>
       <div v-else-if="gameStore.gameStatus === 'comparing' || gameStore.gameStatus === 'game_over'" class="results-summary-current-player">
         <!-- 当前玩家的最终牌型可以在PlayerHand组件中展示，或者在这里单独展示 -->
         <div v-if="gameStore.currentPlayerData && gameStore.currentPlayerData.evaluated_hand">
            <h4 style="text-align:center; margin-bottom: 5px;">我的牌型</h4>
            <div class="opponent-arranged-cards my-final-cards"> <!-- 复用样式 -->
                <div v-if="gameStore.currentPlayerData.evaluated_hand.is_special_overall" class="special-hand-name-opponent">
                  {{ gameStore.currentPlayerData.evaluated_hand.special_details.name_cn || gameStore.currentPlayerData.evaluated_hand.special_details.name }}
                </div>
                 <div class="dun-row-opponent">
                  <strong>头:</strong>
                  <Card v-for="cid in gameStore.currentPlayerData.submitted_hand?.front" :key="`my-f-${cid}`" :card="{id:cid}" class="table-card"/>
                </div>
                <div class="dun-row-opponent">
                  <strong>中:</strong>
                  <Card v-for="cid in gameStore.currentPlayerData.submitted_hand?.middle" :key="`my-m-${cid}`" :card="{id:cid}" class="table-card"/>
                </div>
                <div class="dun-row-opponent">
                  <strong>尾:</strong>
                  <Card v-for="cid in gameStore.currentPlayerData.submitted_hand?.back" :key="`my-b-${cid}`" :card="{id:cid}" class="table-card"/>
                </div>
            </div>
         </div>
      </div>
       <div v-else-if="gameStore.gameStatus === 'arranging' && gameStore.currentPlayerData && gameStore.currentPlayerData.submitted_hand" class="waiting-others-submit">
           您已提交牌型，等待其他玩家...
       </div>
    </div>
    <p v-if="gameStore.error && !isCurrentPlayerArranging" class="feedback-message error global-error-table">{{ gameStore.error }}</p>
    <div v-if="!gameStore.gameState && gameStore.isLoading" class="loading-streamlined table-loading">正在加载游戏...</div>
    <div v-else-if="!gameStore.gameState && !gameStore.isLoading && gameStore.gameId" class="loading-streamlined table-loading">连接中或游戏已结束/不存在...</div>

  </div>
</template>

<script setup>
// ... (script setup 部分与上一版本 GameBoard.vue 的 script setup 基本相同)
// 主要增加 opponentPositions 计算属性
import { computed, onMounted, onUnmounted } from 'vue';
import { useGameStore } from '../store/game';
import Card from './Card.vue';
import PlayerHand from './PlayerHand.vue'; // PlayerHand 现在是当前玩家的摆牌界面

const gameStore = useGameStore();

onMounted(() => { /* ... */ });
onUnmounted(() => { /* ... */ });

const gameStatusDisplay = computed(() => { /* ... */ });
const statusClass = computed(() => `status-${gameStore.gameStatus}`);
const isCurrentPlayerArranging = computed(() => { /* ... */ });

async function handleDealCards() { /* ... */ }
async function restartGame() { /* ... */ }
function leaveGameAndClearData() { /* ... */ }

// 计算其他玩家在牌桌上的位置
const opponentPositions = computed(() => {
  if (!gameStore.gameState || !gameStore.gameState.players) return [];
  const otherPlayers = gameStore.gameState.players.filter(p => p.id !== gameStore.playerId);
  const positions = []; // 存储最终带位置信息的玩家对象

  // 根据游戏人数确定布局 (这里简单示例，实际可能更复杂)
  // 假设最多4人：1个顶部，1个左，1个右
  const layoutClasses = {
    1: ['opponent-top'], // 如果只有1个对手
    2: ['opponent-left', 'opponent-right'], // 2个对手
    3: ['opponent-left', 'opponent-top', 'opponent-right'] // 3个对手
  };

  const numOpponents = otherPlayers.length;
  const currentLayout = layoutClasses[numOpponents] || ['opponent-top']; // 默认顶部

  // 填充其他玩家
  for (let i = 0; i < numOpponents; i++) {
    if (otherPlayers[i]) {
      positions.push({
        ...otherPlayers[i],
        positionClass: currentLayout[i] || `opponent-generic-${i}` // 如果布局类不够，给个通用类
      });
    }
  }
  
  // 如果是2人局，通常对手在顶部
  if (gameStore.gameState.num_players === 2 && positions.length === 1) {
      positions[0].positionClass = 'opponent-top';
  }

  // 如果需要固定显示3个对手位，即使人不够，可以用空位填充
  const maxOpponentSlots = 3; // 假设牌桌上除了自己，最多再显示3个对手位
  while(positions.length < maxOpponentSlots && gameStore.gameState.num_players > positions.length + 1) {
      const emptySlotIndex = positions.length;
      positions.push({
          id: `empty-slot-${emptySlotIndex}`,
          name: '空位',
          score: '-',
          connected: false, // 标记为空位
          positionClass: currentLayout[emptySlotIndex] || `opponent-generic-${emptySlotIndex}`
      });
  }


  return positions;
});

</script>

<style scoped>
.game-table-container {
  display: flex;
  flex-direction: column;
  height: 100vh; /* 占满整个视口高度 */
  background-color: #3d8a55; /* 深绿色牌桌布颜色 */
  overflow: hidden; /* 防止内容溢出导致滚动条 */
  color: #fff; /* 牌桌上文字默认为白色 */
}

.game-info-banner {
  /* ... (样式与上一版本基本相同，但背景和颜色可能需要调整以适应牌桌主题) ... */
  background-color: rgba(0,0,0,0.3); /* 半透明黑色背景 */
  color: #f0f0f0;
  position: absolute; /* 改为绝对定位，覆盖在牌桌上 */
  top: 0;
  left: 0;
  right: 0;
  z-index: 100; /* 确保在最上层 */
  box-shadow: none; /* 移除阴影，使其更融入牌桌 */
  padding: 8px 15px;
}
.banner-left span, .banner-right span, .banner-center .player-status-tag {
    color: #e0e0e0; /* 调整文字颜色 */
}
.player-status-tag { background-color: rgba(255,255,255,0.15); border-color: rgba(255,255,255,0.3); }
.player-status-tag.is-current { background-color: #4a90e2; } /* 亮蓝色 */
.player-status-tag.is-submitted { background-color: #50c878; } /* 翡翠绿 */
.player-status-tag.is-disconnected { background-color: #e74c3c; }

.poker-table-area {
  flex-grow: 1; /* 占据除了顶部banner和底部操作区之外的剩余空间 */
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px; /* 牌桌边缘留白 */
  padding-top: 60px; /* 为顶部 banner 留出空间 */
  padding-bottom: 180px; /* 为底部当前玩家操作区留出空间 */
}

.table-surface {
  width: 90vw; /* 牌桌宽度 */
  height: 65vh; /* 牌桌高度 */
  max-width: 1000px;
  max-height: 600px;
  background-color: #00693e; /* 更深的绿色作为牌桌实际桌面 */
  border-radius: 150px / 80px; /* 椭圆形牌桌 */
  border: 10px solid #5a3a22; /* 木质边框 */
  box-shadow: 0 10px 30px rgba(0,0,0,0.5), inset 0 0 20px rgba(0,0,0,0.3);
  position: relative; /* 用于定位其他玩家和日志 */
  display: flex; /* 可以用于内部元素的对齐，但主要靠绝对定位子元素 */
  justify-content: center;
  align-items: center;
}

/* 其他玩家位置 */
.opponent-player-slot {
  position: absolute; /* 相对于 table-surface 定位 */
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 120px; /* 根据牌数量调整 */
}
.player-info-on-table {
  background-color: rgba(0,0,0,0.4);
  color: #f0f0f0;
  padding: 3px 8px;
  border-radius: 5px;
  font-size: 0.8rem;
  margin-bottom: 5px;
  text-align: center;
  white-space: nowrap;
}
.player-info-on-table .player-name { font-weight: bold; }
.player-info-on-table .player-score { margin-left: 5px; }
.status-indicator { margin-left: 5px; font-weight: bold; }
.status-indicator.disconnected { color: #ff6b6b; }
.status-indicator.submitted { color: #63e6be; }

.opponent-hand-display {
  display: flex;
  justify-content: center;
  align-items: center;
  /* background-color: rgba(255,255,255,0.05); */
  /* padding: 5px; */
  /* border-radius: 4px; */
}
.card-stack-opponent { display: flex; }
.card-stack-opponent .card.stacked {
  margin-left: -50px; /* 卡牌重叠效果 */
  box-shadow: 1px 1px 3px rgba(0,0,0,0.3);
  transform: scale(0.7); /* 对手牌缩小显示 */
}
.card-stack-opponent .card.stacked:first-child {
  margin-left: 0;
}
.opponent-arranged-cards {
  font-size: 0.75rem;
  color: #ccc;
  text-align: center;
}
.special-hand-name-opponent { font-weight: bold; margin-bottom: 3px; color: #ffdd57; }
.dun-row-opponent { display: flex; align-items: center; justify-content: center; margin-bottom: 2px; }
.dun-row-opponent strong { margin-right: 4px; font-size:0.9em; }
.table-card { /* 用于牌桌上显示的牌，包括对手的 */
  transform: scale(0.65); /* 整体缩小 */
  margin: 1px !important; /* 减小间距 */
  border-width: 1px;
}
.table-card.small { transform: scale(0.55); margin: 0 -5px !important; } /* 更小的牌，用于对手摊牌 */


/* 不同位置的对手 */
.opponent-top { top: 20px; left: 50%; transform: translateX(-50%); flex-direction: column; }
.opponent-left { left: 20px; top: 50%; transform: translateY(-50%) rotate(90deg); }
.opponent-left .player-info-on-table { transform: rotate(-90deg); margin-bottom: 10px; margin-right: -20px; }
.opponent-right { right: 20px; top: 50%; transform: translateY(-50%) rotate(-90deg); }
.opponent-right .player-info-on-table { transform: rotate(90deg); margin-bottom: 10px; margin-left: -20px;}

.waiting-text, .empty-seat-text { font-size: 0.8rem; color: rgba(255,255,255,0.5); padding: 10px; }


.game-log-on-table {
  position: absolute;
  bottom: 20px; /* 或者放在牌桌中间 */
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(0,0,0,0.3);
  padding: 5px 10px;
  border-radius: 5px;
  font-size: 0.75rem;
  max-width: 80%;
  text-align: center;
  max-height: 50px;
  overflow: hidden;
}
.game-log-on-table p { margin: 1px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;}

/* 当前玩家操作区域 */
.current-player-zone {
  position: fixed; /* 固定在底部 */
  bottom: 0;
  left: 0;
  right: 0;
  background-color: rgba(44, 62, 80, 0.85); /* 半透明深色背景 */
  backdrop-filter: blur(5px); /* 毛玻璃效果 */
  padding: 10px;
  z-index: 50; /* 低于顶部banner */
  box-shadow: 0 -2px 10px rgba(0,0,0,0.3);
  /* min-height: 170px; */ /* 确保有足够空间放 PlayerHand */
  display: flex;
  justify-content: center;
  align-items: center;
}
.current-player-arranging-area {
  width: 100%;
  max-width: 700px; /* PlayerHand 的最大宽度 */
}
.waiting-for-host, .results-summary-current-player, .waiting-others-submit {
  color: #f0f0f0;
  text-align: center;
  padding: 20px;
  font-size: 1.1rem;
}
.my-final-cards .table-card { transform: scale(0.8); } /* 自己摊牌时可以稍大些 */


.feedback-message.error.global-error-table { /* 全局错误提示，放在牌桌底部 */
    position: fixed;
    bottom: 180px; /* 放在当前玩家操作区上方 */
    left: 50%;
    transform: translateX(-50%);
    z-index: 60;
    padding: 8px 15px;
    background-color: #ffdddd;
    color: #d32f2f;
    border: 1px solid #ffcdd2;
    border-radius: 6px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
}
.table-loading {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: white;
    background-color: rgba(0,0,0,0.5);
    padding: 20px;
    border-radius: 8px;
}

/* 确保 Card.vue 中的样式不会与这里的冲突，或者按需调整 */
</style>
