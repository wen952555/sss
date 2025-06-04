<template>
  <div
    class="card-display"
    :class="{ 'face-down': !isFaceUp, selected: isSelected, 'small-card': small }"
    @click="handleClick"
    :title="altText"
  >
    <img :src="imageUrl" :alt="altText" />
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  card: { // 卡牌对象: { id:'AS', rank: 'A', suit: 'S', imageFilename: 'ace_of_spades.png' } 或 null
    type: Object,
    default: null
  },
  isFaceUp: { type: Boolean, default: true },
  isSelected: { type: Boolean, default: false },
  isSelectable: { type: Boolean, default: true }, // 是否可点击选中
  small: { type: Boolean, default: false } // 是否是小尺寸牌
});

const emit = defineEmits(['select']);

const imageUrl = computed(() => {
  if (!props.isFaceUp || !props.card || !props.card.imageFilename) {
    return '/cards/back.png'; // 确保 public/cards/back.png 存在
  }
  // 在 vite 中，public 目录下的文件会直接复制到 dist 根目录
  return `/cards/${props.card.imageFilename}`;
});

const altText = computed(() => {
  if (!props.isFaceUp || !props.card) {
    return '牌背';
  }
  // 可以做得更友好，例如 Ace of Spades -> 黑桃 A
  const suitMap = { H: '红桃', D: '方块', C: '梅花', S: '黑桃' };
  return `${suitMap[props.card.suit] || props.card.suit} ${props.card.rank}`;
});

function handleClick() {
  if (props.isSelectable && props.card && props.isFaceUp) {
    emit('select', props.card);
  }
}
</script>

<style scoped>
.card-display {
  width: 70px;
  height: 100px;
  border: 1px solid #aaa;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin: 3px;
  background-color: #fff;
  box-shadow: 1px 1px 3px rgba(0,0,0,0.2);
  overflow: hidden;
  transition: transform 0.1s ease-in-out, box-shadow 0.1s ease-in-out;
  cursor: default;
}
.card-display.small-card {
  width: 42px;
  height: 60px;
  margin: 1px;
  border-radius: 3px;
}

.card-display[isSelectable="true"]:hover {
  transform: translateY(-3px);
  box-shadow: 2px 4px 6px rgba(0,0,0,0.3);
  cursor: pointer;
}

.card-display img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain; /* 保持图片比例，完整显示 */
}

.card-display.selected {
  border: 2px solid dodgerblue;
  transform: translateY(-5px) scale(1.05);
  box-shadow: 0 0 10px dodgerblue;
}

.card-display.face-down {
  background-color: #eee; /* 可以给牌背一个不同的底色 */
}
</style>
