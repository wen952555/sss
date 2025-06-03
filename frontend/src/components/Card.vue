<template>
  <div class="card" :draggable="draggable" @dragstart="onDragStart">
    <img v-if="imageSrc" :src="imageSrc" :alt="altText" />
    <span v-else>{{ card.displayValue }}{{ card.suitSymbol }}</span>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  card: {
    type: Object,
    required: true // e.g., { suit: 'hearts', value: 'ace', id: 'ace_of_hearts' }
  },
  draggable: {
    type: Boolean,
    default: false
  }
});

// 构造图片路径，假设图片在 public/cards/ 目录下
// 后端 Card.id 应该直接就是文件名（不含扩展名）
const imageSrc = computed(() => {
  if (props.card && props.card.id) {
    return `/cards/${props.card.id}.svg`; // 例如 /cards/ace_of_spades.svg
  }
  return '';
});

const altText = computed(() => {
  return `${props.card.value} of ${props.card.suit}`;
});

const emit = defineEmits(['dragstart']);

function onDragStart(event) {
  if (props.draggable) {
    event.dataTransfer.setData('text/plain', JSON.stringify(props.card));
    event.dataTransfer.effectAllowed = 'move';
    emit('dragstart', props.card);
  }
}
</script>

<style scoped>
/* Card.vue specific styles, if any, are in main.css for simplicity now */
</style>
