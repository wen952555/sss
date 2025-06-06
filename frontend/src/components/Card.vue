<template>
  <div class="card" :class="{ 'face-down': !isFaceUp, selected: selected }" @click="onClickCard">
    <img :src="imageUrl" :alt="altText" draggable="false" />
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  card: {
    type: Object, // 期望是 { id: 'ace_of_spades', rank: 14, suit: 'spades', name: 'ace' } 或 null
    default: null,
  },
  isFaceUp: {
    type: Boolean,
    default: true,
  },
  selected: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['click']);

const imageUrl = computed(() => {
  if (!props.isFaceUp || !props.card || !props.card.id || props.card.id === 'back' || props.card.id === 'unknown') {
    return `/cards/back.png`;
  }
  return `/cards/${props.card.id}.png`;
});

const altText = computed(() => {
  if (!props.isFaceUp || !props.card || !props.card.id || props.card.id === 'back' || props.card.id === 'unknown') {
    return 'Card Back';
  }
  // 使用 card.name (如 'ace', 'king') 和 card.suit
  const rankDisplay = (rankName) => {
    if (!rankName) return '?';
    if (['jack', 'queen', 'king', 'ace'].includes(rankName.toLowerCase())) {
      return rankName.charAt(0).toUpperCase();
    }
    return rankName === '10' ? 'T' : rankName; // 假设 rankName 是 '2'...'10', 'jack'...
  };
  return `${rankDisplay(props.card.name)} of ${props.card.suit}`;
});

function onClickCard() {
  if (props.card && props.card.id !== 'back' && props.card.id !== 'unknown') { // 只有有效的牌才能被点击
    emit('click', props.card);
  }
}
</script>

<style scoped>
.card {
  width: 65px; /* 标准卡牌宽度 */
  height: 90px; /* 标准卡牌高度 */
  border: 1px solid #b0b0b0;
  border-radius: 5px;
  overflow: hidden;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  margin: 2px;
  cursor: pointer;
  transition: transform 0.15s ease-out, box-shadow 0.15s ease-out;
  background-color: white;
  user-select: none; /* 防止图片被选中 */
}
.card img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
.card:hover:not(.face-down) {
  transform: translateY(-3px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}
.card.selected {
  outline: 2px solid #007bff;
  outline-offset: 1px;
  transform: translateY(-4px) scale(1.05);
  box-shadow: 0 0 10px rgba(0,123,255,0.5);
}
.card.face-down {
  cursor: default;
}
</style>
