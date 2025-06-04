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
        'is-empty': cards.length === 0 && !forceShowPlaceholder,
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
      <!-- 只有在没有卡片或者强制显示时才显示占位符 -->
      <span v-if="(cards.length === 0 || forceShowPlaceholder) && placeholderText" class="drop-placeholder">
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
  initialLayoutMode: { type: String, default: 'flat' },
  forceShowPlaceholder: { type: Boolean, default: false } // 新增：用于在有卡片时也显示占位符（例如扇形背景提示）
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

// --- 扇形布局参数 (针对手机端进行调整) ---
const FAN_CARD_WIDTH_MOBILE = 55; // 假设手机上卡片宽度约为55px (需要与CSS中媒体查询的卡片宽度匹配)
const FAN_MAX_SPREAD_WIDTH_FACTOR = 0.8; // 扇形最大展开宽度相对于容器宽度的比例
const FAN_MAX_ROTATION_TOTAL = 35; // 整个扇形的最大总旋转角度 (e.g., 35-40度)
const FAN_Y_OFFSET_BASE = 5; // 卡片底部基础Y偏移
const FAN_Y_OFFSET_ARC_FACTOR = 0.3; // Y轴形成弧度的因子 (相对于卡片高度)
const FAN_Z_INDEX_BASE = 10;

function getFanCardStyle(index, totalCards) {
  if (totalCards <= 1) {
    return { transform: 'translateX(-50%) rotate(0deg) translateY(0)', zIndex: FAN_Z_INDEX_BASE };
  }

  // 容器宽度，用于计算X偏移，确保扇形在容器内
  const containerWidth = cardContainerRef.value ? cardContainerRef.value.offsetWidth : 300; // 默认一个宽度
  const cardWidth = FAN_CARD_WIDTH_MOBILE; // 使用手机上的卡片宽度进行计算

  // 计算扇形实际能展开的最大宽度
  const maxSpread = containerWidth * FAN_MAX_SPREAD_WIDTH_FACTOR;
  
  // 每张卡片理想的 X 轴间距，使得所有卡片能在 maxSpread 内均匀分布
  // 如果卡片总宽度小于 maxSpread，则它们之间会有空隙；如果大于，则会重叠
  const idealXSpacing = (maxSpread - cardWidth) / (totalCards - 1);
  // 限制最小间距（即最大重叠），例如卡片宽度的 -0.6 倍
  const actualXSpacing = Math.max(idealXSpacing, -cardWidth * 0.6);

  const centerIndex = (totalCards - 1) / 2;
  const distanceFromCenter = index - centerIndex;

  // 1. X轴平移：从容器中心点开始，根据卡片索引和间距进行偏移
  const translateX = distanceFromCenter * actualXSpacing;

  // 2. 旋转角度
  const rotationPerCard = FAN_MAX_ROTATION_TOTAL / (totalCards > 1 ? totalCards - 1 : 1);
  const rotation = distanceFromCenter * rotationPerCard;
  
  // 3. Y轴平移 (形成弧形，中间的牌靠下，两边的牌向上抬)
  // (distanceFromCenter / centerIndex)^2 会给出一个从0到1的因子（中心为0，边缘为1）
  let translateY = 0;
  if (centerIndex !== 0) {
    // Y轴偏移，让扇形边缘的牌稍微向上抬起一点
    const normalizedDistance = Math.abs(distanceFromCenter) / centerIndex; // 0 at center, 1 at edges
    translateY = - (cardWidth * FAN_Y_OFFSET_ARC_FACTOR * Math.sin(normalizedDistance * Math.PI / 2));
  }
  translateY += FAN_Y_OFFSET_BASE; // 所有卡片的基础Y偏移

  // 4. Z-index，让中间的牌在最上面
  const zIndex = FAN_Z_INDEX_BASE + totalCards - Math.abs(Math.round(distanceFromCenter));

  return {
    // left: '50%' 和 translateX(-50%) 配合，使卡片相对于容器中心进行定位和变换
    left: '50%', 
    transform: `translateX(calc(-50% + ${translateX}px)) translateY(${translateY}px) rotate(${rotation}deg)`,
    zIndex: zIndex,
    position: 'absolute', // 确保在JS中也设置，以覆盖可能的默认CSS
    bottom: '0px',       // 确保从底部对齐
    transformOrigin: 'bottom center',
  };
}

const mediaQueryList = ref(null);
function checkLayoutMode() {
  if (window.matchMedia("(max-width: 600px)").matches) { // 断点调整为 600px
    layoutMode.value = 'fan';
  } else {
    layoutMode.value = 'flat';
  }
}
onMounted(() => {
  checkLayoutMode();
  mediaQueryList.value = window.matchMedia("(max-width: 600px)");
  if (mediaQueryList.value.addEventListener) {
    mediaQueryList.value.addEventListener('change', checkLayoutMode);
  } else if (mediaQueryList.value.addListener) {
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

// --- Desktop drag and custom event passthrough (same as before) ---
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
.player-hand-container {
  margin-bottom: 10px;
  width: 100%;
  box-sizing: border-box;
  position: relative; /* 让内部绝对定位的卡片相对此容器 */
}
/* Card container styles are now primarily in main.css,
   but we might need some specific overrides for fan layout container here */
.card-container.fan-layout {
  /* Ensure it has enough height for the fan and arc */
  min-height: 130px; /* 根据卡片大小和弧度调整 */
  align-items: flex-end; /* Cards align to the bottom for fanning */
  justify-content: center; /* Center the fan pivot */
  overflow: visible; /* Allow cards to slightly overflow if an arc is desired */
  padding-bottom: 5px; /* Space for the bottom of the fan */
}
</style>
