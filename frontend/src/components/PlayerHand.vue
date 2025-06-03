<template>
  <div 
    class="player-hand-container"
    :data-segment-name="segmentName" <!-- 添加 data-attribute 用于识别 -->
    @dragover.prevent="onDragOverDesktop" <!-- 桌面端 -->
    @drop="onDropDesktop"                 <!-- 桌面端 -->
    @dragleave="onDragLeaveDesktop"        <!-- 桌面端 -->
    :class="{ 'drag-over': isDragOverDesktop }"
    ref="handContainerElement"
  >
    <div
      class="card-container"
      :class="{ 'is-empty': cards.length === 0 }"
    >
      <CardComponent
        v-for="card_item in cards" :key="card_item.id" <!-- 修改变量名避免与 props.card 冲突 -->
        :card="card_item"
        :draggable="draggableCards"
        @customDragStart="passCustomDragStart"
        @customDragEnd="passCustomDragEnd"
        @customDragOverSegment="passCustomDragOverSegment"
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
  cards: { type: Array, default: () => [] },
  placeholderText: { type: String, default: '' },
  draggableCards: { type: Boolean, default: false }, // 是否允许从这个区域拖出
  droppable: { type: Boolean, default: true }, // 这个区域是否接受放置 (现在主要由 App.vue 判断)
  segmentName: { type: String, required: true }
});

const emit = defineEmits(['cardDropped', 'cardDragStart', 'cardDragEnd', 'cardDragOverSegment']);

const isDragOverDesktop = ref(false); // 用于桌面拖拽的视觉效果
const handContainerElement = ref(null);


// --- 桌面原生拖拽事件处理 ---
function onDragOverDesktop(event) {
  if (props.droppable) {
    event.preventDefault();
    isDragOverDesktop.value = true;
  }
}
function onDragLeaveDesktop() {
  isDragOverDesktop.value = false;
}
function onDropDesktop(event) {
  if (props.droppable) {
    event.preventDefault();
    isDragOverDesktop.value = false;
    const cardData = event.dataTransfer.getData('text/plain');
    try {
      const card = JSON.parse(cardData);
      // 桌面拖拽直接在这里 emit cardDropped
      emit('cardDropped', { card, toSegment: props.segmentName, type: 'desktop' });
    } catch (e) {
      console.error("Failed to parse dropped card data:", e);
    }
  }
}

// --- 透传来自 CardComponent 的自定义拖拽事件 ---
function passCustomDragStart(payload) {
  emit('cardDragStart', { ...payload, fromSegment: props.segmentName });
}
function passCustomDragEnd(payload) {
  // PlayerHand 不直接处理放置，App.vue 根据卡片最后位置决定
  emit('cardDragEnd', payload);
}
function passCustomDragOverSegment(segmentName) {
    emit('cardDragOverSegment', segmentName);
}

</script>

<style scoped>
/* ... (样式与之前类似，确保 card-container 有足够大小) ... */
.player-hand-container {
  margin-bottom: 10px;
  /* background-color: #f0f0f0;  可以给个背景色，方便调试触摸目标 */
}
.card-container {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  min-height: 90px;
  border: 1px dashed #b0bec5;
  padding: 8px;
  border-radius: 4px;
  position: relative;
  align-items: flex-start;
  justify-content: flex-start;
  background-color: rgba(255,255,255,0.5);
}
.card-container.is-empty {
    background-color: rgba(236, 239, 241, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
}
.drag-over { /* 桌面拖拽悬停样式 */
  border-color: #00796b;
  border-style: solid;
  background-color: rgba(178, 223, 219, 0.5);
}
.drop-placeholder {
  color: #78909c;
  font-style: italic;
  text-align: center;
  width: 100%;
  font-size: 0.9em;
  padding: 10px 0;
}
</style>
