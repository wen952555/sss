<template>
  <div 
    class="player-hand-container"
    :data-segment-name="segmentName"
    @dragover.prevent="onDesktopDragOver" <!-- Renamed for clarity -->
    @drop.prevent="onDesktopDrop"        <!-- Renamed and added .prevent -->
    @dragleave="onDesktopDragLeave"     <!-- Renamed -->
    :class="{ 'drag-over': isDragOverDesktop }"
    ref="handContainerElement"
  >
    <div
      class="card-container"
      :class="{ 'is-empty': cards.length === 0 }"
    >
      <CardComponent
        v-for="card_item_loop_var in cards" :key="card_item_loop_var.id" <!-- Renamed loop var -->
        :card="card_item_loop_var"
        :draggable="draggableCards" <!-- This prop should be controlled by parent -->
        @customDragStart="passCustomDragStartThrough"
        @customDragEnd="passCustomDragEndThrough"
        @customDragOverSegment="passCustomDragOverSegmentThrough"
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
  draggableCards: { type: Boolean, default: false }, // Whether cards *from* this hand are draggable
  droppable: { type: Boolean, default: true },      // Whether this hand *accepts* drops
  segmentName: { type: String, required: true }
});

const emit = defineEmits([
    'desktopCardDropped', // New specific event for desktop
    'customDragStart', 
    'customDragEnd', 
    'customDragOverSegment'
]);

const isDragOverDesktop = ref(false);
const handContainerElement = ref(null);


function onDesktopDragOver(event) {
  if (props.droppable) {
    event.preventDefault(); // Necessary to allow drop
    event.dataTransfer.dropEffect = 'move'; // Visual feedback
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
    if (!cardData) {
        console.warn("No card data found in drop event.");
        return;
    }
    try {
      const card = JSON.parse(cardData);
      // Emit a more specific event for desktop drops
      emit('desktopCardDropped', { card, toSegment: props.segmentName });
    } catch (e) {
      console.error("Failed to parse dropped card data:", e, cardData);
    }
  }
}

// 透传来自 CardComponent 的自定义拖拽事件
function passCustomDragStartThrough(payload) {
  emit('customDragStart', { ...payload, fromSegment: props.segmentName });
}
function passCustomDragEndThrough(payload) {
  emit('customDragEnd', payload);
}
function passCustomDragOverSegmentThrough(segmentName) {
    emit('customDragOverSegment', segmentName);
}
</script>

<style scoped>
/* Styles are the same as the last working version for build */
.player-hand-container {
  margin-bottom: 10px;
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
.drag-over {
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
