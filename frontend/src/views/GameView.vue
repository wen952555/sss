<template>
  <div class="game-view">
    <div v-if="isLoadingInitial" class="loading-state">正在加载房间/游戏状态... (ID: {{ initialId }})</div>
    <div v-if="pageError" class="error-message global-error">页面错误: {{ pageError }}</div>

    <div v-if="!isLoadingInitial && !pageError && currentRoomState">
      <h2>房间号: {{ currentRoomState.gameInfo?.room_code || initialId }}</h2>
      <p>当前状态: <span :class="statusClass">{{ translatedGameStatus }}</span></p>
      <p v-if="currentRoomState.gameInfo?.id">游戏ID: {{ currentRoomState.gameInfo.id }}</p>

      <!-- 等待玩家/游戏未开始 界面 -->
      <div v-if="isGameWaitingToStart" class="waiting-lobby">
        <h3>当前玩家 ({{ currentRoomState.players?.length || 0 }}/{{ MAX_PLAYERS_CONST_FE }}):</h3>
        <ul v-if="currentRoomState.players && currentRoomState.players.length > 0">
          <li v-for="player in currentRoomState.players" :key="player.userId">
            {{ player.username }}
            <span v-if="player.userId === authStore.user?.userId"> (你)</span>
            <span v-if="player.userId === currentRoomState.gameInfo?.creator_id" class="creator-tag"> (房主)</span>
          </li>
        </ul>
        <p v-else>房间内暂无玩家。</p>

        <p v-if="(currentRoomState.players?.length || 0) < MIN_PLAYERS_TO_START_CONST_FE" class="info-text">
          至少需要 {{ MIN_PLAYERS_TO_START_CONST_FE }} 名玩家才能开始游戏。
        </p>
        <button
          v-if="isCurrentUserCreator && (currentRoomState.players?.length || 0) >= MIN_PLAYERS_TO_START_CONST_FE"
          @click="handleStartGame"
          :disabled="isStartingGame || isLoadingState"
          class="start-game-button">
          {{ isStartingGame ? '开始游戏中...' : `开始游戏 (${currentRoomState.players?.length || 0}人)` }}
        </button>
        <p v-if="!isCurrentUserCreator && (currentRoomState.players?.length || 0) >= MIN_PLAYERS_TO_START_CONST_FE && currentRoomState.gameInfo?.status === 'waiting'" class="info-text">
          等待房主开始游戏...
        </p>
        <div v-if="startGameError" class="error-message">{{ startGameError }}</div>
      </div>

      <!-- 游戏进行中 界面 (摆牌等) -->
      <div v-else-if="isGameInProgress" class="game-in-progress">
        <p>当前回合: {{ currentRoomState.gameInfo?.current_round }}</p>
        <div v-if="myHandDisplay.length > 0 && !hasSubmittedArrangement" class="my-hand-section">
          <h3>我的手牌 ({{ myHandDisplay.length }} 张):</h3>
          <div class="cards-display">
             <Card v-for="card in myHandDisplay" :key="card" :card="card" @click="selectCardForArrangement(card)"
                  :class="{selected: isCardSelectedForArrangement(card)}"/>
          </div>
          <div v-if="selectedForArrangement.length > 0" class="selected-cards-info">已选: {{ selectedForArrangement.join(', ') }}</div>
          <div class="arrangement-piles">
            <div>头道 (3): <span class="pile-cards">{{ arrangedFront.join(', ') }}</span> <button @click="assignToPile('front')" :disabled="selectedForArrangement.length === 0 || arrangedFront.length >=3">设置头道</button></div>
            <div>中道 (5): <span class="pile-cards">{{ arrangedMiddle.join(', ') }}</span> <button @click="assignToPile('middle')" :disabled="selectedForArrangement.length === 0 || arrangedMiddle.length >=5">设置中道</button></div>
            <div>尾道 (5): <span class="pile-cards">{{ arrangedBack.join(', ') }}</span> <button @click="assignToPile('back')" :disabled="selectedForArrangement.length === 0 || arrangedBack.length >=5">设置尾道</button></div>
            <button @click="clearArrangement" class="clear-button">重置墩牌</button>
            <button @click="submitArrangement" :disabled="!canSubmitArrangement || isSubmittingArrangement" class="submit-button">
              {{ isSubmittingArrangement ? '提交中...' : '提交牌型' }}
            </button>
          </div>
          <div v-if="arrangementError" class="error-message">{{ arrangementError }}</div>
        </div>
        <div v-if="hasSubmittedArrangement && currentRoomState.players && !currentRoomState.allSubmittedThisRound" class="info-text">等待其他玩家摆牌...</div>
         <div v-if="currentRoomState.allSubmittedThisRound && currentRoomState.gameInfo?.status === 'arranging'" class="info-text">所有玩家已摆牌，准备比牌...</div>
      </div>

      <!-- 游戏结束/比牌结果 界面 -->
      <div v-if="isGameFinishedOrComparing" class="game-results">
         <h3>{{ currentRoomState.gameInfo?.status === 'comparing' ? '比牌中...' : '游戏结束' }}</h3>
         <!-- TODO: Display all players' arranged hands and scores -->
         <div v-for="player in currentRoomState.players" :key="'res_'+player.userId" class="player-result">
            <h4>{{player.username}} {{ player.userId === authStore.user?.userId ? '(你)' : '' }}</h4>
            <div v-if="player.arrangement">
                <p>头道: <Card v-for="c in player.arrangement.front" :key="c+'f'" :card="c" small /> </p>
                <p>中道: <Card v-for="c in player.arrangement.middle" :key="c+'m'" :card="c" small /> </p>
                <p>尾道: <Card v-for="c in player.arrangement.back" :key="c+'b'" :card="c" small /> </p>
                <p>本局得分: {{ player.scoreThisRound }}</p>
            </div>
            <p v-else-if="currentRoomState.gameInfo?.status === 'comparing'">等待 {{player.username}} 的牌...</p>
         </div>
      </div>

      <!-- 通用玩家信息展示 (可选，如果上面各状态已包含) -->
      <div class="players-info-section" v-if="currentRoomState.players && currentRoomState.players.length > 0 && (isGameInProgress || isGameFinishedOrComparing)">
        <h4>其他玩家状态:</h4>
        <div v-for="player in currentRoomState.players.filter(p => p.userId !== authStore.user?.userId)" :key="'status_'+player.userId" class="player-status-others">
          <p><strong>{{ player.username }}</strong>:
            <span v-if="isGameInProgress">{{ player.hasSubmittedThisRound ? '已摆牌' : '摆牌中...' }}</span>
          </p>
        </div>
      </div>
    </div>
    <div v-else-if="!isLoadingInitial && !pageError && !currentRoomState">
        <p>无法获取房间信息，请尝试返回房间列表。</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import Card from '../components/Card.vue';

