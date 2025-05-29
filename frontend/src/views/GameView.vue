<template>
  <div class="game-view">
    <div v-if="isLoadingInitial" class="loading-state">正在加载房间/游戏状态... (ID: {{ initialIdDisplay }})</div>
    <div v-if="pageError" class="error-message global-error">页面错误: {{ pageError }}</div>

    <div v-if="!isLoadingInitial && !pageError && currentRoomState">
      <h2>房间号: {{ currentRoomState.gameInfo?.room_code || initialIdDisplay }}</h2>
      <p>当前状态: <span :class="statusClass">{{ translatedGameStatus }}</span></p>
      <p v-if="currentRoomState.gameInfo?.id">游戏ID (进行中): {{ currentRoomState.gameInfo.id }}</p>

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
         <h3>{{ currentRoomState.gameInfo?.status === 'comparing' ? '比牌中...' : '本局游戏结束' }}</h3>
         <div v-for="player in currentRoomState.players" :key="'res_'+player.userId" class="player-result">
            <h4>{{player.username}} {{ player.userId === authStore.user?.userId ? '(你)' : '' }}</h4>
            <div v-if="player.arrangement && (player.arrangement.front?.length || player.arrangement.middle?.length || player.arrangement.back?.length)">
                <p>头道: <Card v-for="c in player.arrangement.front" :key="c+'f'" :card="c" small /> </p>
                <p>中道: <Card v-for="c in player.arrangement.middle" :key="c+'m'" :card="c" small /> </p>
                <p>尾道: <Card v-for="c in player.arrangement.back" :key="c+'b'" :card="c" small /> </p>
                <p>本局得分: {{ player.scoreThisRound ?? 'N/A' }}</p>
            </div>
            <p v-else-if="currentRoomState.gameInfo?.status === 'comparing'">等待 {{player.username}} 的牌信息...</p>
         </div>
      </div>

      <div class="players-info-section" v-if="currentRoomState.players && currentRoomState.players.length > 0 && (isGameInProgress || isGameFinishedOrComparing)">
        <h4>其他玩家状态:</h4>
        <div v-for="player in currentRoomState.players.filter(p => p.userId !== authStore.user?.userId)" :key="'status_'+player.userId" class="player-status-others">
          <p><strong>{{ player.username }}</strong>:
            <span v-if="isGameInProgress">{{ player.hasSubmittedThisRound ? '已摆牌' : '摆牌中...' }}</span>
          </p>
        </div>
      </div>
    </div>
    <div v-else-if="!isLoadingInitial && !pageError && !currentRoomState" class="info-text">
        <p>无法获取房间信息，或房间已不存在。请尝试返回房间列表。</p>
        <button @click="goBackToRoomList">返回房间列表</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import Card from '../components/Card.vue';

const MAX_PLAYERS_CONST_FE = 4;
const MIN_PLAYERS_TO_START_CONST_FE = 2;

const props = defineProps({
  gameId: { // This prop comes from the URL, e.g., /game/:gameId
    type: String,
    required: true
  }
});

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const isLoadingInitial = ref(true);
const isLoadingState = ref(false); // For poll updates, not currently used to show separate loading indicator
const pageError = ref('');
const currentRoomState = ref(null);
const startGameError = ref('');

const isStartingGame = ref(false);
let pollInterval = null;

// This computed property will always reflect the ID from the URL prop
const initialIdDisplay = computed(() => props.gameId);

