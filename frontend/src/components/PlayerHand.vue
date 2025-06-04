<template>
  <div 
    class="player-hand-container"
    :data-segment-name="segmentName"
    @dragover.prevent="onDesktopDragOver"
    @drop.prevent="onDesktopDrop"
    @dragleave="onDesktopDragLeave"
    :class="{ 'drag-over': isDragOverDesktop }"
    ref="handContainerElement"
  >
    <div
      class="card-container"
      :class="{ 'is-empty': cards.length === 0 && !forceShowPlaceholder }"
      ref="cardContainerRef" 
    >
      <CardComponent
        v-for="(cardItem) in cards" :key="cardItem.id" 
        :card="cardItem"
        :draggable="draggableCards"
        @customDragStart="passCustomDragStartThrough"
        @customDragEnd="passCustomDragEndThrough"
        @customDragOverSegment="passCustomDragOverSegmentThrough"
        class="hand-card-item" 
      />
      <span v-if="(cards.length === 0 || forceShowPlaceholder) && placeholderText" class="drop-placeholder">
        {{ placeholderText }}
      </span>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'; // 移除了 computed, onMounted, onBeforeUnmount, watch
import CardComponent from './Card.vue';

const props = defineProps({
  cards: { type: Array, default: () => [] },
  placeholderText: { type: String, default: '' },
  draggableCards: { type: Boolean, default: false },
  droppable: { type: Boolean, default: true },
  segmentName: { type: String, required: true },
  forceShowPlaceholder: { type: Boolean, default: false }
  // 移除了 initialLayoutMode
});

const emit = defineEmits([
    'desktopCardDropped', 
    'customDragStart', 
    'customDragEnd', 
    'customDragOverSegment'
]);

const isDragOverDesktop = ref(false);
const handContainerElement = ref(null);
const cardContainerRef = ref(null); 
// 移除了 layoutMode 和扇形计算相关的 JS

// --- 桌面拖拽和自定义事件透传 (保持不变) ---
function onDesktopDragOver(event) { 
  if (props.droppable) {
    event.preventDefault(); 
    event.dataTransfer.dropEffect = 'move'; 
    isDragOverDesktop.value = true;
  }
}
function onDesktopDragLeave() { 
  isDragOverDesktop.value = false;
}
function onDesktopDrop(event) { 
  if (props.droppable) {
    event.preventDefault();
    isDragOverDesktop.value = false;
    const cardData = event.dataTransfer.getData('text/plain');
    if (!cardData) return;
    try {
      const card = JSON.parse(cardData);
      emit('desktopCardDropped', { card, toSegment: props.segmentName });
    } catch (e) { console.error("Failed to parse dropped card data:", e, cardData); }
  }
}
function passCustomDragStartThrough(payload) { emit('customDragStart', { ...payload, fromSegment: props.segmentName }); }
function passCustomDragEndThrough(payload) { emit('customDragEnd', payload); }
function passCustomDragOverSegmentThrough(segmentName) { emit('customDragOverSegment', segmentName); }

</script>

<style scoped>
.player-hand-container {
  margin-bottom: 10px;
  width: 100%;
  box-sizing: border-box;
  position: relative;
}
/* .card-container 和 .hand-card-item 的主要样式将在 main.css 中定义 */
</style>