const MAX_PLAYERS_CONST_FE = 4;
const MIN_PLAYERS_TO_START_CONST_FE = 2;

const props = defineProps({
  gameId: {
    type: String,
    required: true
  }
});

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const isLoadingInitial = ref(true); // For initial load
const isLoadingState = ref(false); // For subsequent poll updates
const pageError = ref(''); // General page error
const currentRoomState = ref(null);
const startGameError = ref('');

const isStartingGame = ref(false);
let pollInterval = null;

const initialId = computed(() => props.gameId); // This is initially roomId
const activeGameIdInternal = ref(null); // Stores the actual game_id once game starts

// --- 摆牌相关状态 ---
const myHandDisplay = ref([]);
const arrangedFront = ref([]);
const arrangedMiddle = ref([]);
const arrangedBack = ref([]);
const selectedForArrangement = ref([]);
const isSubmittingArrangement = ref(false);
const arrangementError = ref('');
// --- 结束摆牌相关状态 ---

const fetchRoomOrGameState = async (isInitialLoad = false) => {
  if (!isInitialLoad) isLoadingState.value = true; // For poll updates
  const idToFetch = activeGameIdInternal.value || initialId.value;
  console.log(`[GameView] fetchRoomOrGameState called. ID to fetch: ${idToFetch}, InitialLoad: ${isInitialLoad}`);

  if (!idToFetch) {
    pageError.value = "无效的房间或游戏ID。";
    if (isInitialLoad) isLoadingInitial.value = false;
    isLoadingState.value = false;
    console.error("[GameView] fetchRoomOrGameState: No ID to fetch.");
    return;
  }

  try {
    const response = await api.getGameState(idToFetch);
    console.log("[GameView] api.getGameState response:", JSON.parse(JSON.stringify(response.data)));
    currentRoomState.value = response.data;

    if (currentRoomState.value?.gameInfo?.id && currentRoomState.value?.gameInfo?.status !== 'waiting') {
      activeGameIdInternal.value = currentRoomState.value.gameInfo.id.toString();
      console.log("[GameView] Active game ID set to:", activeGameIdInternal.value);
    }

    const currentUserData = currentRoomState.value?.players?.find(p => p.userId === authStore.user?.userId);
    if (currentUserData?.hand && currentRoomState.value?.gameInfo?.status === 'arranging' && !currentUserData?.hasSubmittedThisRound) {
        myHandDisplay.value = currentUserData.hand;
        console.log("[GameView] My hand updated:", myHandDisplay.value);
    } else if (currentRoomState.value?.gameInfo?.status !== 'arranging' || currentUserData?.hasSubmittedThisRound) {
        // Clear hand if not in arranging phase or already submitted
        // myHandDisplay.value = []; // Or keep showing if needed for review after submit
    }


    if (isInitialLoad) isLoadingInitial.value = false;
    isLoadingState.value = false;
    pageError.value = ''; // Clear previous page errors on successful fetch

    if (currentRoomState.value?.gameInfo?.status === 'finished') {
      stopPolling();
      console.log("[GameView] Game finished, polling stopped.");
    }

  } catch (err) {
    console.error("[GameView] 获取房间/游戏状态失败:", err.response || err);
    pageError.value = err.response?.data?.error || err.message || '无法加载房间/游戏状态。';
    if (err.response?.status === 404 && pollInterval) {
        stopPolling();
        console.log("[GameView] Room/Game not found (404), polling stopped.");
    }
    if (isInitialLoad) isLoadingInitial.value = false;
    isLoadingState.value = false;
  }
};

