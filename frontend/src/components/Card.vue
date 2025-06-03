<template>
  <div
    class="card"
    :class="{ dragging: isBeingDragged }"
    :draggable="!isTouchDevice" <!-- 只在非触摸设备上启用原生拖拽 -->
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
  // draggable prop 移到 App.vue 或 GameBoard.vue 中根据游戏状态判断是否可拖拽
});
const emit = defineEmits(['customDragStart', 'customDragEnd', 'customDragOverSegment']); // 自定义拖拽事件

const imageSrc = computed(() => props.card && props.card.id ? `/cards/${props.card.id}.svg` : '');
const altText = computed(() => `${props.card.value} of ${props.card.suit}`);
const cardElement = ref(null);
const isBeingDragged = ref(false); // 用于触摸拖拽时的视觉效果
const isTouchDevice = ref(false);

let touchStartX = 0;
let touchStartY = 0;
let elementStartX = 0;
let elementStartY = 0;
let draggedCardClone = null; // 用于触摸拖拽时创建的克隆元素

onMounted(() => {
  isTouchDevice.value = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  if (isTouchDevice.value && cardElement.value) {
    // cardElement.value.addEventListener('touchmove', onTouchMove, { passive: false });
    // cardElement.value.addEventListener('touchend', onTouchEnd);
    // cardElement.value.addEventListener('touchcancel', onTouchEnd); // Also treat cancel as end
  }
});

onUnmounted(() => {
  // 清理事件监听器，如果它们被添加到 window 或 document
  if (isTouchDevice.value) {
      document.removeEventListener('touchmove', onDocumentTouchMove);
      document.removeEventListener('touchend', onDocumentTouchEnd);
      document.removeEventListener('touchcancel', onDocumentTouchEnd);
  }
});


// 原生拖拽 (桌面端)
function onDragStart(event) {
  if (isTouchDevice.value) {
      event.preventDefault(); // 阻止在触摸设备上的原生拖拽行为
      return;
  }
  event.dataTransfer.setData('text/plain', JSON.stringify(props.card));
  event.dataTransfer.effectAllowed = 'move';
  emit('customDragStart', { card: props.card, event }); // App.vue 会监听这个
}


// --- 触摸拖拽逻辑 ---
function onTouchStart(event) {
  if (!isTouchDevice.value || event.touches.length !== 1) return;
  // event.preventDefault(); // 如果不希望页面滚动，但可能影响其他触摸行为
  
  const touch = event.touches[0];
  isBeingDragged.value = true; // 激活拖拽样式

  // 创建一个视觉上的克隆体用于拖拽
  if (cardElement.value) {
    draggedCardClone = cardElement.value.cloneNode(true);
    draggedCardClone.style.position = 'absolute';
    draggedCardClone.style.zIndex = '1000';
    draggedCardClone.style.pointerEvents = 'none'; // 克隆体不响应指针事件
    draggedCardClone.style.opacity = '0.7';
    document.body.appendChild(draggedCardClone);
    
    // 初始位置
    const rect = cardElement.value.getBoundingClientRect();
    elementStartX = rect.left;
    elementStartY = rect.top;
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    
    // 隐藏原始卡片（或降低透明度）
    cardElement.value.style.opacity = '0.3';

    // 更新克隆体位置
    updateClonePosition(touch.clientX, touch.clientY);
  }
  
  // 发出拖拽开始信号，让 App.vue 知道哪张卡被拖动
  emit('customDragStart', { card: props.card, event });


  // 在 document 上添加 move 和 end 事件，以便在卡片外也能捕获
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
  event.preventDefault(); // 阻止页面滚动
  
  const touch = event.touches[0];
  updateClonePosition(touch.clientX, touch.clientY);

  // 检测当前触摸位置下方的元素，判断是否在某个 PlayerHandComponent 上方
  if (draggedCardClone) {
      draggedCardClone.style.display = 'none'; // 暂时隐藏克隆体以正确获取下方元素
      const elementUnderTouch = document.elementFromPoint(touch.clientX, touch.clientY);
      draggedCardClone.style.display = ''; // 恢复显示
      
      if (elementUnderTouch) {
          const dropZone = elementUnderTouch.closest('.player-hand-container'); // PlayerHandComponent 的根元素
          if (dropZone) {
              const segmentName = dropZone.dataset.segmentName; // 假设 PlayerHandComponent 设置了 data-segment-name
              if(segmentName) {
                  emit('customDragOverSegment', segmentName); // 通知 App.vue 当前悬停的区域
              }
          } else {
              emit('customDragOverSegment', null); // 不在任何可放置区域
          }
      }
  }
}

function onDocumentTouchEnd(event) {
  if (!isBeingDragged.value) return;

  // 恢复原始卡片显示
  if(cardElement.value) {
      cardElement.value.style.opacity = '1';
  }
  
  // 移除克隆体
  if (draggedCardClone) {
    draggedCardClone.remove();
    draggedCardClone = null;
  }
  
  isBeingDragged.value = false;
  emit('customDragEnd', { card: props.card, event }); // App.vue 会监听这个并决定是否放置

  document.removeEventListener('touchmove', onDocumentTouchMove);
  document.removeEventListener('touchend', onDocumentTouchEnd);
  document.removeEventListener('touchcancel', onDocumentTouchEnd);
}

</script>

<style scoped>
.card {
  /* ... (之前的 card 样式) ... */
  touch-action: none; /* 阻止默认的触摸行为，如滚动，当在此元素上开始触摸时 */
}
/* isBeingDragged 样式在 main.css 中定义为 .dragging */
</style>
