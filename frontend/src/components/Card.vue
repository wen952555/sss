<template>
  <div
    class="card"
    :class="{ dragging: isBeingDraggedVisualState }" 
    :draggable="!isTouchDevice"
    @dragstart="onDesktopDragStart"
    @touchstart.stop="onTouchStart" 
    ref="cardElementRef"
  >
    <img v-if="imageSrc" :src="imageSrc" :alt="altText" />
    <span v-else>{{ displayValue }}{{ suitSymbol }}</span>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onBeforeUnmount } from 'vue';

const props = defineProps({
  card: { type: Object, required: true },
});
const emit = defineEmits(['customDragStart', 'customDragEnd', 'customDragOverSegment']);

const imageSrc = computed(() => props.card && props.card.id ? `/cards/${props.card.id}.svg` : '');
const altText = computed(() => props.card && props.card.value && props.card.suit ? `${props.card.value} of ${props.card.suit}` : 'Card');
const cardElementRef = ref(null);
const isBeingDraggedVisualState = ref(false);
const isTouchDevice = ref(false);

let touchStartX = 0;
let touchStartY = 0;
let elementInitialViewportX = 0;
let elementInitialViewportY = 0;
let draggedCardCloneNode = null;
let isDraggingConfirmed = false;
let lastKnownOverSegment = null; // 新增：记录最后悬停的 segment

onMounted(() => {
  isTouchDevice.value = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
});

onBeforeUnmount(() => {
  cleanupDocumentTouchListeners();
  if (draggedCardCloneNode) {
    draggedCardCloneNode.remove();
    draggedCardCloneNode = null;
  }
});

function cleanupDocumentTouchListeners() {
    document.removeEventListener('touchmove', handleDocumentTouchMove);
    document.removeEventListener('touchend', handleDocumentTouchEnd);
    document.removeEventListener('touchcancel', handleDocumentTouchEnd);
}

function getParentSegmentName() {
    let parent = cardElementRef.value?.parentElement;
    while(parent) {
        if (parent.classList && parent.classList.contains('player-hand-container')) {
            return parent.dataset.segmentName || null;
        }
        if (parent.classList && parent.classList.contains('card-container')) {
            const grandParent = parent.parentElement;
            if (grandParent && grandParent.classList.contains('player-hand-container')) {
                 return grandParent.dataset.segmentName || null;
            }
        }
        parent = parent.parentElement;
    }
    return 'unknown_segment';
}

function onDesktopDragStart(event) {
  if (isTouchDevice.value) {
    event.preventDefault(); return;
  }
  event.dataTransfer.setData('text/plain', JSON.stringify(props.card));
  event.dataTransfer.effectAllowed = 'move';
  emit('customDragStart', { card: props.card, fromSegment: getParentSegmentName() });
}

function onTouchStart(event) {
  if (!isTouchDevice.value || event.touches.length !== 1) return;
  
  const touch = event.touches[0];
  isDraggingConfirmed = false;
  isBeingDraggedVisualState.value = true; 
  lastKnownOverSegment = null; // 重置
  
  if (cardElementRef.value) {
    const rect = cardElementRef.value.getBoundingClientRect();
    elementInitialViewportX = rect.left;
    elementInitialViewportY = rect.top;
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
  }
  
  emit('customDragStart', { card: props.card, fromSegment: getParentSegmentName() });

  document.addEventListener('touchmove', handleDocumentTouchMove, { passive: false });
  document.addEventListener('touchend', handleDocumentTouchEnd);
  document.addEventListener('touchcancel', handleDocumentTouchEnd);
}

function createCloneIfNeeded() {
    if (!draggedCardCloneNode && cardElementRef.value) {
        draggedCardCloneNode = cardElementRef.value.cloneNode(true);
        draggedCardCloneNode.style.position = 'fixed';
        draggedCardCloneNode.style.left = `${elementInitialViewportX}px`;
        draggedCardCloneNode.style.top = `${elementInitialViewportY}px`;
        draggedCardCloneNode.style.zIndex = '1000';
        draggedCardCloneNode.style.pointerEvents = 'none';
        draggedCardCloneNode.style.opacity = '0.8';
        draggedCardCloneNode.style.transformOrigin = 'center center';
        draggedCardCloneNode.style.transition = 'none';
        draggedCardCloneNode.classList.add('dragging'); 
        document.body.appendChild(draggedCardCloneNode);
        cardElementRef.value.style.opacity = '0.4';
    }
}

