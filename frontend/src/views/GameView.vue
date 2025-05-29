<template>
  <div class="game-view">
    <div v-if="isLoading">正在加载房间/游戏状态...</div>
    <div v-if="error" class="error-message">错误: {{ error }}</div>

    <div v-if="!isLoading && !error && roomState">
      <h2>房间号: {{ roomState.roomInfo?.room_code || initialId }}</h2>
      <p>状态: {{ translatedGameStatus }}</p>

      <!-- 等待玩家/游戏未开始 界面 -->
      <div v-if="isGameWaitingToStart">
        <h3>当前玩家 ({{ roomState.players?.length || 0 }}/{{ MAX_PLAYERS }}):</h3>
        <ul>
          <li v-for="player in roomState.players" :key="player.userId">
            {{ player.username }}
            <span v-if="player.userId === authStore.user?.userId"> (你)</span>
            <span v-if="player.userId === roomState.roomInfo?.creator_id"> (房主)</span>
          </li>
        </ul>
        <p v-if="(roomState.players?.length || 0) < MIN_PLAYERS_TO_START">
          至少需要 {{ MIN_PLAYERS_TO_START }} 名玩家才能开始游戏。
        </p>
        <button
          v-if="isCurrentUserCreator && (roomState.players?.length || 0) >= MIN_PLAYERS_TO_START"
          @click="handleStartGame"
          :disabled="isStartingGame">
          {{ isStartingGame ? '开始游戏中...' : '开始游戏' }}
        </button>
        <p v-if="!isCurrentUserCreator && (roomState.players?.length || 0) >= MIN_PLAYERS_TO_START">
          等待房主开始游戏...
        </p>
      </div>

      <!-- 游戏进行中 界面 (摆牌等) -->
      <div v-else-if="isGameInProgress">
        <p>当前回合: {{ roomState.gameInfo?.current_round }}</p>
        <div v-if="myHand.length > 0 && !hasSubmittedArrangement" class="my-hand-section">
          <h3>我的手牌 ({{ myHand.length }} 张):</h3>
          <!-- (摆牌相关 UI 和逻辑，之前已提供，此处为简化示意) -->
          <div class="cards-display">
             <Card v-for="card in myHand" :key="card" :card="card" @click="selectCardForArrangement(card)"
                  :class="{selected: isCardSelectedForArrangement(card)}"/>
          </div>
          <div v-if="selectedForArrangement.length > 0">已选: {{ selectedForArrangement.join(', ') }}</div>
          <!-- 摆牌墩位和提交按钮 -->
          <div class="arrangement-piles">
            <div>头道 (3): <span class="pile-cards">{{ arrangedFront.join(', ') }}</span> <button @click="assignToPile('front')" :disabled="selectedForArrangement.length === 0">设置头道</button></div>
            <div>中道 (5): <span class="pile-cards">{{ arrangedMiddle.join(', ') }}</span> <button @click="assignToPile('middle')" :disabled="selectedForArrangement.length === 0">设置中道</button></div>
            <div>尾道 (5): <span class="pile-cards">{{ arrangedBack.join(', ') }}</span> <button @click="assignToPile('back')" :disabled="selectedForArrangement.length === 0">设置尾道</button></div>
            <button @click="clearArrangement">清空墩牌</button>
            <button @click="submitArrangement" :disabled="!canSubmitArrangement || isSubmittingArrangement">
              {{ isSubmittingArrangement ? '提交中...' : '提交牌型' }}
            </button>
          </div>
          <p v-if="arrangementError" class="error-message">{{ arrangementError }}</p>
        </div>
        <div v-if="hasSubmittedArrangement && !roomState.allSubmittedThisRound">等待其他玩家摆牌...</div>
      </div>

      <!-- 游戏结束/比牌结果 界面 -->
      <div v-if="isGameFinishedOrComparing">
         <h3>比牌结果 / 游戏结束</h3>
         <!-- (显示所有玩家的牌和得分，之前已提供，此处为简化示意) -->
      </div>

      <!-- 显示所有玩家信息 (通用，也可按状态细化) -->
      <div class="players-info-section" v-if="roomState.players && roomState.players.length > 0 && (isGameInProgress || isGameFinishedOrComparing)">
        <h4>玩家信息:</h4>
        <div v-for="player in roomState.players" :key="player.userId" class="player-status">
          <p><strong>{{ player.username }}</strong>
            <span v-if="player.userId === authStore.user?.userId"> (你)</span>:
            <span v-if="isGameInProgress">{{ player.hasSubmittedThisRound ? '已摆牌' : '摆牌中...' }}</span>
            <span v-if="isGameFinishedOrComparing && player.arrangement">
              得分: {{ player.scoreThisRound }}
              <!-- 可以显示牌型 -->
            </span>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import Card from '../components/Card.vue'; // 假设 Card.vue 存在

const MAX_PLAYERS = 4; // 可配置
const MIN_PLAYERS_TO_START = 2; // 可配置

