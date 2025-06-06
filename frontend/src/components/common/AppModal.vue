<template>
  <transition name="modal-fade">
    <div v-if="show" class="modal-backdrop" @click.self="$emit('close')">
      <div class="modal-content">
        <header class="modal-header">
          <slot name="header">
            Default Header
          </slot>
          <button type="button" class="btn-close" @click="$emit('close')">x</button>
        </header>
        <section class="modal-body">
          <slot name="body">
            Default body
          </slot>
        </section>
        <footer class="modal-footer">
          <slot name="footer">
            <AppButton @click="$emit('close')">关闭</AppButton>
          </slot>
        </footer>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import AppButton from './AppButton.vue';

defineProps<{
  show: boolean;
}>();
defineEmits(['close']);
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: rgba(0, 0, 0, 0.3);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  box-shadow: 2px 2px 20px 1px;
  overflow-x: auto;
  display: flex;
  flex-direction: column;
  border-radius: 8px;
  width: 500px; /* Or make it responsive */
  max-width: 90%;
}

.modal-header,
.modal-footer {
  padding: 15px;
  display: flex;
}

.modal-header {
  position: relative;
  border-bottom: 1px solid #eeeeee;
  color: #4AAE9B;
  justify-content: space-between;
  font-weight: bold;
}

.modal-footer {
  border-top: 1px solid #eeeeee;
  flex-direction: row;
  justify-content: flex-end;
}

.modal-body {
  position: relative;
  padding: 20px 15px;
}

.btn-close {
  position: absolute;
  top: 0;
  right: 0;
  border: none;
  font-size: 20px;
  padding: 10px;
  cursor: pointer;
  font-weight: bold;
  color: #4AAE9B;
  background: transparent;
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>