// This ref will store the *actual* game_id once a game is started and confirmed by the backend.
// It's used for subsequent API calls for an active game.
const activeGameIdInternal = ref(null);

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
  if (isInitialLoad) isLoadingInitial.value = true;
  // Determine which ID to use for fetching:
  // If activeGameIdInternal is set (meaning a game started and we got its ID), use it.
  // Otherwise, use props.gameId (which is the ID from the URL, initially the roomId).
  const idToFetch = activeGameIdInternal.value || props.gameId;
  console.log(`[GameView] fetchRoomOrGameState called. ID to fetch: ${idToFetch}, isInitialLoad: ${isInitialLoad}, current prop gameId: ${props.gameId}, activeGameIdInternal: ${activeGameIdInternal.value}`);

  if (!idToFetch) {
    pageError.value = "无效的房间或游戏ID参数。";
    isLoadingInitial.value = false;
    console.error("[GameView] fetchRoomOrGameState: No ID to fetch (idToFetch is null/undefined).");
    return;
  }

  try {
    const response = await api.getGameState(idToFetch);
    console.log("[GameView] api.getGameState response data:", JSON.parse(JSON.stringify(response.data)));
    currentRoomState.value = response.data;

    // If the fetched state contains an active game ID and status is not 'waiting',
    // ensure our internal activeGameIdInternal is synced.
    if (currentRoomState.value?.gameInfo?.id && currentRoomState.value?.gameInfo?.status !== 'waiting') {
      const newActiveGameId = currentRoomState.value.gameInfo.id.toString();
      if (activeGameIdInternal.value !== newActiveGameId) {
        activeGameIdInternal.value = newActiveGameId;
        console.log("[GameView] Synced activeGameIdInternal from fetched state to:", activeGameIdInternal.value);
        // If the URL's ID (props.gameId) doesn't match this new active game ID,
        // it means we should update the URL to reflect the true game ID.
        // This typically happens after starting a game where roomId transitions to gameId.
        if (props.gameId !== newActiveGameId) {
            console.log(`[GameView] URL gameId (${props.gameId}) differs from active gameId (${newActiveGameId}). Replacing route.`);
            // Use nextTick to ensure any current rendering cycle finishes before route change
            nextTick(async () => {
                try {
                    await router.replace({ name: 'Game', params: { gameId: newActiveGameId } });
                    console.log(`[GameView] Route replaced to /game/${newActiveGameId} due to game state update.`);
                } catch (navError) {
                    console.error("[GameView] Error during route.replace in fetchRoomOrGameState:", navError);
                }
            });
        }
      }
    } else if (currentRoomState.value?.gameInfo?.status === 'waiting' && activeGameIdInternal.value) {
      // If game was active but now state is 'waiting' (e.g. game ended and unlinked), clear activeGameIdInternal
      // Or if we are polling with a roomId and it's still waiting.
      // This scenario needs careful handling based on game flow.
      // For now, if status is waiting, we ensure activeGameIdInternal is null to reflect no active game instance.
      // activeGameIdInternal.value = null;
      // console.log("[GameView] Game status is 'waiting', activeGameIdInternal cleared (or was already null).");
    }


    const currentUserData = currentRoomState.value?.players?.find(p => p.userId === authStore.user?.userId);
    if (currentUserData?.hand && currentRoomState.value?.gameInfo?.status === 'arranging' && !currentUserData?.hasSubmittedThisRound) {
        myHandDisplay.value = currentUserData.hand;
    }

    pageError.value = '';
  } catch (err) {
    console.error("[GameView] 获取房间/游戏状态失败:", err.response || err);
    pageError.value = err.response?.data?.error || err.message || '无法加载房间/游戏状态。';
    if (err.response?.status === 404 && pollInterval) {
        stopPolling();
    }
  } finally {
    if (isInitialLoad) isLoadingInitial.value = false;
  }
};

const stopPolling = () => {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
};

const isCurrentUserCreator = computed(() => {
  if (!currentRoomState.value || !authStore.user) return false;
  return currentRoomState.value.gameInfo?.creator_id === authStore.user.userId;
});

