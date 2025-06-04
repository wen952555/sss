<template>
  <div class="player-status" :class="{ 'is-me': player.is_me, 'is-ready': player.is_ready, 'is-finished': isGameFinished }">
    <h4>{{ player.name }} {{ player.is_me ? '(你)' : '' }}</h4>
    <p class="status-text">
      状态:
      <span v-if="isGameFinished">已结束</span>
      <span v-else-if="player.is_ready">已提交牌型</span>
      <span v-else-if="gameStatus === 'playing'">正在摆牌...</span>
      <span v-else-if="gameStatus === 'waiting'">等待中...</span>
      <span v-else>{{ gameStatus }}</span>
    </p>
    <p>总分: {{ player.score }}</p>
    <p v-if="isGameFinished && player.round_score !== undefined">本局得分: {{ player.round_score > 0 ? '+' : '' }}{{ player.round_score }}</p>

    <div v-if="shouldShowHands" class="player-hands-display">
      <div class="dun-display">
        <strong>头墩:</strong>
        <CardDisplay v-for="card in player.hand_front" :key="'pf-'+card.id" :card="card" :small="true" :is-face-up="true" />
        <span v-if="!player.hand_front || player.hand_front.length === 0"> (未亮牌) </span>
      </div>
      <div class="dun-display">
        <strong>中墩:</strong>
        <CardDisplay v-for="card in player.hand_mid" :key="'pm-'+card.id" :card="card" :small="true" :is-face-up="true" />
         <span v-if="!player.hand_mid || player.hand_mid.length === 0"> (未亮牌) </span>
      </div>
      <div class="dun-display">
        <strong>尾墩:</strong>
        <CardDisplay v-for="card in player.hand_back" :key="'pb-'+card.id" :card="card" :small="true" :is-face-up="true" />
         <span v-if="!player.hand_back || player.hand_back.length === 0"> (未亮牌) </span>
      </div>
    </div>
    <div v-else-if="!player.is_me && gameStatus === 'playing' && !player.is_ready">
      <p> (对方正在思考...) </p>
      <CardDisplay :is-face-up="false" :small="true" v-for="n in 13" :key="'back-card-' + n" />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import CardDisplay from './CardDisplay.vue';

const props = defineProps({
  player: { type: Object, required: true }, // 玩家对象
  gameStatus: { type: String, required: true } // 'waiting', 'playing', 'finished'
});

const isGameFinished = computed(() => props.gameStatus === 'finished');

const shouldShowHands = computed(() => {
  // 游戏结束时，或玩家已准备好且不是自己（自己的牌在PlayerHandInput显示或已提交提示）
  // 或者 是自己，并且已提交，也在这里显示最终牌墩
  return isGameFinished.value || props.player.is_ready;
});
</script>

<style scoped>
.player-status {
  border: 1px solid #ddd;
  padding: 10px 15px;
  margin: 10px;
  border-radius: 6px;
  background-color: #fff;
  width: calc(50% - 22px); /* 简单实现两列布局，需要父容器 flex */
  box-sizing: border-box;
  transition: all 0.3s ease;
}
.player-status.is-me {
  border-left: 5px solid dodgerblue;
  background-color: #eaf4ff;
}
.player-status.is-ready {
  border-left: 5px solid mediumseagreen;
}
.player-status.is-finished.is-ready { /* 如果游戏结束且已准备，用完成色 */
    border-left-color: #6c757d;
}


.player-status h4 {
  margin-top: 0;
  margin-bottom: 8px;
  color: #333;
}
.status-text {
  font-style: italic;
  color: #555;
  font-size: 0.9em;
}
.player-hands-display {
  margin-top: 10px;
}
.dun-display {
  margin-bottom: 5px;
  font-size: 0.85em;
}
.dun-display strong {
  display: inline-block;
  width: 45px; /* 对齐牌墩名称 */
}
.dun-display .card-display { /* 覆盖CardDisplay的margin，使其更紧凑 */
    margin: 1px;
}
</style>
