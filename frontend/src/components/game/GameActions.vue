<template>
  <div class="game-actions">
    <AppButton @click="$emit('arrangeCards')" :disabled="!canArrange">理牌完成/摊牌</AppButton>
    <AppButton @click="$emit('showHint')" :disabled="!canHint">提示</AppButton>
    <!-- 更多动作按钮 -->
  </div>
</template>

<script setup lang="ts">
import AppButton from '@/components/common/AppButton.vue';

defineProps<{
  canArrange?: boolean;
  canHint?: boolean;
}>();

defineEmits(['arrangeCards', 'showHint']);
</script>

<style scoped>
.game-actions {
  margin-top: 20px;
  display: flex;
  gap: 10px;
}
</style>
