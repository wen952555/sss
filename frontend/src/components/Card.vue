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
    <span v-else>{{ card.displayValue }}{{ card.suitSymbol }}</span>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'; // 使用 onBeforeUnmount

const props = defineProps({
  card: { type: Object, required: true },
  // draggable prop 现在由 App.vue 控制，这里不需要了
});
const emit = defineEmits(['customDragStart', 'customDragEnd', 'customDragOverSegment']);

const imageSrc = computed(() => props.card && props.card.id ? `/cards/${props.card.id}.svg` : '');
const altText = computed(() => props.card && props.card.value && props.card.suit ? `${props.card.value} of ${props.card.suit}` : 'Card');
const cardElementRef = ref(null); // 修改 ref 名称以示区分
const isBeingDraggedVisualState = ref(false); // 内部状态控制拖拽视觉
const isTouchDevice = ref(false);

let touchStartX = 0;
let touchStartY = 0;
let elementInitialViewportX = 0; // 元素初始视口X
let elementInitialViewportY = 0; // 元素初始视口Y
let draggedCardCloneNode = null; // 修改变量名
let isDraggingConfirmed = false; // 标记是否已确认开始拖拽（移动超过阈值）

onMounted(() => {
  isTouchDevice.value = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
});

onBeforeUnmount(() => { // 使用 onBeforeUnmount 清理
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
        // 查找 .player-hand-container 的 data-segment-name
        if (parent.classList && parent.classList.contains('player-hand-container')) {
            return parent.dataset.segmentName || null;
        }
        // 或者直接查找 card-container 的父级是否是 player-hand-container
        if (parent.classList && parent.classList.contains('card-container')) {
            const grandParent = parent.parentElement;
            if (grandParent && grandParent.classList.contains('player-hand-container')) {
                 return grandParent.dataset.segmentName || null;
            }
        }
        parent = parent.parentElement;
    }
    return 'unknown_segment'; // 返回一个可识别的默认值
}


// --- 桌面拖拽 ---
function onDesktopDragStart(event) {
  if (isTouchDevice.value) {
    event.preventDefault(); return;
  }
  event.dataTransfer.setData('text/plain', JSON.stringify(props.card));
  event.dataTransfer.effectAllowed = 'move';
  emit('customDragStart', { card: props.card, fromSegment: getParentSegmentName() });
}

// --- 触摸拖拽 ---
function onTouchStart(event) {
  if (!isTouchDevice.value || event.touches.length !== 1) return;
  // event.stopPropagation(); // 阻止事件冒泡到父元素，看是否影响

  const touch = event.touches[0];
  isDraggingConfirmed = false;
  isBeingDraggedVisualState.value = true; // 立即应用视觉效果，即使只是准备拖拽
  
  if (cardElementRef.value) {
    const rect = cardElementRef.value.getBoundingClientRect();
    elementInitialViewportX = rect.left;
    elementInitialViewportY = rect.top;
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
  }
  
  emit('customDragStart', { card: props.card, fromSegment: getParentSegmentName() });

  // 延迟添加 document 监听器，或者在 move 时判断是否真的拖拽了再添加
  document.addEventListener('touchmove', handleDocumentTouchMove, { passive: false });
  document.addEventListener('touchend', handleDocumentTouchEnd);
  document.addEventListener('touchcancel', handleDocumentTouchEnd);
}

function createCloneIfNeeded() {
    if (!draggedCardCloneNode && cardElementRef.value) {
        draggedCardCloneNode = cardElementRef.value.cloneNode(true);
        draggedCardCloneNode.style.position = 'fixed';
        draggedCardCloneNode.style.left = `${elementInitialViewportX}px`; // 直接设置初始位置
        draggedCardCloneNode.style.top = `${elementInitialViewportY}px`;
        draggedCardCloneNode.style.zIndex = '1000';
        draggedCardCloneNode.style.pointerEvents = 'none';
        draggedCardCloneNode.style.opacity = '0.8'; // 克隆体透明度
        draggedCardCloneNode.style.transformOrigin = 'center center'; // 确保缩放和旋转效果好
        draggedCardCloneNode.style.transition = 'none'; // 拖拽时不应有过渡
        // 应用 .dragging 类的样式到克隆体
        draggedCardCloneNode.classList.add('dragging'); 

        document.body.appendChild(draggedCardCloneNode);
        cardElementRef.value.style.opacity = '0.4'; // 原始卡片变淡
    }
}

