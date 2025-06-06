<template>
  <div class="game-table">
    <h1>十三水游戏桌 (基础版)</h1>
    <div class="controls">
      <AppButton @click="initializeGame">开始新游戏/重新发牌</AppButton>
    </div>

    <div v-if="gameStore.players.length" class="players-area">
      <PlayerHand
        v-for="player in gameStore.players"
        :key="player.id"
        :player-name="player.name"
        :cards="player.hand"
        :show-cards="true"
      />
    </div>
    <div v-else>
      点击 "开始新游戏" 来发牌。
    </div>

    <!-- 预留其他模块的按钮 -->
    <!-- <AppButton @click="openChatModule">打开聊天</AppButton> -->
    <!-- <AppButton @click="showLeaderboard">查看排行榜</AppButton> -->
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useGameStore } from '@/store/gameStore';
import PlayerHand from '@/components/game/PlayerHand.vue';
import AppButton from '@/components/common/AppButton.vue';

const gameStore = useGameStore();

const initializeGame = () => {
  // 实际游戏中可能需要选择玩家数量
  gameStore.initializeGame(2); // 示例：2个玩家
};

onMounted(() => {
  // 可以在这里自动开始游戏，或者等待用户点击
  // initializeGame();
});

// function openChatModule() { alert("聊天模块待实现"); }
// function showLeaderboard() { alert("排行榜模块待实现"); }
</script>

<style scoped>
.game-table {
  max-width: 900px;
  margin: 20px auto;
  padding: 20px;
  font-family: sans-serif;
}
.controls {
  margin-bottom: 20px;
}
.controls .app-button {
  margin-right: 10px;
}
.players-area {
  margin-top: 20px;
}
</style>
