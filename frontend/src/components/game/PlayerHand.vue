<template>
  <div class="player-hand">
    <h3>{{ playerName }}'s Hand:</h3>
    <div class="cards-container">
      <PlayingCard
        v-for="card in cards"
        :key="card.id"
        :card="card"
        :face-up="showCards"
      />
      <div v-if="!cards.length">No cards</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import PlayingCard from './PlayingCard.vue';
import type { Card } from '@/types';

defineProps<{
  playerName: string;
  cards: Card[];
  showCards?: boolean;
}>();

// 为 props 设置默认值（如果需要）
// const props = withDefaults(defineProps<...>, {
//   showCards: true,
// });
</script>

<style scoped>
.player-hand {
  margin-bottom: 20px;
  padding: 10px;
  border: 1px solid #eee;
  border-radius: 8px;
}
.cards-container {
  display: flex;
  flex-wrap: wrap;
}
</style>