const props = defineProps({
  gameId: { // 这个 ID 初期可能是 roomId，开始游戏后可能是真正的 gameId
    type: String,
    required: true
  }
});

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const isLoading = ref(true);
const error = ref('');
const roomState = ref(null); // 将持有从 /game/{id}/state 获取的完整状态

const isStartingGame = ref(false); // 开始游戏按钮的状态
let pollInterval = null;

// 初始 ID (可能是 roomId)
const initialId = computed(() => props.gameId);
// 真正的 gameId，在游戏开始后由后端返回并设置
const activeGameId = ref(null);

// --- 摆牌相关状态 ---
const myHand = ref([]);
const arrangedFront = ref([]);
const arrangedMiddle = ref([]);
const arrangedBack = ref([]);
const selectedForArrangement = ref([]); // 当前点击选中的牌
const isSubmittingArrangement = ref(false);
const arrangementError = ref('');
// --- 结束摆牌相关状态 ---

const fetchRoomOrGameState = async () => {
  // 优先使用 activeGameId (如果游戏已开始)，否则使用 initialId (可能是roomId)
  const idToFetch = activeGameId.value || initialId.value;
  if (!idToFetch) {
    error.value = "无效的房间或游戏ID。";
    isLoading.value = false;
    return;
  }

  try {
    // 后端 /game/{id}/state 接口需要能处理两种情况：
    // 1. id 是 roomId，游戏未开始：返回房间信息、玩家列表、状态'waiting'等
    // 2. id 是 gameId，游戏已开始：返回游戏信息、玩家手牌（对自己）、玩家状态等
    const response = await api.getGameState(idToFetch);
    roomState.value = response.data;

    if (response.data?.gameInfo?.id && response.data?.gameInfo?.status !== 'waiting') {
      activeGameId.value = response.data.gameInfo.id.toString(); // 游戏已开始，记录真正的 gameId
    }

    // 更新当前玩家手牌 (仅当游戏进行中且是自己且未提交时)
    const currentUserData = roomState.value?.players?.find(p => p.userId === authStore.user?.userId);
    if (currentUserData?.hand && !currentUserData?.hasSubmittedThisRound && isGameInProgress.value) {
        myHand.value = currentUserData.hand;
    }


    isLoading.value = false;
    error.value = '';

    // 如果游戏结束，可以停止轮询
    if (roomState.value?.gameInfo?.status === 'finished') {
      stopPolling();
    }

  } catch (err) {
    console.error("获取房间/游戏状态失败:", err);
    error.value = err.response?.data?.error || err.message || '无法加载房间/游戏状态。';
    if (err.response?.status === 404 && pollInterval) { // 房间/游戏不存在
        stopPolling();
        // router.push({ name: 'RoomList' }); // 可选：跳转回房间列表
    }
    isLoading.value = false;
  }
};

const stopPolling = () => {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
};

const isCurrentUserCreator = computed(() => {
  return roomState.value?.roomInfo?.creator_id === authStore.user?.userId;
});

const translatedGameStatus = computed(() => {
  const status = roomState.value?.gameInfo?.status || roomState.value?.room_status; // 兼容房间状态和游戏状态
  if (!status) return '未知';
  switch (status.toLowerCase()) {
    case 'waiting': return '等待玩家加入/开始';
    case 'dealing': return '发牌中';
    case 'arranging': return '摆牌中';
    case 'comparing': return '比牌中';
    case 'finished': return '游戏结束';
    case 'playing': return '游戏中 (可能是概括状态)'; // 如果后端用 playing
    default: return status;
  }
});

const isGameWaitingToStart = computed(() => {
  // 游戏未开始的条件：roomState 存在，但 activeGameId 未设置，
  // 或者 gameInfo.status 是 'waiting'
  return roomState.value && (!activeGameId.value || roomState.value?.gameInfo?.status === 'waiting');
});

const isGameInProgress = computed(() => {
  const status = roomState.value?.gameInfo?.status;
  return status === 'dealing' || status === 'arranging';
});

const isGameFinishedOrComparing = computed(() => {
  const status = roomState.value?.gameInfo?.status;
  return status === 'comparing' || status === 'finished';
});


const handleStartGame = async () => {
  if (!isCurrentUserCreator.value) return;
  isStartingGame.value = true;
  error.value = '';
  try {
    // 使用 initialId (即 roomId) 来调用 startGame
    const response = await api.startGame(initialId.value);
    // startGame 成功后，后端会返回 gameId
    if (response.data && response.data.game_id) {
      activeGameId.value = response.data.game_id.toString(); // 更新 activeGameId
      // 立即获取一次最新状态，而不是等下一次轮询
      await fetchRoomOrGameState();
    } else {
      error.value = response.data?.error || "开始游戏失败，未返回游戏ID。";
    }
  } catch (err) {
    error.value = err.response?.data?.error || err.message || '开始游戏失败。';
  } finally {
    isStartingGame.value = false;
  }
};


