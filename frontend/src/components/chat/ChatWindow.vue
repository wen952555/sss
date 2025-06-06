<template>
  <div class="chat-window">
    <div class="messages-area">
      <ChatMessage
        v-for="msg in messages"
        :key="msg.id"
        :message="msg"
        :is-own="msg.senderId === currentUserId"
      />
    </div>
    <div class="input-area">
      <input type="text" v-model="newMessage" @keyup.enter="sendMessage" placeholder="输入消息..." />
      <AppButton @click="sendMessage">发送</AppButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import AppButton from '@/components/common/AppButton.vue';
import ChatMessage from './ChatMessage.vue';
// import { useChatStore } from '@/store/modules/chatStore'; // 引入你的 chat store
// import { useAuthStore } from '@/store/modules/authStore'; // 获取当前用户ID

// const chatStore = useChatStore();
// const authStore = useAuthStore();

// const messages = computed(() => chatStore.messages);
// const currentUserId = computed(() => authStore.user?.id);

// 模拟数据
interface Message { id: number; text: string; senderId: string; senderName: string; timestamp: Date; }
const messages = ref<Message[]>([
  {id:1, text: '大家好!', senderId: 'user1', senderName: '玩家1', timestamp: new Date()},
  {id:2, text: '你好啊!', senderId: 'user2', senderName: '玩家2', timestamp: new Date()},
]);
const currentUserId = ref('user1'); // 假设当前用户

const newMessage = ref('');

const sendMessage = () => {
  if (newMessage.value.trim() === '') return;
  // 实际应通过 chatStore action 发送消息到后端
  console.log('Sending message:', newMessage.value);
  messages.value.push({
      id: Date.now(),
      text: newMessage.value,
      senderId: currentUserId.value,
      senderName: '我',
      timestamp: new Date()
  });
  newMessage.value = '';
};
</script>

<style scoped>
.chat-window {
  border: 1px solid #ccc;
  display: flex;
  flex-direction: column;
  height: 300px; /* Or as needed */
  width: 300px; /* Or as needed */
  background-color: #fff;
}
.messages-area {
  flex-grow: 1;
  overflow-y: auto;
  padding: 10px;
  border-bottom: 1px solid #eee;
}
.input-area {
  display: flex;
  padding: 10px;
}
.input-area input {
  flex-grow: 1;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  margin-right: 5px;
}
</style>
