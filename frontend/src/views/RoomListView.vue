<template>
  <div class="room-list-view">
    <h2>游戏房间</h2>
    <div class="actions">
      <button @click="handleCreateRoom" :disabled="isCreating">
        {{ isCreating ? '创建中...' : '创建新房间' }}
      </button>
    </div>
    <div v-if="error" class="error">{{ error }}</div>

    <!-- TODO: List existing rooms here, allow joining -->
    <p>房间列表功能待实现。创建房间后，您将被重定向到游戏界面。</p>
    <p>当前游戏ID (若有): {{ gameId }}</p> <!-- For debugging -->
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import api from '../services/api';

const router = useRouter();
const error = ref('');
const isCreating = ref(false);
const gameId = ref(null); // For debugging, or actual game flow

const handleCreateRoom = async () => {
  error.value = '';
  isCreating.value = true;
  try {
    const response = await api.createRoom();
    // The backend's createRoom returns roomId and roomCode.
    // We need to immediately start the game to get a gameId for this simplified flow.
    // In a real app, you'd go to a room lobby first.
    const roomId = response.data.room_id;
    if (roomId) {
      // Auto-start game for simplicity for now
      const gameStartResponse = await api.startGame(roomId);
      gameId.value = gameStartResponse.data.game_id;
      router.push({ name: 'Game', params: { gameId: gameStartResponse.data.game_id } });
    } else {
      error.value = "创建房间后未能获取房间ID。";
    }
  } catch (err) {
    error.value = err.response?.data?.error || err.message || '创建房间失败。';
  } finally {
    isCreating.value = false;
  }
};

// TODO: Implement fetchRooms and display them
// const rooms = ref([]);
// const fetchRooms = async () => { /* ... api.listRooms() ... */ };
// onMounted(fetchRooms);
</script>

<style scoped>
.room-list-view {
  padding: 1rem;
}
.actions button {
  padding: 0.8rem 1.2rem;
  font-size: 1rem;
  margin-bottom: 1rem;
}
.error { color: red; }
</style>
