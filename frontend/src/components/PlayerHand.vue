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
      :class="{ 'is-empty': cards.length === 0 }"
    >
      <CardComponent
        v-for="card_item_loop_var in cards" :key="card_item_loop_var.id"
        :card="card_item_loop_var"
        :draggable="draggableCards"
        @customDragStart="passCustomDragStartThrough"
        @customDragEnd="passCustomDragEndThrough"
        @customDragOverSegment="passCustomDragOverSegmentThrough"
      /> <!-- Ensured CardComponent is self-closed -->
      <span v-if="cards.length === 0 && placeholderText" class="drop-placeholder">
        {{ placeholderText }}
      </span>
    </div> <!-- Closing card-container div -->
  </div> <!-- Closing player-hand-container div -->
</template>

<script setup>
// Script part is identical to the last version that successfully built (or was intended to)
import { ref } from 'vue';
import CardComponent from './Card.vue';

const props = defineProps({
  cards: { type: Array, default: () => [] },
  placeholderText: { type: String, default: '' },
  draggableCards: { type: Boolean, default: false },
  droppable: { type: Boolean, default: true },
  segmentName: { type: String, required: true }
});

const emit = defineEmits([
    'desktopCardDropped',
    'customDragStart', 
    'customDragEnd', 
    'customDragOverSegment'
]);

const isDragOverDesktop = ref(false);
const handContainerElement = ref(null);

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
    if (!cardData) {
        console.warn("No card data found in drop event.");
        return;
    }
    try {
      const card = JSON.parse(cardData);
      emit('desktopCardDropped', { card, toSegment: props.segmentName });
    } catch (e) {
      console.error("Failed to parse dropped card data:", e, cardData);
    }
  }
}

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
/* Styles are identical to the last version that successfully built */
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
