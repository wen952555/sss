<template>
  <div class="playing-card" :class="{ 'face-down': !faceUp }">
    <img :src="imageUrl" :alt="altText" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Card } from '@/types';
import { getCardImageUrl } from '@/utils/cardUtils';

const props = defineProps<{
  card: Card | null; // 可以为null，表示牌背或空位
  faceUp?: boolean;
}>();

const defaultProps = withDefaults(props, {
  faceUp: true,
});

const imageUrl = computed((): string => {
  return getCardImageUrl(defaultProps.card, defaultProps.faceUp);
});

const altText = computed((): string => {
  if (!defaultProps.faceUp || !defaultProps.card) return 'Card back';
  return `${defaultProps.card.rank} of ${defaultProps.card.suit}`;
});
</script>

<style scoped>
.playing-card {
  width: 70px; /* 根据你的图片调整 */
  height: 100px; /* 根据你的图片调整 */
  border: 1px solid #ccc;
  border-radius: 5px;
  overflow: hidden;
  display: inline-block;
  margin: 2px;
  background-color: white; /* 以防图片加载失败 */
  box-shadow: 2px 2px 5px rgba(0,0,0,0.2);
}
.playing-card img {
  width: 100%;
  height: 100%;
  object-fit: contain; /* 或者 cover, fill */
}
</style>
