<template>
  <div id="app-container">
    <GameTableView />
  </div>
</template>

<script setup lang="ts">
import GameTableView from './views/GameTableView.vue';
</script>

<style>
/* 全局样式，或者在 assets/main.css 中引入 */
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  background-color: #f0f0f0;
}
#app-container {
  padding: 10px;
}
</style>
