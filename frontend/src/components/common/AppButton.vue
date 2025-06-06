<template>
  <button class="app-button" @click="$emit('click')">
    <slot></slot>
  </button>
</template>

<script setup lang="ts">
defineEmits(['click']);
</script>

<style scoped>
.app-button {
  padding: 8px 15px;
  border-radius: 5px;
  background-color: #4CAF50;
  color: white;
  border: none;
  cursor: pointer;
  font-size: 1em;
  transition: background-color 0.3s;
}
.app-button:hover {
  background-color: #45a049;
}
</style>
