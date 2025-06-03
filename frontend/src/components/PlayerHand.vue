<template>
  <div
    class="card"
    :class="{ dragging: isBeingDragged }"
    :draggable="!isTouchDevice"
    @dragstart="onDragStart"
    @touchstart.passive="onTouchStart"
    ref="cardElement"
  >
    <img v-if="imageSrc" :src="imageSrc" :alt="altText" />
    <span v-else>{{ card.displayValue }}{{ card.suitSymbol }}</span>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue';

const props = defineProps({
  card: { type: Object, required: true },
});
const emit = defineEmits(['customDragStart', 'customDragEnd', 'customDragOverSegment']);

const imageSrc = computed(() => props.card && props.card.id ? `/cards/${props.card.id}.svg` : '');
const altText = computed(() => `${props.card.value} of ${props.card.suit}`);
const cardElement = ref(null);
const isBeingDragged = ref(false);
const isTouchDevice = ref(false);

let touchStartX = 0;
let touchStartY = 0;
let elementStartX = 0;
let elementStartY = 0;
let draggedCardClone = null;

onMounted(() => {
  isTouchDevice.value = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
});

onUnmounted(() => {
  if (isTouchDevice.value) {
      document.removeEventListener('touchmove', onDocumentTouchMove);
      document.removeEventListener('touchend', onDocumentTouchEnd);
      document.removeEventListener('touchcancel', onDocumentTouchEnd);
  }
});

function onDragStart(event) {
  if (isTouchDevice.value) {
      event.preventDefault();
      return;
  }
  event.dataTransfer.setData('text/plain', JSON.stringify(props.card));
  event.dataTransfer.effectAllowed = 'move';
  emit('customDragStart', { card: props.card, event });
}

function onTouchStart(event) {
  if (!isTouchDevice.value || event.touches.length !== 1) return;
  
  const touch = event.touches[0];
  isBeingDragged.value = true;

  if (cardElement.value) {
    draggedCardClone = cardElement.value.cloneNode(true);
    draggedCardClone.style.position = 'absolute';
    draggedCardClone.style.zIndex = '1000';
    draggedCardClone.style.pointerEvents = 'none';
    draggedCardClone.style.opacity = '0.7';
    document.body.appendChild(draggedCardClone);
    
    const rect = cardElement.value.getBoundingClientRect();
    elementStartX = rect.left;
    elementStartY = rect.top;
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    
    cardElement.value.style.opacity = '0.3';
    updateClonePosition(touch.clientX, touch.clientY);
  }
  
  emit('customDragStart', { card: props.card, event });

  document.addEventListener('touchmove', onDocumentTouchMove, { passive: false });
  document.addEventListener('touchend', onDocumentTouchEnd);
  document.addEventListener('touchcancel', onDocumentTouchEnd);
}

function updateClonePosition(currentX, currentY) {
  if (draggedCardClone) {
    const deltaX = currentX - touchStartX;
    const deltaY = currentY - touchStartY;
    draggedCardClone.style.left = `${elementStartX + deltaX}px`;
    draggedCardClone.style.top = `${elementStartY + deltaY}px`;
  }
}

function onDocumentTouchMove(event) {
  if (!isBeingDragged.value || event.touches.length !== 1) return;
  event.preventDefault(); 
  
  const touch = event.touches[0];
  updateClonePosition(touch.clientX, touch.clientY);

  if (draggedCardClone) {
      draggedCardClone.style.display = 'none';
      const elementUnderTouch = document.elementFromPoint(touch.clientX, touch.clientY);
      draggedCardClone.style.display = '';
      
      if (elementUnderTouch) {
          const dropZone = elementUnderTouch.closest('.player-hand-container');
          if (dropZone) {
              const segmentName = dropZone.dataset.segmentName;
              if(segmentName) {
                  emit('customDragOverSegment', segmentName);
              }
          } else {
              emit('customDragOverSegment', null);
          }
      }
  }
}

function onDocumentTouchEnd(event) {
  if (!isBeingDragged.value) return;

  if(cardElement.value) {
      cardElement.value.style.opacity = '1';
  }
  
  if (draggedCardClone) {
    draggedCardClone.remove();
    draggedCardClone = null;
  }
  
  isBeingDragged.value = false;
  emit('customDragEnd', { card: props.card, event });

  document.removeEventListener('touchmove', onDocumentTouchMove);
  document.removeEventListener('touchend', onDocumentTouchEnd);
  document.removeEventListener('touchcancel', onDocumentTouchEnd);
}
</script>

<style scoped>
.card {
  touch-action: none;
}
</style>
