<template>
  <div class="card" :class="{ 'face-down': !isFaceUp, selected: selected }" @click="onClick">
    <img :src="imageUrl" :alt="altText" />
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  card: { // card 对象 {id: 'ace_of_spades', rank: 'ace', suit: 'spades'} 或 null for back
    type: Object,
    default: null,
  },
  isFaceUp: {
    type: Boolean,
    default: true,
  },
  selected: { // 用于选择牌进行移动
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['click']);

const imageUrl = computed(() => {
  if (!props.isFaceUp || !props.card || !props.card.id || props.card.id === 'back') {
    return `/cards/back.png`; // 确保你有 back.png 在 public/cards/
  }
  // id 已经是 ace_of_spades 这种格式
  return `/cards/${props.card.id}.png`;
});

const altText = computed(() => {
  if (!props.isFaceUp || !props.card || !props.card.id || props.card.id === 'back') {
    return 'Card Back';
  }
  // 将 id 转换成可读的文字
  const parts = props.card.id.split('_of_');
  return `${parts[0].replace('king', 'K').replace('queen', 'Q').replace('jack', 'J').replace('ace','A').toUpperCase()} of ${parts[1]}`;
});

function onClick() {
  if (props.isFaceUp && props.card && props.card.id !== 'back') {
    emit('click', props.card);
  }
}
</script>

<style scoped>
.card {
  width: 70px; /* 根据你的图片大小调整 */
  height: 100px;
  border: 1px solid #ccc;
  border-radius: 5px;
  overflow: hidden;
  display: inline-flex; /* 改为 inline-flex 以适应内容 */
  justify-content: center;
  align-items: center;
  margin: 2px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  background-color: white; /* 卡片背景 */
}
.card img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain; /* 保持图片比例 */
}
.card.selected {
  border: 2px solid blue;
  box-shadow: 0 0 10px blue;
  transform: translateY(-5px);
}
.card:hover {
  transform: scale(1.05);
}
</style>