const stopPolling = () => {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
    console.log("[GameView] Polling interval cleared.");
  }
};

const isCurrentUserCreator = computed(() => {
  if (!currentRoomState.value || !authStore.user) return false;
  return currentRoomState.value.gameInfo?.creator_id === authStore.user.userId;
});

const translatedGameStatus = computed(() => {
  const status = currentRoomState.value?.gameInfo?.status;
  if (!status) return '获取中...';
  switch (status.toLowerCase()) {
    case 'waiting': return '等待玩家加入或房主开始';
    case 'dealing': return '发牌中...';
    case 'arranging': return '请摆牌';
    case 'comparing': return '比牌中...';
    case 'finished': return '本局游戏结束';
    default: return status;
  }
});
const statusClass = computed(() => {
    return `status-${currentRoomState.value?.gameInfo?.status?.toLowerCase() || 'unknown'}`;
});


const isGameWaitingToStart = computed(() => {
  return currentRoomState.value && currentRoomState.value.gameInfo?.status === 'waiting';
});

const isGameInProgress = computed(() => {
  const status = currentRoomState.value?.gameInfo?.status;
  return status === 'dealing' || status === 'arranging';
});

const isGameFinishedOrComparing = computed(() => {
  const status = currentRoomState.value?.gameInfo?.status;
  return status === 'comparing' || status === 'finished';
});


const handleStartGame = async () => {
  if (!isCurrentUserCreator.value) {
    console.warn("[GameView] Non-creator attempted to start game.");
    return;
  }
  isStartingGame.value = true;
  startGameError.value = '';
  console.log(`[GameView] Attempting to start game with initialId (roomId): ${initialId.value}`);
  try {
    const response = await api.startGame(initialId.value); // Use initialId (roomId) to start
    console.log("[GameView] api.startGame response:", JSON.parse(JSON.stringify(response.data)));
    if (response.data && response.data.game_id) {
      activeGameIdInternal.value = response.data.game_id.toString();
      console.log("[GameView] Game started successfully. Active game ID:", activeGameIdInternal.value);
      await fetchRoomOrGameState(true); // Fetch state immediately with new gameId
    } else {
      startGameError.value = response.data?.error || "开始游戏失败，未返回有效游戏信息。";
      console.error("[GameView] Start game failed, problematic response:", response.data);
    }
  } catch (err) {
    console.error("[GameView] Start game API error:", err.response || err);
    startGameError.value = err.response?.data?.error || err.message || '开始游戏请求失败。';
  } finally {
    isStartingGame.value = false;
  }
};

