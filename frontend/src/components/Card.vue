<template>
  <div class="card-draggable" :class="{ 'face-down': !isFaceUp }">
    <img :src="imageUrl" :alt="altText" draggable="false" />
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  card: {
    type: Object,
    default: null,
  },
  isFaceUp: {
    type: Boolean,
    default: true,
  },
  // 'selected' prop 可能会被拖拽库自身的选中状态管理所取代或辅助
});

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
  const rankDisplay = (rankName) => {
    if (!rankName) return '?';
    if (['jack', 'queen', 'king', 'ace'].includes(rankName.toLowerCase())) {
      return rankName.charAt(0).toUpperCase();
    }
    // 假设 rankName 可能为数字字符串 '2'...'9' 或 '10'
    return rankName === '10' ? 'T' : (props.card.name || '?');
  };
  return `${rankDisplay(props.card.name)} of ${props.card.suit || 'unknown'}`;
});
</script>

<style scoped>
.card-draggable {
  width: 68px;
  height: 95px;
  border: 1px solid #b0b0b0;
  border-radius: 6px;
  overflow: hidden;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  margin: 3px;
  cursor: grab;
  transition: transform 0.15s ease-out, box-shadow 0.15s ease-out;
  background-color: white;
  user-select: none;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}
.card-draggable:active {
  cursor: grabbing;
}
.card-draggable img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  pointer-events: none; /* Crucial for drag-and-drop libraries */
}
/* Styles for VueDraggableNext/SortableJS integration */
.sortable-ghost {
  opacity: 0.4;
  background-color: #cce5ff;
  border: 1px dashed #007bff;
}
.sortable-chosen { /* The item being dragged */
  opacity: 0.8;
  transform: scale(1.05);
  box-shadow: 0 5px 15px rgba(0,0,0,0.2);
}
.sortable-drag { /* Another class often used for the dragged item if chosen isn't enough */
  /* Similar to sortable-chosen if needed */
}
.face-down {
  cursor: default;
}
</style>