function updateClonePosition(currentX, currentY) {
  if (draggedCardCloneNode) {
    const deltaX = currentX - touchStartX;
    const deltaY = currentY - touchStartY;
    // 更新克隆体位置，使其相对于初始视口位置移动
    draggedCardCloneNode.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(1.1) rotate(3deg)`;
  }
}

function handleDocumentTouchMove(event) {
  if (!isBeingDraggedVisualState.value || event.touches.length !== 1) return;
  event.preventDefault(); // 在 move 中阻止默认行为以防止滚动
  
  const touch = event.touches[0];

  if (!isDraggingConfirmed) {
    const moveThreshold = 10; // 像素阈值
    if (Math.abs(touch.clientX - touchStartX) > moveThreshold || Math.abs(touch.clientY - touchStartY) > moveThreshold) {
      isDraggingConfirmed = true;
      createCloneIfNeeded(); // 确认拖拽后创建克隆体
    }
  }
  
  if (isDraggingConfirmed && draggedCardCloneNode) {
    updateClonePosition(touch.clientX, touch.clientY);

    draggedCardCloneNode.style.display = 'none';
    const elementUnderTouch = document.elementFromPoint(touch.clientX, touch.clientY);
    draggedCardCloneNode.style.display = '';
      
    let targetSegment = null;
    if (elementUnderTouch) {
        const dropZone = elementUnderTouch.closest('.player-hand-container'); // 确保 PlayerHand 有这个 class
        if (dropZone && dropZone.dataset.segmentName) {
            targetSegment = dropZone.dataset.segmentName;
        }
    }
    emit('customDragOverSegment', targetSegment);
  }
}

function handleDocumentTouchEnd(event) {
  if (!isBeingDraggedVisualState.value) {
      cleanupDocumentTouchListeners();
      return;
  }

  let finalTargetSegment = null;
  const touch = event.changedTouches && event.changedTouches.length > 0 ? event.changedTouches[0] : null;

  if (touch && isDraggingConfirmed && draggedCardCloneNode) {
    draggedCardCloneNode.style.display = 'none';
    const elementUnderTouch = document.elementFromPoint(touch.clientX, touch.clientY);
    // draggedCardCloneNode.style.display = ''; // 克隆体马上要删了，不用恢复
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
  
  if (isDraggingConfirmed) { // 只在真正拖拽后才触发
      emit('customDragEnd', { card: props.card, targetSegment: finalTargetSegment });
  }

  isBeingDraggedVisualState.value = false;
  isDraggingConfirmed = false;
  cleanupDocumentTouchListeners();
}

// 计算属性 displayValue 和 suitSymbol (确保 props.card 是有效的)
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
  touch-action: none; /* 非常重要，阻止浏览器默认的触摸滚动等行为 */
  -webkit-user-select: none; /* Safari/Chrome */
  -moz-user-select: none; /* Firefox */
  -ms-user-select: none; /* IE10+ */
  user-select: none; /* Standard */
  /* 之前 main.css 中定义的 card 样式 */
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
  transition: opacity 0.2s; /* 平滑原始卡片的显隐 */
}
.card.dragging { /* 这个 class 由 isBeingDraggedVisualState 控制 */
  /* opacity: 0.7; */ /* 原始卡片的透明度在 JS 中直接设置 */
  /* 拖拽时的视觉效果主要应用在克隆体上 */
}
.card img {
  max-width: 90%;
  max-height: 90%;
  object-fit: contain;
  pointer-events: none; /* 防止图片干扰触摸事件 */
}
</style>
