<template>
  <div
    class="card-slot"
    :class="{ 'is-over': isOver }"
    @dragover.prevent="handleDragOver"
    @dragleave.prevent="handleDragLeave"
    @drop.prevent="handleDrop"
  >
    <slot>
      <span v-if="isEmpty" class="placeholder-text">{{ placeholder }}</span>
    </slot>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

defineProps<{
  placeholder?: string;
  isEmpty?: boolean;
}>();

const emit = defineEmits(['cardDropped']);

const isOver = ref(false);

const handleDragOver = (event: DragEvent) => {
  isOver.value = true;
  // 允许放置
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move';
  }
};

const handleDragLeave = () => {
  isOver.value = false;
};

const handleDrop = (event: DragEvent) => {
  isOver.value = false;
  if (event.dataTransfer) {
    const cardData = event.dataTransfer.getData('application/json');
    try {
      const card = JSON.parse(cardData);
      emit('cardDropped', card);
    } catch (e) {
      console.error("Failed to parse dropped card data:", e);
    }
  }
};
</script>

<style scoped>
.card-slot {
  width: 80px; /* Adjust as needed */
  height: 110px; /* Adjust as needed */
  border: 2px dashed #ccc;
  border-radius: 5px;
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 5px;
  transition: background-color 0.2s;
}
.card-slot.is-over {
  background-color: #e0e0e0;
  border-color: #aaa;
}
.placeholder-text {
  color: #aaa;
  font-size: 0.9em;
  text-align: center;
}
</style>
