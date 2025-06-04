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
      :class="{ 
        'is-empty': cards.length === 0,
        'fan-layout': layoutMode === 'fan' && cards.length > 0 
      }"
      ref="cardContainerRef" 
    >
      <CardComponent
        v-for="(cardItem, index) in cards" :key="cardItem.id"
        :card="cardItem"
        :draggable="draggableCards"
        @customDragStart="passCustomDragStartThrough"
        @customDragEnd="passCustomDragEndThrough"
        @customDragOverSegment="passCustomDragOverSegmentThrough"
        :style="layoutMode === 'fan' ? getFanCardStyle(index, cards.length) : {}"
      />
      <span v-if="cards.length === 0 && placeholderText" class="drop-placeholder">
        {{ placeholderText }}
      </span>
    </div> <!-- Closing card-container div -->
  </div> <!-- Closing player-hand-container div -->
</template>

<script setup>
// Script part is identical to the last version that successfully built or was intended for build.
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import CardComponent from './Card.vue';

const props = defineProps({
  cards: { type: Array, default: () => [] },
  placeholderText: { type: String, default: '' },
  draggableCards: { type: Boolean, default: false },
  droppable: { type: Boolean, default: true },
  segmentName: { type: String, required: true },
  initialLayoutMode: { type: String, default: 'flat' }
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
const layoutMode = ref(props.initialLayoutMode);

const FAN_TOTAL_ANGLE_SPREAD = 30;
const FAN_CARD_ROTATION_STEP = 3;
const FAN_CARD_X_OFFSET = 25; 
const FAN_CARD_Y_OFFSET_ARC_PEAK = 15;
const FAN_Z_INDEX_BASE = 10;

function getFanCardStyle(index, totalCards) {
  if (totalCards <= 1) {
    return { transform: 'translateX(0px) rotate(0deg) translateY(0px)', zIndex: FAN_Z_INDEX_BASE + index };
  }
  const मध्यबिंदु = (totalCards - 1) / 2;
  const distanceFromCenter = index - मध्यबिंदु;
  let rotation = distanceFromCenter * FAN_CARD_ROTATION_STEP;
  const translateX = distanceFromCenter * FAN_CARD_X_OFFSET;
  // const normalizedDistSq = Math.pow(distanceFromCenter / (totalCards / 2), 2);
  // let translateY = -FAN_CARD_Y_OFFSET_ARC_PEAK * normalizedDistSq;
  // Simplified Y offset for a gentle arc, making center slightly lower
  let translateY = FAN_CARD_Y_OFFSET_ARC_PEAK * (1 - Math.cos(distanceFromCenter / (totalCards / 2) * Math.PI / 2));
  if (totalCards > 5) { // more spread for more cards
     translateY = FAN_CARD_Y_OFFSET_ARC_PEAK * (Math.sin( (index / (totalCards-1)) * Math.PI ) * 0.5 );
     rotation = (index - मध्यबिंदु) * (FAN_TOTAL_ANGLE_SPREAD / (totalCards > 1 ? totalCards -1 : 1));
  }


  const zIndex = FAN_Z_INDEX_BASE + totalCards - Math.abs(Math.round(distanceFromCenter));
  return {
    transform: `translateX(${translateX}px) translateY(${translateY}px) rotate(${rotation}deg)`,
    zIndex: zIndex,
  };
}

const mediaQueryList = ref(null);
function checkLayoutMode() {
  if (window.matchMedia("(max-width: 768px)").matches) {
    layoutMode.value = 'fan';
  } else {
    layoutMode.value = 'flat';
  }
}
onMounted(() => {
  checkLayoutMode();
  mediaQueryList.value = window.matchMedia("(max-width: 768px)");
  if (mediaQueryList.value.addEventListener) { // Modern browsers
    mediaQueryList.value.addEventListener('change', checkLayoutMode);
  } else if (mediaQueryList.value.addListener) { // Older browsers (fallback)
    mediaQueryList.value.addListener(checkLayoutMode);
  }
});
onBeforeUnmount(() => {
  if (mediaQueryList.value) {
    if (mediaQueryList.value.removeEventListener) {
      mediaQueryList.value.removeEventListener('change', checkLayoutMode);
    } else if (mediaQueryList.value.removeListener) {
      mediaQueryList.value.removeListener(checkLayoutMode);
    }
  }
});

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
/* Styles are identical to the last successfully built version */
.player-hand-container {
  margin-bottom: 10px;
  width: 100%;
  box-sizing: border-box;
}
/* .card-container and other styles are in main.css */
</style>
