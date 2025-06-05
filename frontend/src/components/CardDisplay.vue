<template>
  <div
    class="card-display-item" 
    :class="{ 'face-down': !isFaceUp, selected: isSelected, small: small }"
    :title="altText"
  >
    <img :src="imageUrl" :alt="altText" />
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  card: { 
    type: Object, // 卡牌对象: { rank: 'A', suit: 'S', imageFilename: 'ace_of_spades.png' }
    required: true
  },
  isFaceUp: { type: Boolean, default: true },
  isSelected: { type: Boolean, default: false },
  small: { type: Boolean, default: false }
});

const imageUrl = computed(() => {
  if (!props.isFaceUp || !props.card || !props.card.imageFilename) {
    return '/cards/back.png'; // 确保 public/cards/back.png 存在
  }
  return `/cards/${props.card.imageFilename}`; // 图片在 public/cards/ 目录下
});

const altText = computed(() => {
  if (!props.isFaceUp || !props.card) {
    return '牌背';
  }
  const suitMap = { H: '红桃', D: '方块', C: '梅花', S: '黑桃' };
  return `${suitMap[props.card.suit] || props.card.suit} ${props.card.rank}`;
});

// 这个组件本身不处理点击事件，由父组件决定是否监听
</script>

<style scoped>
.card-display-item {
  width: 60px; /* 可以根据需要调整 */
  height: 90px;
  border: 1px solid #aaa;
  border-radius: 5px;
  display: inline-flex; /* 改为 inline-flex 以便在列表中并排 */
  align-items: center;
  justify-content: center;
  margin: 2px; /* 给牌之间一点间距 */
  background-color: #fff;
  box-shadow: 1px 1px 2px rgba(0,0,0,0.1);
  overflow: hidden;
  user-select: none; /* 防止选中图片 */
}
.card-display-item.small {
  width: 40px;
  height: 60px;
  border-radius: 3px;
}
.card-display-item img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
.card-display-item.selected {
  border: 2px solid dodgerblue;
  box-shadow: 0 0 5px dodgerblue;
}
</style>
