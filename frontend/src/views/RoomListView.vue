<template>
  <div class="room-list-view">
    <h2>游戏房间列表</h2>

    <!-- 创建房间的按钮和逻辑已被移除 -->
    <!-- <div class="actions">
      <button @click="handleCreateRoom" :disabled="isCreating">
        {{ isCreating ? '创建中...' : '创建新房间' }}
      </button>,
    </div>
    <div v-if="error" class="error">{{ error }}</div> -->

    <p v-if="isLoadingRooms">加载房间列表中...</p>
    <div v-else-if="rooms.length === 0">
      <p>当前没有可用的游戏房间。您可以等待其他玩家创建房间。</p>
    </div>
    <div v-else class="room-items">
      <h3>可用房间:</h3>
      <ul>
        <li v-for="room in rooms" :key="room.id" @click="handleJoinRoom(room.room_code)">
          房间号: {{ room.room_code }} (创建者: {{ room.creator_username || '未知' }}, 玩家: {{ room.player_count }}/4) - 状态: {{ room.status }}
          <!--  加入按钮可以放在这里，或者点击列表项直接加入 -->
          <button @click.stop="handleJoinRoom(room.room_code)">加入房间</button>
        </li>
      </ul>
    </div>
     <p v-if="joinError" class="error">{{ joinError }}</p>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import api from '../services/api'; // 假设你有一个 listRooms 和 joinRoom 的 API

const router = useRouter();
// const error = ref(''); // 原创建房间的错误提示，暂时不需要
// const isCreating = ref(false); // 原创建房间的状态，暂时不需要

const rooms = ref([]);
const isLoadingRooms = ref(true);
const joinError = ref('');


// 假设你有一个获取房间列表的 API (后端需要实现 /api/rooms GET 请求)
const fetchRooms = async () => {
  isLoadingRooms.value = true;
  try {
    // 后端需要实现这个接口
    // const response = await api.listRooms();
    // rooms.value = response.data.rooms || [];
    // 示例数据，如果后端接口未实现：
    rooms.value = [
      // { id: 1, room_code: 'ABCDE', creator_username: 'Player1', player_count: 1, status: 'waiting' },
      // { id: 2, room_code: 'FGHIJ', creator_username: 'Player2', player_count: 3, status: 'waiting' },
    ];
    console.log("获取房间列表功能待后端实现。");
  } catch (err) {
    console.error("获取房间列表失败:", err);
    // error.value = "获取房间列表失败。"; // 可以用一个独立的错误变量
  } finally {
    isLoadingRooms.value = false;
  }
};

const handleJoinRoom = async (roomCode) => {
  joinError.value = '';
  if (!roomCode) return;
  try {
    const response = await api.joinRoom(roomCode); // POST /rooms/join
    // 成功加入房间后，后端应该返回房间信息或游戏信息
    // 然后前端可以导航到游戏房间/大厅
    // 例如，如果 joinRoom 后直接进入游戏（假设游戏已开始或等待开始）
    // const gameId = response.data.game_id; // 这取决于后端 joinRoom 的响应
    // if (gameId) {
    //   router.push({ name: 'Game', params: { gameId: gameId } });
    // } else if (response.data.room_id) {
       //  或者导航到一个房间等待页面
       // router.push({ name: 'RoomLobby', params: { roomId: response.data.room_id } });
       alert(`加入房间 ${roomCode} 的逻辑待进一步实现前端导航。`);
       // 刷新房间列表可能是一个选项
       fetchRooms();
    // }
  } catch (err) {
    joinError.value = err.response?.data?.error || err.message || `加入房间 ${roomCode} 失败。`;
  }
};

onMounted(() => {
  fetchRooms();
});
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
.error, .joinError {
  color: red;
  margin-top: 1rem;
}
.room-items ul {
  list-style-type: none;
  padding: 0;
}
.room-items li {
  background-color: #f9f9f9;
  border: 1px solid #eee;
  padding: 0.8rem;
  margin-bottom: 0.5rem;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.room-items li:hover {
  background-color: #f0f0f0;
}
.room-items li button {
    padding: 0.4rem 0.8rem;
    font-size: 0.9rem;
}
</style>