const translatedGameStatus = computed(() => { /* ... (保持不变) ... */
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
const statusClass = computed(() => `status-${currentRoomState.value?.gameInfo?.status?.toLowerCase() || 'unknown'}`);

const isGameWaitingToStart = computed(() => currentRoomState.value && currentRoomState.value.gameInfo?.status === 'waiting');
const isGameInProgress = computed(() => {
  const status = currentRoomState.value?.gameInfo?.status;
  return status === 'dealing' || status === 'arranging';
});
const isGameFinishedOrComparing = computed(() => {
  const status = currentRoomState.value?.gameInfo?.status;
  return status === 'comparing' || status === 'finished';
});

const handleStartGame = async () => {
  if (!isCurrentUserCreator.value) return;
  isStartingGame.value = true;
  startGameError.value = '';
  const roomIdToStart = props.gameId; // When "Start Game" is clicked, props.gameId is the roomId
  console.log(`[GameView] handleStartGame: Attempting to start game for roomId: ${roomIdToStart}`);
  try {
    const response = await api.startGame(roomIdToStart);
    console.log("[GameView] api.startGame response data:", JSON.parse(JSON.stringify(response.data)));
    if (response.data && response.data.game_id) {
      const newActualGameId = response.data.game_id.toString();
      console.log("[GameView] Game started successfully by backend. New actual Game ID:", newActualGameId);

      // Update internal activeGameId. This is crucial.
      activeGameIdInternal.value = newActualGameId;

      // IMPORTANT: Update the browser URL to reflect the new actual gameId
      if (props.gameId !== newActualGameId) {
        console.log(`[GameView] handleStartGame: Replacing route from /game/${props.gameId} to /game/${newActualGameId}`);
        // Use nextTick to ensure reactivity updates from setting activeGameIdInternal propagate
        // before the route change, though router.replace itself might trigger necessary updates.
        await nextTick();
        try {
            await router.replace({ name: 'Game', params: { gameId: newActualGameId } });
            console.log("[GameView] handleStartGame: Route replaced successfully with new gameId.");
            // After route replacement, props.gameId will update.
            // The watcher for props.gameId should then trigger a fresh fetchRoomOrGameState.
            // No need to call fetchRoomOrGameState manually here if watcher is set up correctly.
        } catch (navigationError) {
            console.error("[GameView] handleStartGame: Error during router.replace for new gameId:", navigationError);
            startGameError.value = "游戏已开始，但更新界面链接失败: " + navigationError.message;
            // Fallback: manually fetch state if route replace has issues or watcher doesn't fire as expected
            await fetchRoomOrGameState(true);
        }
      } else {
        // props.gameId already matches newActualGameId (less likely scenario after starting with roomId)
        // Just fetch the new state
        console.log("[GameView] handleStartGame: props.gameId already matches new gameId. Fetching state.");
        await fetchRoomOrGameState(true);
      }
    } else {
      startGameError.value = response.data?.error || "开始游戏失败，后端未返回有效的游戏信息。";
      console.error("[GameView] Start game failed, problematic response from backend:", response.data);
    }
  } catch (err) {
    console.error("[GameView] Start game API error:", err.response || err);
    startGameError.value = err.response?.data?.error || err.message || '开始游戏请求失败。';
  } finally {
    isStartingGame.value = false;
  }
};

// --- 摆牌逻辑 --- (保持之前的版本)
const selectCardForArrangement = (card) => { /* ... */
    if (!myHandDisplay.value.includes(card)) return;
    if (arrangedFront.value.includes(card) || arrangedMiddle.value.includes(card) || arrangedBack.value.includes(card)) {
        [arrangedFront, arrangedMiddle, arrangedBack].forEach(pile => {
            const index = pile.value.indexOf(card);
            if (index > -1) pile.value.splice(index, 1);
        });
        if (!selectedForArrangement.value.includes(card)) selectedForArrangement.value.push(card);
        return;
    }
    const indexInSelection = selectedForArrangement.value.indexOf(card);
    if (indexInSelection > -1) selectedForArrangement.value.splice(indexInSelection, 1);
    else selectedForArrangement.value.push(card);
};
const isCardSelectedForArrangement = (card) => selectedForArrangement.value.includes(card);
const assignToPile = (pileName) => { /* ... */
    if (selectedForArrangement.value.length === 0) { arrangementError.value = "请先选择牌。"; return; }
    arrangementError.value = ''; let targetPileRef; let maxSize;
    if (pileName === 'front') { targetPileRef = arrangedFront; maxSize = 3; }
    else if (pileName === 'middle') { targetPileRef = arrangedMiddle; maxSize = 5; }
    else if (pileName === 'back') { targetPileRef = arrangedBack; maxSize = 5; }
    else return;
    const cardsAlreadyInAnyPile = new Set([...arrangedFront.value, ...arrangedMiddle.value, ...arrangedBack.value]);
    const validSelectedCards = selectedForArrangement.value.filter(c => !cardsAlreadyInAnyPile.has(c) && !targetPileRef.value.includes(c));
    for (const card of validSelectedCards) {
        if (targetPileRef.value.length < maxSize) targetPileRef.value.push(card);
        else { arrangementError.value = `此墩已满 (${maxSize}张)。`; break; }
    }
    selectedForArrangement.value = selectedForArrangement.value.filter(c => !targetPileRef.value.includes(c));
};
const clearArrangement = () => { /* ... */
    arrangedFront.value = []; arrangedMiddle.value = []; arrangedBack.value = [];
    selectedForArrangement.value = []; arrangementError.value = '';
};
const canSubmitArrangement = computed(() => arrangedFront.value.length===3 && arrangedMiddle.value.length===5 && arrangedBack.value.length===5);
const hasSubmittedArrangement = computed(() => { /* ... */
    if(!currentRoomState.value || !currentRoomState.value.players || !authStore.user) return false;
    const me = currentRoomState.value.players.find(p => p.userId === authStore.user.userId);
    return me?.hasSubmittedThisRound || false;
});
const submitArrangement = async () => { /* ... (使用 activeGameIdInternal.value || props.gameId) ... */
    if (!canSubmitArrangement.value) { arrangementError.value = "墩牌数量不正确！"; return; }
    isSubmittingArrangement.value = true; arrangementError.value = '';
    const gameIdForSubmit = activeGameIdInternal.value || props.gameId;
    try {
        const payload = { front: arrangedFront.value, middle: arrangedMiddle.value, back: arrangedBack.value };
        await api.submitArrangement(gameIdForSubmit, payload);
        await fetchRoomOrGameState();
    } catch (err) { arrangementError.value = err.response?.data?.error || err.message || "提交牌型失败。";
    } finally { isSubmittingArrangement.value = false; }
};
// --- 结束摆牌逻辑 ---

onMounted(async () => {
  console.log(`[GameView] onMounted: Initial props.gameId = ${props.gameId}`);
  isLoadingInitial.value = true;
  pageError.value = '';
  activeGameIdInternal.value = null; // Reset on mount, fetch will determine
  myHandDisplay.value = [];
  clearArrangement();

  await authStore.checkAuthStatus();
  console.log(`[GameView] onMounted: Auth status checked. Logged in: ${authStore.isLoggedIn}, User:`, authStore.user?.username);

  if (!authStore.isLoggedIn || !authStore.user) {
    console.warn("[GameView] onMounted: User not logged in. Redirecting to Login.");
    router.push({ name: 'Login', query: { redirect: route.fullPath } });
    isLoadingInitial.value = false;
    return;
  }

  console.log("[GameView] onMounted: Attempting initial fetchRoomOrGameState.");
  await fetchRoomOrGameState(true); // Initial load
  console.log("[GameView] onMounted: Initial fetch completed. Current state snapshot:", JSON.parse(JSON.stringify(currentRoomState.value)));

  if (pollInterval) clearInterval(pollInterval); // Clear existing before setting new
  if (currentRoomState.value?.gameInfo?.status !== 'finished' && !pageError.value) { // Only poll if game not finished and no page error
    pollInterval = setInterval(fetchRoomOrGameState, 5000);
    console.log("[GameView] onMounted: Polling started.");
  } else {
    console.log("[GameView] onMounted: Polling not started (game finished or page error).");
  }
});

onUnmounted(() => {
  stopPolling();
  console.log("[GameView] onUnmounted: Component unmounted, polling stopped.");
});

// Watch for props.gameId changes (e.g., after router.replace or direct navigation)
watch(() => props.gameId, async (newId, oldId) => {
  console.log(`[GameView] WATCHER for props.gameId: Changed from '${oldId}' to '${newId}'`);
  // Only react if it's a genuine change and newId is valid
  if (newId && newId !== oldId) {
    console.log("[GameView] WATCHER: Game ID prop truly changed. Resetting and re-fetching...");
    isLoadingInitial.value = true;
    pageError.value = '';
    currentRoomState.value = null;
    activeGameIdInternal.value = null; // Reset, let fetch determine active game for newId
    myHandDisplay.value = [];
    clearArrangement();
    stopPolling();

    await fetchRoomOrGameState(true); // Fetch with new props.gameId as initial load for this "new" view context
    
    if (!pageError.value && currentRoomState.value?.gameInfo?.status !== 'finished') {
      if (pollInterval) clearInterval(pollInterval);
      pollInterval = setInterval(fetchRoomOrGameState, 5000);
      console.log("[GameView] WATCHER: Polling restarted for new props.gameId:", newId);
    } else {
      console.log("[GameView] WATCHER: Polling not (re)started for new props.gameId (page error or game finished).");
    }
  } else if (newId && newId === oldId) {
      console.log("[GameView] WATCHER: props.gameId triggered watch but value is same. Likely internal reactivity. Ignoring deep re-fetch unless necessary.");
  }
}, { immediate: false }); // `immediate: false` is fine as onMounted handles initial load.

const goBackToRoomList = () => {
    router.push({ name: 'RoomList' });
};

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
.card.selected { border: 2px solid blue; box-shadow: 0 0 5px blue; }
.selected-cards-info { margin-bottom: 10px; font-style: italic; color: #555; }
.arrangement-piles div { margin-bottom: 10px; display: flex; align-items: center; }
.arrangement-piles div button { margin-left: auto; }
.pile-cards { font-weight: bold; margin-left: 8px; min-width: 150px; }

.status-waiting { color: #ffc107; font-weight: bold; }
.status-arranging { color: #17a2b8; font-weight: bold; }
.status-dealing { color: #17a2b8; font-weight: bold; } /* Add if you use 'dealing' */
.status-comparing { color: #fd7e14; font-weight: bold; }
.status-finished { color: #28a745; font-weight: bold; }
.status-unknown { color: #6c757d; }

.player-result, .player-status-others { border: 1px solid #eee; padding: 10px; margin-bottom: 10px; border-radius: 4px;}
.waiting-lobby, .game-in-progress, .game-results {
    padding: 15px; margin-top:15px; border: 1px solid #eee; border-radius: 5px;
}
</style>
