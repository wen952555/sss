<template>
  <div class="score-board">
    <h4>计分板</h4>
    <ul>
      <li v-for="player in players" :key="player.id">
        {{ player.name }}: {{ player.score }}
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
// 假设玩家对象包含分数
interface PlayerWithScore {
  id: string;
  name: string;
  score: number;
}

defineProps<{
  players: PlayerWithScore[];
}>();
</script>

<style scoped>
.score-board {
  border: 1px solid #ddd;
  padding: 10px;
  margin-top: 20px;
  border-radius: 4px;
}
.score-board ul {
  list-style: none;
  padding: 0;
}
.score-board li {
  padding: 5px 0;
}
</style>
