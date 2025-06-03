<template>
  <div class="player-hand-container">
    <h4>{{ title }} ({{ cards.length }} cards)</h4>
    <div
      class="card-container"
      @dragover.prevent="onDragOver"
      @drop="onDrop"
      @dragleave="onDragLeave"
      :class="{ 'drag-over': isDragOver }"
    >
      <CardComponent
        v-for="card in cards"
        :key="card.id"
        :card="card"
        :draggable="draggableCards"
        @dragstart="$emit('cardDragStart', { card, fromSegment: segmentName })"
      />
      <span v-if="cards.length === 0 && droppable" class="drop-placeholder">
        拖拽牌到这里 ({{ segmentName === 'front' ? 3 : 5 }}张)
      </span>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import CardComponent from './Card.vue'; // Corrected import name

const props = defineProps({
  cards: {
    type: Array,
    default: () => []
  },
  title: {
    type: String,
    default: '手牌'
  },
  draggableCards: { // 是否允许从这个区域拖出牌
    type: Boolean,
    default: false
  },
  droppable: { // 是否允许牌拖入这个区域
     type: Boolean,
     default: false
  },
  segmentName: { // 'initial', 'front', 'middle', 'back'
     type: String,
     required: true
  }
});

const emit = defineEmits(['cardDropped', 'cardDragStart']);

const isDragOver = ref(false);

function onDragOver(event) {
  if (props.droppable) {
    event.preventDefault(); // Necessary to allow drop
    isDragOver.value = true;
  }
}

function onDragLeave() {
  isDragOver.value = false;
}

function onDrop(event) {
  if (props.droppable) {
    event.preventDefault();
    isDragOver.value = false;
    const cardData = event.dataTransfer.getData('text/plain');
    try {
      const card = JSON.parse(cardData);
      emit('cardDropped', { card, toSegment: props.segmentName });
    } catch (e) {
      console.error("Failed to parse dropped card data:", e);
    }
  }
}
</script>

<style scoped>
.player-hand-container {
  margin-bottom: 10px;
}
.drag-over {
  border-color: #4CAF50; /* Highlight when dragging over */
  background-color: #e8f5e9;
}
.drop-placeholder {
  color: #aaa;
  font-style: italic;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100px; /* Same as card container */
}
</style>