// --- 摆牌逻辑 ---
const selectCardForArrangement = (card) => {
    if (!myHandDisplay.value.includes(card)) {
        console.warn("[GameView] Attempted to select card not in hand:", card);
        return;
    }
    if (arrangedFront.value.includes(card) || arrangedMiddle.value.includes(card) || arrangedBack.value.includes(card)) {
        console.log("[GameView] Card already placed in a pile, deselecting from pile first if re-arranging is allowed.");
        // Basic deselect: remove from piles if clicked again (more complex UI needed for robust re-arrangement)
        let found = false;
        [arrangedFront, arrangedMiddle, arrangedBack].forEach(pile => {
            const index = pile.value.indexOf(card);
            if (index > -1) {
                pile.value.splice(index, 1);
                found = true;
            }
        });
        // If it was found and removed from a pile, add it back to selection or hand for re-selection
        if (found) {
             if (!selectedForArrangement.value.includes(card)) selectedForArrangement.value.push(card);
             return;
        }
    }

    const indexInSelection = selectedForArrangement.value.indexOf(card);
    if (indexInSelection > -1) {
        selectedForArrangement.value.splice(indexInSelection, 1); // Deselect
    } else {
        selectedForArrangement.value.push(card); // Select
    }
    console.log("[GameView] Selected for arrangement:", selectedForArrangement.value);
};
const isCardSelectedForArrangement = (card) => selectedForArrangement.value.includes(card);

const assignToPile = (pileName) => {
    if (selectedForArrangement.value.length === 0) {
        arrangementError.value = "请先选择要放置的牌。";
        return;
    }
    arrangementError.value = '';
    let targetPileRef;
    let maxSize;
    if (pileName === 'front') { targetPileRef = arrangedFront; maxSize = 3; }
    else if (pileName === 'middle') { targetPileRef = arrangedMiddle; maxSize = 5; }
    else if (pileName === 'back') { targetPileRef = arrangedBack; maxSize = 5; }
    else return;

    // Filter out cards already in *any* pile from the current selection
    const cardsAlreadyInAnyPile = new Set([...arrangedFront.value, ...arrangedMiddle.value, ...arrangedBack.value]);
    const validSelectedCards = selectedForArrangement.value.filter(c => !cardsAlreadyInAnyPile.has(c));

    let addedCount = 0;
    for (const card of validSelectedCards) {
        if (targetPileRef.value.length < maxSize) {
            targetPileRef.value.push(card);
            addedCount++;
        } else {
            arrangementError.value = `此墩已满 (${maxSize}张)。`;
            break;
        }
    }
    // Remove added cards from the main selection list
    selectedForArrangement.value = selectedForArrangement.value.filter(c => !targetPileRef.value.includes(c));
    console.log(`[GameView] Assigned to ${pileName}:`, targetPileRef.value, "Remaining selection:", selectedForArrangement.value);
};

const clearArrangement = () => {
    arrangedFront.value = [];
    arrangedMiddle.value = [];
    arrangedBack.value = [];
    selectedForArrangement.value = []; // Also clear current selection
    arrangementError.value = '';
    console.log("[GameView] Arrangement cleared.");
};

const canSubmitArrangement = computed(() => {
    return arrangedFront.value.length === 3 &&
           arrangedMiddle.value.length === 5 &&
           arrangedBack.value.length === 5;
});

const hasSubmittedArrangement = computed(() => {
    if(!currentRoomState.value || !currentRoomState.value.players || !authStore.user) return false;
    const me = currentRoomState.value.players.find(p => p.userId === authStore.user.userId);
    return me?.hasSubmittedThisRound || false;
});

const submitArrangement = async () => {
    if (!canSubmitArrangement.value) {
        arrangementError.value = "墩牌数量不正确！头道3张，中道5张，尾道5张。";
        return;
    }
    // TODO: Add "倒水" validation client-side if possible (complex)
    isSubmittingArrangement.value = true;
    arrangementError.value = '';
    const gameIdForSubmit = activeGameIdInternal.value || initialId.value; // Should be activeGameId by this point
    console.log(`[GameView] Submitting arrangement for game ID: ${gameIdForSubmit}`);

    try {
        const payload = {
            front: arrangedFront.value,
            middle: arrangedMiddle.value,
            back: arrangedBack.value,
        };
        await api.submitArrangement(gameIdForSubmit, payload);
        console.log("[GameView] Arrangement submitted successfully.");
        // Don't clear arrangement here, let state update show it or backend confirm
        // myHandDisplay.value = []; // Hand is used up
        await fetchRoomOrGameState(); // Refresh state
    } catch (err) {
        console.error("[GameView] Submit arrangement API error:", err.response || err);
        arrangementError.value = err.response?.data?.error || err.message || "提交牌型失败。";
    } finally {
        isSubmittingArrangement.value = false;
    }
};
// --- 结束摆牌逻辑 ---