// --- 摆牌逻辑简化版 ---
const selectCardForArrangement = (card) => {
    if (arrangedFront.value.includes(card) || arrangedMiddle.value.includes(card) || arrangedBack.value.includes(card)) return;
    const index = selectedForArrangement.value.indexOf(card);
    if (index > -1) {
        selectedForArrangement.value.splice(index, 1);
    } else {
        selectedForArrangement.value.push(card);
    }
};
const isCardSelectedForArrangement = (card) => selectedForArrangement.value.includes(card);

const assignToPile = (pileName) => {
    if (selectedForArrangement.value.length === 0) return;
    let targetPile;
    let maxSize;
    if (pileName === 'front') { targetPile = arrangedFront; maxSize = 3; }
    else if (pileName === 'middle') { targetPile = arrangedMiddle; maxSize = 5; }
    else if (pileName === 'back') { targetPile = arrangedBack; maxSize = 5; }
    else return;

    const currentPileCards = new Set([...arrangedFront.value, ...arrangedMiddle.value, ...arrangedBack.value]);
    const cardsToAdd = [];
    for (const card of selectedForArrangement.value) {
        if (cardsToAdd.length + targetPile.value.length >= maxSize) break;
        if (!currentPileCards.has(card)) { //确保牌未被用于其他墩
            cardsToAdd.push(card);
        }
    }
    targetPile.value.push(...cardsToAdd);
    // 从myHand视觉移除或标记 (更复杂)，或仅从selectedForArrangement移除
    selectedForArrangement.value = selectedForArrangement.value.filter(c => !cardsToAdd.includes(c));
};

const clearArrangement = () => {
    arrangedFront.value = [];
    arrangedMiddle.value = [];
    arrangedBack.value = [];
    selectedForArrangement.value = [];
    arrangementError.value = '';
};

const canSubmitArrangement = computed(() => {
    return arrangedFront.value.length === 3 &&
           arrangedMiddle.value.length === 5 &&
           arrangedBack.value.length === 5;
});

const hasSubmittedArrangement = computed(() => {
    const me = roomState.value?.players?.find(p => p.userId === authStore.user?.userId);
    return me?.hasSubmittedThisRound || false; // 或 has_submitted
});

const submitArrangement = async () => {
    if (!canSubmitArrangement.value) {
        arrangementError.value = "墩牌数量不正确！";
        return;
    }
    isSubmittingArrangement.value = true;
    arrangementError.value = '';
    try {
        const payload = {
            front: arrangedFront.value,
            middle: arrangedMiddle.value,
            back: arrangedBack.value,
        };
        // 使用 activeGameId (如果已开始游戏)
        await api.submitArrangement(activeGameId.value || initialId.value, payload);
        // 提交成功后，轮询会更新状态
        // myHand.value = []; // 清空手牌，因为已提交
        clearArrangement(); // 清空摆牌区
        await fetchRoomOrGameState(); // 立即获取一次状态
    } catch (err) {
        arrangementError.value = err.response?.data?.error || err.message || "提交牌型失败。";
    } finally {
        isSubmittingArrangement.value = false;
    }
};
// --- 结束摆牌逻辑 ---


onMounted(async () => {
  await authStore.checkAuthStatus();
  if (!authStore.isLoggedIn) {
    router.push({ name: 'Login', query: { redirect: route.fullPath } });
    return;
  }
  await fetchRoomOrGameState(); // 初始加载
  pollInterval = setInterval(fetchRoomOrGameState, 5000); // 每5秒轮询
});

onUnmounted(() => {
  stopPolling();
});

// 当路由参数变化时 (例如，从一个游戏跳到另一个游戏，虽然本应用不常见)
watch(() => props.gameId, async (newId, oldId) => {
  if (newId && newId !== oldId) {
    isLoading.value = true;
    roomState.value = null;
    activeGameId.value = null; // 重置
    myHand.value = [];
    clearArrangement();
    stopPolling(); // 停止旧的轮询
    await fetchRoomOrGameState(); // 用新ID获取状态
    pollInterval = setInterval(fetchRoomOrGameState, 5000); // 开始新的轮询
  }
});

</script>

<style scoped>
.game-view { padding: 1rem; }
.error-message { color: red; margin-bottom: 1rem; }
.my-hand-section, .players-info-section, .arrangement-piles { margin-top: 1.5rem; }
.cards-display { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 1rem; cursor: pointer; }
.card.selected { border: 2px solid blue; box-shadow: 0 0 5px blue; }
.arrangement-piles div { margin-bottom: 0.5rem; }
.arrangement-piles button { margin-left: 10px; }
.pile-cards { font-weight: bold; margin-left: 5px; color: #333; }
.player-status { border-bottom: 1px solid #eee; padding: 5px 0; }
ul { list-style-type: none; padding-left: 0; }
li { margin-bottom: 5px; }
button:disabled { background-color: #ccc; cursor: not-allowed; }
</style>
