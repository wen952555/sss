<template>
  <div class="room-list-view">
    <h2>游戏房间</h2>
    <div class="actions">
      <button @click="handleCreateRoom" :disabled="isCreating">
        {{ isCreating ? '创建中...' : '创建新房间' }}
      </button>
    </div>
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

    <!-- 房间列表功能可以后续添加 -->
    <!-- <p v-if="isLoadingRooms">加载房间列表中...</p> ... -->
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'; // onMounted might be used if you add fetchRooms
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
  console.log("[RoomListView] Attempting to create room...");
  try {
    const response = await api.createRoom();
    console.log("[RoomListView] API createRoom raw response:", JSON.parse(JSON.stringify(response))); // Deep copy for logging

    if (response && response.data && response.data.room_id) {
      const roomId = response.data.room_id;
      const roomCode = response.data.room_code; // Assuming backend returns this too
      console.log(`[RoomListView] Room created successfully. Room ID: ${roomId}, Room Code: ${roomCode}`);
      console.log(`[RoomListView] Attempting to navigate to Game view with gameId (using roomId): ${roomId.toString()}`);
      try {
        // Using await here ensures we see any navigation errors if they are promise rejections
        await router.push({ name: 'Game', params: { gameId: roomId.toString() } });
        console.log(`[RoomListView] Navigation to Game view for roomId: ${roomId} initiated successfully.`);
      } catch (navigationError) {
        console.error("[RoomListView] Error during navigation to Game view:", navigationError);
        createError.value = `创建房间成功 (ID: ${roomId}), 但导航到游戏界面失败: ${navigationError.message}`;
      }
    } else {
      createError.value = "创建房间后未能获取房间信息（room_id缺失）。";
      console.error("[RoomListView] Create Room Failed - Response data missing room_id. Actual response.data:", response?.data);
      if (response?.data?.error) {
        createError.value += " 后端错误: " + response.data.error;
      }
    }
  } catch (err) {
    console.error("[RoomListView] Create Room API Network/Server Error:", err.response || err);
    createError.value = err.response?.data?.error || err.message || '创建房间请求失败。';
    if (err.response?.data?.error) {
        createError.value = "创建房间失败: " + err.response.data.error;
    }
  } finally {
    isCreating.value = false;
  }
};

const handleJoinRoomInput = async () => {
  joinError.value = '';
  const codeToJoin = roomCodeToJoin.value.trim().toUpperCase();
  if (!codeToJoin) {
    joinError.value = '请输入房间号。';
    return;
  }
  isJoining.value = true;
  console.log(`[RoomListView] Attempting to join room: ${codeToJoin}`);
  try {
    const response = await api.joinRoom(codeToJoin);
    console.log("[RoomListView] API joinRoom raw response:", JSON.parse(JSON.stringify(response)));

    if (response.data && response.data.room_id) {
      const roomId = response.data.room_id;
      console.log(`[RoomListView] Joined room successfully. Room ID: ${roomId}`);
      console.log(`[RoomListView] Attempting to navigate to Game view with gameId (using roomId): ${roomId.toString()}`);
      try {
        await router.push({ name: 'Game', params: { gameId: roomId.toString() } });
        console.log(`[RoomListView] Navigation to Game view for roomId (after join): ${roomId} initiated successfully.`);
      } catch (navigationError) {
        console.error("[RoomListView] Error during navigation to Game view (after join):", navigationError);
        joinError.value = `加入房间成功 (ID: ${roomId}), 但导航到游戏界面失败: ${navigationError.message}`;
      }
    } else {
      joinError.value = '加入房间后未能获取房间信息（room_id缺失）。';
       console.error("[RoomListView] Join Room Failed - Response data missing room_id. Actual response.data:", response?.data);
       if (response?.data?.error) {
        joinError.value += " 后端错误: " + response.data.error;
      }
    }
  } catch (err) {
    console.error("[RoomListView] Join Room API Network/Server Error:", err.response || err);
    joinError.value = err.response?.data?.error || err.message || `加入房间 ${codeToJoin} 失败。`;
    if (err.response?.data?.error) {
        joinError.value = "加入房间失败: " + err.response.data.error;
    }
  } finally {
    isJoining.value = false;
  }
};

// Example: If you wanted to fetch rooms (you'd need a backend endpoint for this)
// const rooms = ref([]);
// const isLoadingRooms = ref(false);
// const fetchRooms = async () => {
//   isLoadingRooms.value = true;
//   try {
//     console.log("[RoomListView] Fetching rooms...");
//     // const response = await api.listRooms(); // Assuming api.js has listRooms
//     // rooms.value = response.data.rooms || [];
//     console.log("[RoomListView] Room listing functionality not fully implemented yet.");
//   } catch (fetchErr) {
//     console.error("[RoomListView] Failed to fetch rooms:", fetchErr);
//     createError.value = "获取房间列表失败。"; // Use createError or a dedicated error ref
//   } finally {
//     isLoadingRooms.value = false;
//   }
// };
// onMounted(() => {
//   // fetchRooms();
// });
</script>

<style scoped>
.room-list-view {
  padding: 1rem; max-width: 500px; margin: auto;
  font-family: sans-serif;
}
.actions button, .room-list-view div button {
  padding: 0.8rem 1.2rem;
  font-size: 1rem;
  margin: 0.5rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  background-color: #007bff;
  color: white;
}
.actions button:disabled, .room-list-view div button:disabled {
  background-color: #ccc;
}
input[type="text"] {
  padding: 0.8rem;
  font-size: 1rem;
  margin-right: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  width: calc(100% - 160px); /* Adjust based on button width */
  min-width: 120px;
}
.error-message {
  color: #721c24;
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  padding: .75rem 1.25rem;
  margin-top: 1rem;
  border-radius: .25rem;
}
hr { margin: 20px 0; border: 0; border-top: 1px solid #eee; }
h2, h3 {
  color: #333;
}
</style>