onMounted(async () => {
  console.log("[GameView] Component onMounted. Initial gameId prop:", props.gameId);
  isLoadingInitial.value = true; // Set loading true at the very start
  pageError.value = ''; // Clear previous page errors
  await authStore.checkAuthStatus();
  console.log("[GameView] Auth status checked. Logged in:", authStore.isLoggedIn, "User:", authStore.user);

  if (!authStore.isLoggedIn || !authStore.user) { // Also check if user object exists
    console.warn("[GameView] User not logged in or user data unavailable, redirecting to Login.");
    router.push({ name: 'Login', query: { redirect: route.fullPath } });
    isLoadingInitial.value = false;
    return;
  }

  console.log("[GameView] User logged in. Attempting initial fetchRoomOrGameState...");
  await fetchRoomOrGameState(true); // Pass true for initial load
  console.log("[GameView] Initial fetchRoomOrGameState completed. Current state:", JSON.parse(JSON.stringify(currentRoomState.value)));

  if (pollInterval) clearInterval(pollInterval);
  pollInterval = setInterval(fetchRoomOrGameState, 5000);
  console.log("[GameView] Polling started every 5 seconds.");
});

onUnmounted(() => {
  stopPolling();
  console.log("[GameView] Component onUnmounted, polling stopped.");
});

watch(() => props.gameId, async (newId, oldId) => {
  console.log(`[GameView] props.gameId changed from ${oldId} to ${newId}`);
  if (newId && newId !== oldId) {
    console.log("[GameView] Game ID prop changed. Resetting state and fetching new data...");
    isLoadingInitial.value = true;
    pageError.value = '';
    currentRoomState.value = null;
    activeGameIdInternal.value = null;
    myHandDisplay.value = [];
    clearArrangement();
    stopPolling();
    await fetchRoomOrGameState(true); // Fetch with new ID as initial load
    if (!pageError.value) { // Only restart polling if fetch was successful
        pollInterval = setInterval(fetchRoomOrGameState, 5000);
        console.log("[GameView] Polling restarted for new gameId.");
    }
  }
}, { immediate: false }); // 'immediate: false' to avoid running on initial mount if not needed

</script>

<style scoped>
.game-view { padding: 1rem; font-family: sans-serif; color: #333; }
.loading-state, .info-text { margin: 20px; text-align: center; color: #666; }
.error-message {
  color: #D8000C; background-color: #FFD2D2; border: 1px solid #D8000C;
  padding: 10px; margin: 10px 0; border-radius: 4px;
}
.global-error { font-size: 1.2em; text-align: center; }
h2, h3, h4 { color: #1a59a7; margin-top: 1.5em; margin-bottom: 0.5em;}
h2 { font-size: 1.8em; text-align: center; }
h3 { font-size: 1.4em; }
ul { list-style-type: none; padding-left: 0; }
li { background-color: #f9f9f9; padding: 8px; margin-bottom: 5px; border-radius: 3px; border-left: 3px solid #007bff; }
.creator-tag { font-weight: bold; color: #28a745; margin-left: 5px; }
button {
  padding: 10px 15px; font-size: 1em; cursor: pointer;
  background-color: #007bff; color: white; border: none; border-radius: 4px;
  margin: 5px; transition: background-color 0.2s ease;
}
button:hover { background-color: #0056b3; }
button:disabled { background-color: #ccc; cursor: not-allowed; }
.start-game-button { background-color: #28a745; }
.start-game-button:hover { background-color: #1e7e34; }
.clear-button { background-color: #ffc107; color: #212529; }
.clear-button:hover { background-color: #e0a800; }
.submit-button { background-color: #17a2b8; }
.submit-button:hover { background-color: #117a8b; }

.my-hand-section, .arrangement-piles {
  border: 1px solid #ddd; padding: 15px; margin-top: 20px; border-radius: 5px; background-color: #fff;
}
.cards-display { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 15px; padding: 10px; background-color: #e9ecef; border-radius: 4px;}
.selected-cards-info { margin-bottom: 10px; font-style: italic; color: #555; }
.arrangement-piles div { margin-bottom: 10px; display: flex; align-items: center; }
.arrangement-piles div button { margin-left: auto; } /* Push buttons to the right */
.pile-cards { font-weight: bold; margin-left: 8px; min-width: 150px; /* Ensure space for cards */ }

.status-waiting { color: #ffc107; font-weight: bold; }
.status-arranging { color: #17a2b8; font-weight: bold; }
.status-comparing { color: #fd7e14; font-weight: bold; }
.status-finished { color: #28a745; font-weight: bold; }
.status-unknown { color: #6c757d; }

.player-result, .player-status-others { border: 1px solid #eee; padding: 10px; margin-bottom: 10px; border-radius: 4px;}
</style>
