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
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'; // Added watch
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
const cardContainerRef = ref(null); // Ref for the card container
const layoutMode = ref(props.initialLayoutMode);

// --- 扇形布局参数 (这些值需要仔细调整以达到期望效果) ---
const FAN_TOTAL_ANGLE_SPREAD = 30;    // 整个扇形的最大角度 (例如 30-45 度)
const FAN_CARD_ROTATION_STEP = 3;    // 如果不用总角度，可以设置每张牌的旋转步长
const FAN_CARD_X_OFFSET = 25;        // 卡片在X轴上的偏移量 (决定重叠程度, 原始卡片宽度的一部分)
const FAN_CARD_Y_OFFSET_ARC_PEAK = 15; // 扇形顶点（中间的牌）的Y轴向上偏移量，形成弧度
const FAN_Z_INDEX_BASE = 10;         // z-index 基础值

function getFanCardStyle(index, totalCards) {
  if (totalCards <= 1) {
    return { transform: 'translateX(0px) rotate(0deg) translateY(0px)', zIndex: FAN_Z_INDEX_BASE + index };
  }

  const मध्यबिंदु = (totalCards - 1) / 2; // 中心卡片的索引 (可以是小数)
  const distanceFromCenter = index - मध्यबिंदु; // 当前卡片与中心的距离 (-n/2 to n/2)

  // 1. 计算旋转角度
  let rotation = distanceFromCenter * FAN_CARD_ROTATION_STEP;
  // 或者，如果想让整个扇形固定在一个总角度内：
  // const anglePerCard = FAN_TOTAL_ANGLE_SPREAD / (totalCards -1);
  // rotation = distanceFromCenter * anglePerCard;
  
  // 2. 计算X轴平移 (基于卡片宽度和重叠量)
  // FAN_CARD_X_OFFSET 应该是实际px值，或者基于卡片宽度的百分比
  // 假设卡片宽度是 W, 我们想让每张牌露出 W * (1 - overlap_percentage)
  // 这里 FAN_CARD_X_OFFSET 代表每张牌相对前一张牌的偏移
  const translateX = distanceFromCenter * FAN_CARD_X_OFFSET;

  // 3. 计算Y轴平移 (形成弧形)
  // 使用抛物线或正弦函数使中间的牌最低（或最高，取决于你想要的弧形）
  // (distanceFromCenter / मध्यबिंदु)^2 会得到一个 0 到 1 的值 (中心为0，边缘为1)
  // 我们希望中间的牌Y偏移最大（如果是向上拱起）或最小（如果是向下凹陷）
  // 这里我们让边缘的牌Y偏移大，中间的牌Y偏移小（更靠下）
  let translateY = 0;
  if (मध्यबिंदु !== 0) { // 避免除以0
      // (distanceFromCenter / मध्यबिंदु) 的平方，范围 0 (中心) 到 1 (边缘)
      // 我们希望中间的牌translateY小（更靠下），边缘的牌translateY大（更靠上）
      // 或者反过来，让中间的牌translateY大（更靠上）
      translateY = FAN_CARD_Y_OFFSET_ARC_PEAK * (1 - Math.pow(distanceFromCenter / (totalCards/2), 2));
      // 为了让中间的牌更靠上，形成您图中的弧度，应该是：
      translateY = -FAN_CARD_Y_OFFSET_ARC_PEAK * (1 - Math.abs(distanceFromCenter / (totalCards/2))); // 负值向上
      // 或者更简单的抛物线，让边缘的牌向上偏移
      translateY = Math.pow(distanceFromCenter, 2) * (FAN_CARD_Y_OFFSET_ARC_PEAK / Math.pow(totalCards/2, 2)) * -0.5; // 调整系数
      // 尝试更符合图中效果的：中间的牌在最下方（Y偏移最小或为0），两边的牌向上抬起并旋转
      // Y偏移基于到中心的距离的平方，越远越高
      const normalizedDistSq = Math.pow(distanceFromCenter / (totalCards / 2), 2); // 0 at center, 1 at edges
      translateY = -FAN_CARD_Y_OFFSET_ARC_PEAK * normalizedDistSq; // 负值向上

  }


  // 4. 计算 z-index，让中间的牌在最上面，或者边缘的牌在最上面
  // 这里让边缘的牌在下面，中间的牌在上面
  const zIndex = FAN_Z_INDEX_BASE + totalCards - Math.abs(Math.round(distanceFromCenter));

  return {
    transform: `translateX(${translateX}px) translateY(${translateY}px) rotate(${rotation}deg)`,
    zIndex: zIndex,
    // 如果卡片容器的 align-items 是 flex-end, bottom:0 可能不需要了
    // position: 'absolute', // 这个由 .fan-layout .card 在 CSS 中设置
    // bottom: '5px', // 也在 CSS 中设置
  };
}

// --- 响应式布局切换 (与上一版相同) ---
const mediaQueryList = ref(null);
function checkLayoutMode() {
  if (window.matchMedia("(max-width: 768px)").matches) { // 将断点调整为768px
    layoutMode.value = 'fan';
  } else {
    layoutMode.value = 'flat';
  }
}
onMounted(() => {
  checkLayoutMode();
  mediaQueryList.value = window.matchMedia("(max-width: 768px)");
  mediaQueryList.value.addEventListener('change', checkLayoutMode);
});
onBeforeUnmount(() => {
  if (mediaQueryList.value) {
    mediaQueryList.value.removeEventListener('change', checkLayoutMode);
  }
});

// --- 拖拽事件处理 (与上一版相同) ---
function onDesktopDragOver(event) { /* ... */ 
  if (props.droppable) {
    event.preventDefault(); 
    event.dataTransfer.
