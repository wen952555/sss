<template>
  <div
    class="card"
    :class="{ dragging: isBeingDraggedVisual }"
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
const isBeingDraggedVisual = ref(false); // 用于触摸拖拽时的视觉效果 (仅视觉)
const isTouchDevice = ref(false);

let touchStartX = 0;
let touchStartY = 0;
let elementStartX = 0;
let elementStartY = 0;
let draggedCardClone = null;
let isActuallyDragging = false; // 标记是否真的开始了拖拽移动

onMounted(() => {
  isTouchDevice.value = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
});

onUnmounted(() => {
  cleanupTouchListeners();
});

function cleanupTouchListeners() {
    document.removeEventListener('touchmove', onDocumentTouchMove);
    document.removeEventListener('touchend', onDocumentTouchEnd);
    document.removeEventListener('touchcancel', onDocumentTouchEnd);
}


function onDragStart(event) { // 桌面原生拖拽
  if (isTouchDevice.value) {
      event.preventDefault(); return;
  }
  event.dataTransfer.setData('text/plain', JSON.stringify(props.card));
  event.dataTransfer.effectAllowed = 'move';
  emit('customDragStart', { card: props.card, fromSegment: getSegmentNameFromCard() });
}

function getSegmentNameFromCard() {
    // 尝试从父级的 .player-hand-container 获取 segmentName
    // 这依赖于 CardComponent 总是被 PlayerHandComponent 包裹
    let parent = cardElement.value?.parentElement;
    while(parent) {
        if (parent.classList.contains('player-hand-container') && parent.dataset.segmentName) {
            return parent.dataset.segmentName;
        }
        parent = parent.parentElement;
    }
    return 'unknown'; // 或其他默认值
}


function onTouchStart(event) {
  if (!isTouchDevice.value || event.touches.length !== 1) return;
  
  const touch = event.touches[0];
  isActuallyDragging = false; // 重置拖拽状态
  isBeingDraggedVisual.value = true; 
  
  if (cardElement.value) {
    const rect = cardElement.value.getBoundingClientRect();
    elementStartX = rect.left; // 记录原始元素的视口位置
    elementStartY = rect.top;
    touchStartX = touch.clientX; // 记录触摸开始的视口位置
    touchStartY = touch.clientY;
    
    // 延迟创建克隆体，直到用户确实移动了一小段距离，以区分点击和拖拽
  }
  
  emit('customDragStart', { card: props.card, fromSegment: getSegmentNameFromCard() });

  document.addEventListener('touchmove', onDocumentTouchMove, { passive: false });
  document.addEventListener('touchend', onDocumentTouchEnd);
  document.addEventListener('touchcancel', onDocumentTouchEnd);
}

function createAndPositionClone(currentX, currentY) {
    if (!draggedCardClone && cardElement.value) {
        draggedCardClone = cardElement.value.cloneNode(true);
        draggedCardClone.style.position = 'fixed'; // 使用 fixed 定位，相对于视口
        draggedCardClone.style.zIndex = '1000';
        draggedCardClone.style.pointerEvents = 'none';
        draggedCardClone.style.opacity = '0.7';
        // 初始时不设置 left/top，将通过 transform 更新
        draggedCardClone.style.transform = `translate(${elementStartX}px, ${elementStartY}px)`; // 先放到原始位置
        document.body.appendChild(draggedCardClone);
        cardElement.value.style.opacity = '0.3'; // 隐藏原始卡片
    }
    if (draggedCardClone) {
        const deltaX = currentX - touchStartX;
        const deltaY = currentY - touchStartY;
        // 更新克隆体位置，使其相对于原始位置移动
        draggedCardClone.style.transform = `translate(${elementStartX + deltaX}px, ${elementStartY + deltaY}px)`;
    }
}

function onDocumentTouchMove(event) {
  if (!isBeingDraggedVisual.value || event.touches.length !== 1) return;
  event.preventDefault(); 
  
  const touch = event.touches[0];

  if (!isActuallyDragging) {
    // 首次移动，判断是否超过阈值，是则确认开始拖拽
    const moveThreshold = 5; // 移动超过5px才算拖拽
    if (Math.abs(touch.clientX - touchStartX) > moveThreshold || Math.abs(touch.clientY - touchStartY) > moveThreshold) {
        isActuallyDragging = true;
        createAndPositionClone(touch.clientX, touch.clientY); // 此时创建并定位克隆体
    }
  }
  
  if (isActuallyDragging && draggedCardClone) {
    updateClonePositionOnMove(touch.clientX, touch.clientY); // 仅更新位置

    draggedCardClone.style.display = 'none';
    const elementUnderTouch = document.elementFromPoint(touch.clientX, touch.clientY);
    draggedCardClone.style.display = '';
      
    let targetSegment = null;
    if (elementUnderTouch) {
        const dropZone = elementUnderTouch.closest('.player-hand-container');
        if (dropZone && dropZone.dataset.segmentName) {
            targetSegment = dropZone.dataset.segmentName;
        }
    }
    emit('customDragOverSegment', targetSegment); // 无论是否为null都发送，App.vue可以处理
  }
}

function updateClonePositionOnMove(currentX, currentY) { // 仅更新位置
  if (draggedCardClone) {
    const deltaX = currentX - touchStartX;
    const deltaY = currentY - touchStartY;
    draggedCardClone.style.transform = `translate(${elementStartX + deltaX}px, ${elementStartY + deltaY}px)`;
  }
}


function onDocumentTouchEnd(event) {
  if (!isBeingDraggedVisual.value) {
      cleanupTouchListeners(); // 如果没有开始拖拽，也清理监听器
      return;
  }

  let finalTargetSegment = null;
  // 获取手指抬起时的坐标，使用 changedTouches
  const touch = event.changedTouches && event.changedTouches.length > 0 ? event.changedTouches[0] : null;

  if (touch && isActuallyDragging && draggedCardClone) { // 确保真的拖拽了并且有克隆体
    draggedCardClone.style.display = 'none'; // 隐藏克隆体以检测
    const elementUnderTouch = document.elementFromPoint(touch.clientX, touch.clientY);
    draggedCardClone.style.display = ''; // 恢复显示（虽然马上要删了）
    if (elementUnderTouch) {
      const dropZone = elementUnderTouch.closest('.player-hand-container');
      if (dropZone && dropZone.dataset.segmentName) {
        finalTargetSegment = dropZone.dataset.segmentName;
      }
    }
  } else if (!isActuallyDragging) { // 如果只是点击或非常小的移动，不触发放置逻辑
      finalTargetSegment = null; // 或者可以认为是点击事件，不触发拖拽结束
  }


  if (cardElement.value) {
      cardElement.value.style.opacity = '1';
  }
  
  if (draggedCardClone) {
    draggedCardClone.remove();
    draggedCardClone = null;
  }
  
  // 只有在实际拖拽发生时才发出 dragEnd，并带上最终的目标 segment
  if(isActuallyDragging) {
      emit('customDragEnd', { card: props.card, targetSegment: finalTargetSegment });
  }

  isBeingDraggedVisual.value = false;
  isActuallyDragging = false;
  cleanupTouchListeners();
}
</script>

<style scoped>
.card {
  touch-action: none;
  /* -webkit-user-drag: none; KHTML spezifisch, für Vue nicht nötig */
  /* user-drag: none; Standard aber oft nicht unterstützt */
}
.dragging { /* 使用 dragging class for visual feedback */
  /* opacity: 0.7; */ /* 原始卡片透明度在 onTouchStart 中设置 */
  /* transform: scale(1.05); */ /* 视觉反馈，可以加，但克隆体已经做了 */
}
</style>
