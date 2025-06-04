<template>
  <div
    class="card"
    :class="{ dragging: isBeingDraggedVisualState }" 
    :draggable="!isTouchDevice"
    @dragstart="onDesktopDragStart"
    @touchstart.stop="onTouchStart" 
    ref="cardElementRef"
  >
    <!-- 修改了这里的 src 计算，确保图片能正确显示 -->
    <img v-if="imageSrc" :src="imageSrc" :alt="altText" @error="onImageError" />
    <span v-else>{{ displayValue }}{{ suitSymbol }}</span>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onBeforeUnmount } from 'vue';

const props = defineProps({
  card: { type: Object, required: true },
});
const emit = defineEmits(['customDragStart', 'customDragEnd', 'customDragOverSegment']);

// --- 核心修改：将 .svg 后缀改为 .png ---
const imageSrc = computed(() => {
  if (props.card && props.card.id) {
    return `/cards/${props.card.id}.png`; // 修改后缀为 .png
  }
  return '';
});
// --- 核心修改结束 ---

const altText = computed(() => props.card && props.card.value && props.card.suit ? `${props.card.value} of ${props.card.suit}` : 'Card');
const cardElementRef = ref(null);
const isBeingDraggedVisualState = ref(false);
const isTouchDevice = ref(false);

// ... (触摸拖拽相关的变量与之前相同，无需修改) ...
let touchStartX = 0;
let touchStartY = 0;
let elementInitialViewportX = 0;
let elementInitialViewportY = 0;
let draggedCardCloneNode = null;
let isDraggingConfirmed = false;
let lastKnownOverSegment = null;

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
    let el = cardElementRef.value;
    while(el && el.parentElement) {
        const parentContainer = el.closest('.player-hand-container');
        if (parentContainer && parentContainer.dataset.segmentName) {
            return parentContainer.dataset.segmentName;
        }
        el = el.parentElement;
    }
    return 'unknown_segment';
}

function onDesktopDragStart(event) {
  if (isTouchDevice.value) {
    event.preventDefault(); return;
  }
  if (!props.card || !props.card.id) {
      event.preventDefault();
      return;
  }
  try {
      event.dataTransfer.setData('text/plain', JSON.stringify(props.card));
      event.dataTransfer.effectAllowed = 'move';
      emit('customDragStart', { card: props.card, fromSegment: getParentSegmentName() });
  } catch (e) {
      // console.error("Error setting drag data:", e);
  }
}

function onTouchStart(event) {
  if (!isTouchDevice.value || event.touches.length !== 1) return;
  if (!props.card || !props.card.id) {
    return;
  }
  const touch = event.touches[0];
  isDraggingConfirmed = false;
  isBeingDraggedVisualState.value = true; 
  lastKnownOverSegment = null;
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
        if(cardElementRef.value) cardElementRef.value.style.opacity = '0.4';
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
    const originalDisplay = draggedCardCloneNode.style.display;
    draggedCardCloneNode.style.display = 'none';
    const elementUnderTouch = document.elementFromPoint(touch.clientX, touch.clientY);
    draggedCardCloneNode.style.display = originalDisplay;
    let targetSegment = null;
    if (elementUnderTouch) {
        const dropZone = elementUnderTouch.closest('.player-hand-container');
        if (dropZone && dropZone.dataset.segmentName) {
            targetSegment = dropZone.dataset.segmentName;
        }
    }
    lastKnownOverSegment = targetSegment;
    emit('customDragOverSegment', targetSegment);
  }
}
function handleDocumentTouchEnd(event) {
  if (!isBeingDraggedVisualState.value) {
      cleanupDocumentTouchListeners(); return;
  }
  let finalTargetSegment = lastKnownOverSegment;
  const touch = event.changedTouches && event.changedTouches.length > 0 ? event.changedTouches[0] : null;
  if (touch && isDraggingConfirmed && !finalTargetSegment) {
    if (draggedCardCloneNode) draggedCardCloneNode.style.display = 'none';
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

// 图片加载失败时的处理函数
function onImageError(event) {
  console.warn(`Failed to load card image: ${event.target.src}`);
  // 可以在这里设置一个默认的占位图，或者显示文字提示
  // event.target.src = '/cards/default_card_back.png'; // 例如
}
</script>

<style scoped>
/* Styles are the same as the last provided main.css .card and .card img rules */
/* Ensure these are consistent with your global styles or main.css */
.card {
  touch-action: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
  /* --- 从 main.css 复制过来的卡片样式 --- */
  width: 100px !important; 
  height: 140px !important;
  border: none !important; 
  outline: none !important;
  box-sizing: border-box !important; 
  border-radius: 6px !important;
  background-color: #FFFFFF !important; 
  color: #212121 !important;
  display: flex !important;
  justify-content: center !important;
  align-items: center !important;
  cursor: grab !important;
  box-shadow: none !important; 
  transition: transform 0.1s ease-out !important;
  overflow: hidden !important;
  padding: 0 !important; 
  margin: 2px !important; 
}
.card img {
  display: block !important;
  width: 100% !important; /* 之前是101%，改为100%看PNG效果 */
  height: 100% !important;/* 之前是101%，改为100%看PNG效果 */
  object-fit: contain !important; 
  pointer-events: none !important;
  border-radius: 5px !important; 
}
.card.dragging { /* 仅用于克隆体的类 */
  /* 这个样式实际由JS在克隆体上应用，或者如果全局有.dragging也可以 */
}
</style>
