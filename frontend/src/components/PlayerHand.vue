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
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import CardComponent from './Card.vue';

const props = defineProps({
  cards: { type: Array, default: () => [] },
  placeholderText: { type: String, default: '' },
  draggableCards: { type: Boolean, default: false },
  droppable: { type: Boolean, default: true },
  segmentName: { type: String, required: true },
  // 新增 prop，用于外部控制布局模式，或者内部通过媒体查询判断
  initialLayoutMode: { type: String, default: 'flat' } // 'flat' or 'fan'
});

const emit = defineEmits([
    'desktopCardDropped', 
    'customDragStart', 
    'customDragEnd', 
    'customDragOverSegment'
]);

const isDragOverDesktop = ref(false);
const handContainerElement = ref(null);
const layoutMode = ref(props.initialLayoutMode); // 初始布局模式

// --- 扇形布局计算 ---
// 这些参数可以根据喜好调整
const FAN_MAX_ANGLE_SPREAD = 60; // 整个扇形的最大展开角度 (e.g., 60度)
const FAN_CARD_OVERLAP_OFFSET_X = -25; // 卡片在X轴上的重叠量 (负值表示重叠)
const FAN_CARD_OFFSET_Y_ARC = 10; // 卡片Y轴偏移，形成弧度

function getFanCardStyle(index, totalCards) {
  if (totalCards <= 1) {
    return { transform: 'rotate(0deg) translateY(0px)', zIndex: index };
  }
  // 计算每张卡片相对于中心卡片的旋转角度
  // 中心卡片的索引是 (totalCards - 1) / 2
  // 角度从 -FAN_MAX_ANGLE_SPREAD / 2 到 FAN_MAX_ANGLE_SPREAD / 2 分布
  const anglePerCard = FAN_MAX_ANGLE_SPREAD / (totalCards -1);
  const rotation = (index - (totalCards - 1) / 2) * anglePerCard;
  
  // 计算Y轴偏移，形成弧形 (简单的sin曲线)
  // const मध्यबिंदु = (totalCards - 1) / 2;
  // const normalizedIndex = index - मध्यबिंदु; // -n/2 to n/2
  // const yOffset = FAN_CARD_OFFSET_Y_ARC * Math.sin((normalizedIndex / मध्यबिंदु) * (Math.PI / 2));
  // 更简单的Y轴偏移，让中间的牌靠下一点点
  const yOffsetFactor = Math.abs(index - (totalCards - 1) / 2);
  const yOffset = yOffsetFactor * - (FAN_CARD_OFFSET_Y_ARC / (totalCards/2)) ; // 中间最低

  // 计算X轴偏移以实现重叠
  // 这个计算比较复杂，简单的重叠可以通过CSS的负margin或这里的translateX实现
  // 这里用一个简化的方式，让卡片基于旋转点稍微平移以靠近
  // const xOffset = (index - (totalCards - 1) / 2) * FAN_CARD_OVERLAP_OFFSET_X * (Math.abs(rotation) / (FAN_MAX_ANGLE_SPREAD / 2)) ;
  // 如果只是想让它们在旋转后自然靠近，可以不加 xOffset，或者只加一个小的固定值

  return {
    transform: `rotate(${rotation}deg) translateY(${yOffset}px)`,
    // transform: `translateX(${xOffset}px) rotate(${rotation}deg) translateY(${yOffset}px)`,
    zIndex: index, // 控制叠放顺序，中间的牌在上面或边缘的牌在上面
  };
}


// --- 响应式布局切换 ---
const mediaQueryList = ref(null);
function checkLayoutMode() {
  if (window.matchMedia("(max-width: 600px)").matches) {
    layoutMode.value = 'fan';
  } else {
    layoutMode.value = 'flat';
  }
  // console.log(`Segment ${props.segmentName} layout mode: ${layoutMode.value}`);
}

onMounted(() => {
  checkLayoutMode(); // 初始检查
  mediaQueryList.value = window.matchMedia("(max-width: 600px)");
  mediaQueryList.value.addEventListener('change', checkLayoutMode);
});

onBeforeUnmount(() => {
  if (mediaQueryList.value) {
    mediaQueryList.value.removeEventListener('change', checkLayoutMode);
  }
});


// --- 桌面拖拽和自定义事件透传 (与上一版相同) ---
function onDesktopDragOver(event) { /* ... */ 
  if (props.droppable) {
    event.preventDefault(); 
    event.dataTransfer.dropEffect = 'move'; 
    isDragOverDesktop.value = true;
  }
}
function onDesktopDragLeave() { /* ... */ 
  isDragOverDesktop.value = false;
}
function onDesktopDrop(event) { /* ... */ 
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
/* PlayerHand.vue specific styles, if any */
.player-hand-container {
  margin-bottom: 10px;
  /* background-color: #f0f0f0; */ /* For debugging touch targets if needed */
  width: 100%; /* 确保容器占满其在GameBoard中的分配空间 */
  box-sizing: border-box;
}
/* .card-container and other styles are now primarily in main.css */
</style>
