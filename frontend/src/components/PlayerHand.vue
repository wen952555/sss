<template>
  <div class="player-hand-container">
    <!-- 移除或修改外部标题的显示方式 -->
    <!-- <h4>{{ title }}</h4> --> 
    <div
      class="card-container"
      @dragover.prevent="onDragOver"
      @drop="onDrop"
      @dragleave="onDragLeave"
      :class="{ 'drag-over': isDragOver, 'is-empty': cards.length === 0 }"
    >
      <CardComponent
        v-for="card in cards"
        :key="card.id"
        :card="card"
        :draggable="draggableCards"
        @dragstart="$emit('cardDragStart', { card, fromSegment: segmentName })"
      />
      <span v-if="cards.length === 0 && placeholderText" class="drop-placeholder">
        {{ placeholderText }}
      </span>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import CardComponent from './Card.vue';

const props = defineProps({
  cards: {
    type: Array,
    default: () => []
  },
  title: { // 这个 title 现在可能不直接显示，或者用作 placeholderText 的一部分
    type: String,
    default: '手牌'
  },
  placeholderText: { // 新增 prop，用于在卡片容器内显示的提示文字
    type: String,
    default: ''
  },
  draggableCards: {
    type: Boolean,
    default: false
  },
  droppable: {
    type: Boolean,
    default: false
  },
  segmentName: {
    type: String,
    required: true
  }
});

const emit = defineEmits(['cardDropped', 'cardDragStart']);
const isDragOver = ref(false);

function onDragOver(event) {
  if (props.droppable) {
    event.preventDefault();
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
.card-container {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  min-height: 100px; /* 根据卡片大小调整 */
  border: 1px dashed #ccc;
  padding: 10px; /* 增加内边距给 placeholder 空间 */
  border-radius: 4px;
  position: relative; /* 为了 placeholder 的定位 (如果需要更复杂的定位) */
  align-items: center; /* 垂直居中 placeholder */
  justify-content: center; /* 水平居中 placeholder (如果只有一个元素或为空时) */
}
.card-container.is-empty {
    background-color: #f9f9f9; /* 空的时候给个背景色区分 */
}
.drag-over {
  border-color: #4CAF50;
  background-color: #e8f5e9;
}
.drop-placeholder {
  color: #aaa;
  font-style: italic;
  text-align: center;
  width: 100%; /* 让 placeholder 占据整个容器宽度 */
}
/* 移除了 h4 的样式，因为我们不再直接显示 title 为 h4 */
</style>