function updateClonePosition(currentX, currentY) {
  if (draggedCardCloneNode) {
    const deltaX = currentX - touchStartX;
    const deltaY = currentY - touchStartY;
    draggedCardCloneNode.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(1.1) rotate(3deg)`;
  }
}

function handleDocumentTouchMove(event) {
  if (!isBeingDraggedVisualState.value || event.touches.length !== 1) return;
  event.preventDefault(); 
  
  const touch = event.touches[0];

  if (!isDraggingConfirmed) {
    const moveThreshold = 10;
    if (Math.abs(touch.clientX - touchStartX) > moveThreshold || Math.abs(touch.clientY - touchStartY) > moveThreshold) {
      isDraggingConfirmed = true;
      createCloneIfNeeded();
    }
  }
  
  if (isDraggingConfirmed && draggedCardCloneNode) {
    updateClonePosition(touch.clientX, touch.clientY);

    // 暂时隐藏克隆体以进行元素检测
    const originalDisplay = draggedCardCloneNode.style.display;
    draggedCardCloneNode.style.display = 'none';
    const elementUnderTouch = document.elementFromPoint(touch.clientX, touch.clientY);
    draggedCardCloneNode.style.display = originalDisplay; // 恢复显示
      
    let targetSegment = null;
    if (elementUnderTouch) {
        const dropZone = elementUnderTouch.closest('.player-hand-container');
        if (dropZone && dropZone.dataset.segmentName) {
            targetSegment = dropZone.dataset.segmentName;
        }
    }
    lastKnownOverSegment = targetSegment; // 持续更新最后悬停的 segment
    emit('customDragOverSegment', targetSegment);
  }
}

function handleDocumentTouchEnd(event) {
  if (!isBeingDraggedVisualState.value) {
      cleanupDocumentTouchListeners();
      return;
  }

  let finalTargetSegment = lastKnownOverSegment; // 使用 touchmove 时记录的最后一个 segment

  // 尝试在 touchend 时再次检测，以防万一，但优先使用 lastKnownOverSegment
  const touch = event.changedTouches && event.changedTouches.length > 0 ? event.changedTouches[0] : null;
  if (touch && isDraggingConfirmed && !finalTargetSegment) { // 如果 lastKnownOverSegment 是 null，再尝试检测一次
    if (draggedCardCloneNode) draggedCardCloneNode.style.display = 'none'; // 隐藏以便检测
    const elementUnderTouch = document.elementFromPoint(touch.clientX, touch.clientY);
    if (draggedCardCloneNode) draggedCardCloneNode.style.display = '';

    if (elementUnderTouch) {
      const dropZone = elementUnderTouch.closest('.player-hand-container');
      if (dropZone && dropZone.dataset.segmentName) {
        finalTargetSegment = dropZone.dataset.segmentName;
      }
    }
  }
  
  if (cardElementRef.value) {
      cardElementRef.value.style.opacity = '1';
  }
  
  if (draggedCardCloneNode) {
    draggedCardCloneNode.remove();
    draggedCardCloneNode = null;
  }
  
  if (isDraggingConfirmed) {
      emit('customDragEnd', { card: props.card, targetSegment: finalTargetSegment });
  }

  isBeingDraggedVisualState.value = false;
  isDraggingConfirmed = false;
  lastKnownOverSegment = null;
  cleanupDocumentTouchListeners();
}

const displayValue = computed(() => {
    if (!props.card || typeof props.card.value === 'undefined') return '?';
    if (parseInt(props.card.value) >= 2 && parseInt(props.card.value) <= 10) return props.card.value;
    return props.card.value.charAt(0).toUpperCase();
});
const suitSymbol = computed(() => {
    if (!props.card || typeof props.card.suit === 'undefined') return '';
    const symbols = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
    return symbols[props.card.suit] || '';
});
</script>

<style scoped>
.card {
  touch-action: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
  width: 60px;
  height: 85px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background-color: white;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: grab;
  box-shadow: 1px 1px 3px rgba(0,0,0,0.1);
  transition: opacity 0.2s;
}
.card.dragging {
  /* Visual feedback for dragging is now primarily on the clone */
}
.card img {
  max-width: 90%;
  max-height: 90%;
  object-fit: contain;
  pointer-events: none;
}
</style>
