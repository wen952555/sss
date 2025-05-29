<template>
  <div class="room-list-view">
    <h2>游戏房间</h2>
    <div class="actions">
      <button @click="handleCreateRoom" :disabled="isCreating">
        {{ isCreating ? '创建中...' : '创建新房间' }}
      </button>
    </div>
    <!-- Display createError if it's set -->
    <div v-if="createError" class="error-message">{{ createError }}</div>

    <hr>
    <h3>加入房间</h3>
    <div>
      <input type="text" v-model="roomCodeToJoin" placeholder="输入房间号">
      <button @click="handleJoinRoomInput" :disabled="isJoining">
        {{ isJoining ? '加入中...' : '加入房间' }}
      </button>
    </div>
    <div v-if="joinError" class="error-message">{{ joinError }}</div>

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
  createError.value = ''; // Clear previous error
  isCreating.value = true;
  try {
    const response = await api.createRoom(); // POST /rooms/create

    // Log the entire response for debugging
    console.log("API createRoom response:", response);

    if (response && response.data && response.data.room_id) {
      const roomId = response.data.room_id;
      // Navigate to GameView, using roomId as the initial identifier
      router.push({ name: 'Game', params: { gameId: roomId.toString() } });
    } else {
      // This is where your current error message comes from
      createError.value = "创建房间后未能获取房间信息。";
      // Log the problematic response data to see why room_id is missing
      console.error("Create Room Failed - Response data missing room_id. Actual response.data:", response?.data);
      // If there's an error message from backend, display it
      if (response?.data?.error) {
        createError.value += " 后端错误: " + response.data.error;
      }
    }
  } catch (err) {
    // This block handles network errors or if the server responds with 4xx/5xx without a JSON body axios can parse well
    createError.value = err.response?.data?.error || err.message || '创建房间请求失败。';
    console.error("Create Room API Network/Server Error:", err.response || err);
     if (err.response?.data?.error) {
        createError.value = "创建房间失败: " + err.response.data.error; // More specific
    }
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
    console.log("API joinRoom response:", response);
    if (response.data && response.data.room_id) {
      router.push({ name: 'Game', params: { gameId: response.data.room_id.toString() } });
    } else {
      joinError.value = '加入房间后未能获取房间信息。';
       console.error("Join Room Failed - Response data missing room_id. Actual response.data:", response?.data);
       if (response?.data?.error) {
        joinError.value += " 后端错误: " + response.data.error;
      }
    }
  } catch (err) {
    joinError.value = err.response?.data?.error || err.message || `加入房间 ${roomCodeToJoin.value} 失败。`;
    console.error("Join Room API Network/Server Error:", err.response || err);
    if (err.response?.data?.error) {
        joinError.value = "加入房间失败: " + err.response.data.error;
    }
  } finally {
    isJoining.value = false;
  }
};

// onMounted(fetchRooms); // Room listing can be added later
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
  width: calc(100% - 150px); /* Adjust width as needed */
  min-width: 150px;
}
.error-message { /*统一错误样式类名*/
  color: red;
  margin-top: 1rem;
  padding: 0.5rem;
  border: 1px solid red;
  border-radius: 4px;
  background-color: #ffebeb;
}
hr { margin: 20px 0; }
</style>
