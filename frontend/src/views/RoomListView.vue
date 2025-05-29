<template>
  <div class="room-list-view">
    <h2>游戏房间</h2>
    <div class="actions">
      <button @click="handleCreateRoom" :disabled="isCreating">
        {{ isCreating ? '创建中...' : '创建新房间' }}
      </button>
    </div>
    <div v-if="createError" class="error">{{ createError }}</div>

    <hr>
    <h3>加入房间</h3>
    <div>
      <input type="text" v-model="roomCodeToJoin" placeholder="输入房间号">
      <button @click="handleJoinRoomInput" :disabled="isJoining">
        {{ isJoining ? '加入中...' : '加入房间' }}
      </button>
    </div>
    <div v-if="joinError" class="error">{{ joinError }}</div>

    <!-- 房间列表功能可以后续添加 -->
    <!-- <p v-if="isLoadingRooms">加载房间列表中...</p> ... -->
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import api from '../services/api';

const router = useRouter();
const createError = ref('');
const isCreating = ref(false);

const roomCodeToJoin = ref('');
const joinError = ref('');
const isJoining = ref(false);

const handleCreateRoom = async () => {
  createError.value = '';
  isCreating.value = true;
  try {
    const response = await api.createRoom(); // POST /rooms/create
    if (response.data && response.data.room_id) {
      const roomId = response.data.room_id;
      // 创建房间成功后，导航到 GameView，并将 roomId 作为参数
      // GameView 将负责处理 "游戏未开始/等待玩家" 的状态，并提供开始游戏的按钮（如果用户是房主）
      router.push({ name: 'Game', params: { gameId: roomId.toString() } }); // 使用 roomId 作为 GameView 的初始 ID
    } else {
      createError.value = "创建房间后未能获取房间信息。";
    }
  } catch (err) {
    createError.value = err.response?.data?.error || err.message || '创建房间失败。';
  } finally {
    isCreating.value = false;
  }
};

const handleJoinRoomInput = async () => {
  joinError.value = '';
  if (!roomCodeToJoin.value.trim()) {
    joinError.value = '请输入房间号。';
    return;
  }
  isJoining.value = true;
  try {
    const response = await api.joinRoom(roomCodeToJoin.value.trim().toUpperCase());
    // 加入成功后，后端应该返回 roomId 或 gameId
    // 假设 joinRoom 成功后，也导航到 GameView
    // 后端 joinRoom 接口需要返回一个明确的 ID (roomId 或 gameId) 以便导航
    if (response.data && response.data.room_id) { // 或者 response.data.game_id
      // GameView 将需要处理这个ID代表的是一个已加入的房间（可能已开始，可能未开始）
      router.push({ name: 'Game', params: { gameId: response.data.room_id.toString() } });
    } else {
      joinError.value = '加入房间后未能获取房间信息。';
    }
  } catch (err) {
    joinError.value = err.response?.data?.error || err.message || `加入房间 ${roomCodeToJoin.value} 失败。`;
  } finally {
    isJoining.value = false;
  }
};

// 获取房间列表的逻辑可以后续添加
// onMounted(fetchRooms);
</script>

<style scoped>
.room-list-view {
  padding: 1rem; max-width: 500px; margin: auto;
}
.actions button, .room-list-view div button {
  padding: 0.8rem 1.2rem;
  font-size: 1rem;
  margin: 0.5rem;
}
input[type="text"] {
  padding: 0.8rem;
  font-size: 1rem;
  margin-right: 0.5rem;
}
.error {
  color: red;
  margin-top: 1rem;
}
hr { margin: 20px 0; }
</style>
