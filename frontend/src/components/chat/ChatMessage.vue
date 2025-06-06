<template>
  <div class="chat-message" :class="{ 'own-message': isOwn }">
    <div class="sender" v-if="!isOwn">{{ message.senderName }}:</div>
    <div class="text">{{ message.text }}</div>
    <div class="timestamp">{{ formatTimestamp(message.timestamp) }}</div>
  </div>
</template>

<script setup lang="ts">
interface Message {
  id: number | string;
  text: string;
  senderId: string;
  senderName: string;
  timestamp: Date;
}

defineProps<{
  message: Message;
  isOwn: boolean;
}>();

const formatTimestamp = (date: Date) => {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};
</script>

<style scoped>
.chat-message {
  margin-bottom: 10px;
  padding: 8px 12px;
  border-radius: 15px;
  max-width: 70%;
  word-wrap: break-word;
}
.chat-message:not(.own-message) {
  background-color: #e9e9eb;
  align-self: flex-start;
  border-bottom-left-radius: 2px;
}
.own-message {
  background-color: #007bff; /* Or your theme color */
  color: white;
  align-self: flex-end;
  margin-left: auto; /* Push to right */
  border-bottom-right-radius: 2px;
}
.sender {
  font-size: 0.8em;
  color: #555;
  margin-bottom: 2px;
}
.own-message .sender { /* Own messages might not show sender name explicitly */
  display: none;
}
.text {
  font-size: 0.95em;
}
.timestamp {
  font-size: 0.7em;
  color: #999;
  text-align: right;
  margin-top: 3px;
}
.own-message .timestamp {
  color: #f0f0f0;
}
</style>
