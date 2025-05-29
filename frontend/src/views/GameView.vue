<template>
  <div class="game-view">
    <h2>游戏桌 - {{ gameId }}</h2>
    <div v-if="isLoading">加载游戏状态...</div>
    <div v-if="error" class="error">{{ error }}</div>

    <div v-if="gameState">
      <p>游戏状态: {{ gameState.gameInfo?.game_status }}</p>
      <p>当前回合: {{ gameState.gameInfo?.current_round }}</p>

      <!-- Player's Hand -->
      <div v-if="myHand && !hasSubmittedArrangement" class="my-hand-section">
        <h3>我的手牌:</h3>
        <div class="cards-display">
          <Card v-for="card in myHand" :key="card" :card="card" @click="selectCard(card)"
                :class="{selected: isCardSelectedForArrangement(card)}"/>
        </div>
        <div class="arrangement-form">
          <h4>摆牌区:</h4>
          <div>头道 (3张): <span class="arranged-cards">{{ arrangedFront.join(', ') }}</span></div>
          <div>中道 (5张): <span class="arranged-cards">{{ arrangedMiddle.join(', ') }}</span></div>
          <div>尾道 (5张): <span class="arranged-cards">{{ arrangedBack.join(', ') }}</span></div>
          <button @click="addToFront" :disabled="arrangedFront.length >= 3 || selectedCardsArrangement.length === 0">添加到头道</button>
          <button @click="addToMiddle" :disabled="arrangedMiddle.length >= 5 || selectedCardsArrangement.length === 0">添加到中道</button>
          <button @click="addToBack" :disabled="arrangedBack.length >= 5 || selectedCardsArrangement.length === 0">添加到尾道</button>
          <button @click="clearSelectedCardsArrangement">清空已选</button>
          <button @click="resetArrangement">重置墩牌</button>
          <button @click="submitArrangement"
                  :disabled="arrangedFront.length !== 3 || arrangedMiddle.length !== 5 || arrangedBack.length !== 5 || isSubmitting">
            {{ isSubmitting ? '提交中...' : '提交牌型' }}
          </button>
        </div>
      </div>
      <div v-if="hasSubmittedArrangement && !gameState.allSubmitted">等待其他玩家摆牌...</div>

      <!-- Display all players and their status/hands after game completion or all submitted -->
      <div class="players-info">
        <h3>玩家信息:</h3>
        <div v-for="player in gameState.players" :key="player.userId" class="player-info">
          <p><strong>{{ player.username }}</strong> (ID: {{ player.userId }})
            - {{ player.hasSubmitted ? '已提交' : '等待提交' }}
          </p>
          <div v-if="gameState.allSubmitted && player.arrangement">
            <p>头道: <Card v-for="c in player.arrangement.front" :key="c" :card="c" small /> </p>
            <p>中道: <Card v-for="c in player.arrangement.middle" :key="c" :card="c" small /> </p>
            <p>尾道: <Card v-for="c in player.arrangement.back" :key="c" :card="c" small /> </p>
            <p>得分: {{ player.score }}</p>
          </div>
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
import Card from '../components/Card.vue'; // Create this component

const props = defineProps({
  gameId: {
    type: [String, Number],
    required: true
  }
});

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const gameState = ref(null);
const isLoading = ref(true);
const error = ref('');
const isSubmitting = ref(false);

const myHand = ref([]); // Player's own 13 cards
const arrangedFront = ref([]);
const arrangedMiddle = ref([]);
const arrangedBack = ref([]);
const selectedCardsArrangement = ref([]); // Cards selected by clicking, before assigning to a segment

let pollInterval = null;

const currentUserId = computed(() => authStore.user?.userId);

const hasSubmittedArrangement = computed(() => {
  if (!gameState.value || !currentUserId.value) return false;
  const me = gameState.value.players.find(p => p.userId === currentUserId.value);
  return me ? me.hasSubmitted : false;
});

const fetchGameState = async () => {
  if (!props.gameId) return;
  try {
    const response = await api.getGameState(props.gameId);
    gameState.value = response.data;

    // Update myHand if it's not set yet and player has a hand in gameState
    if (myHand.value.length === 0 && response.data.currentUser?.id) {
        const me = response.data.players.find(p => p.userId === response.data.currentUser.id);
        if (me && me.hand && !me.hasSubmitted) { // Only load hand if not submitted yet from game state
            myHand.value = me.hand;
        }
    }
    isLoading.value = false;
    error.value = '';

    // If all submitted, stop polling or poll less frequently
    if (response.data.allSubmitted && pollInterval) {
        // Potentially clear interval or reduce frequency
        // For now, we keep polling to see comparison results
    }

  } catch (err) {
    console.error("Error fetching game state:", err);
    error.value = err.response?.data?.error || err.message || '无法加载游戏状态。';
    // If game not found or critical error, redirect or stop polling
    if (err.response?.status === 404) {
        clearInterval(pollInterval);
        // router.push('/rooms'); // Example redirect
    }
    isLoading.value = false;
  }
};

// Fetch initial hand for the player (could also be part of gameState)
const fetchMyHand = async () => {
    if (myHand.value.length > 0 || hasSubmittedArrangement.value) return; // Don't fetch if already have hand or submitted
    try {
        const response = await api.getPlayerHand(props.gameId);
        myHand.value = response.data.hand || [];
    } catch (err) {
        console.error("Error fetching player hand:", err);
        // error.value = "无法获取您的手牌。"; // This might overwrite gameState error
    }
};

const selectCard = (card) => {
  if (arrangedFront.value.includes(card) || arrangedMiddle.value.includes(card) || arrangedBack.value.includes(card)) return; // Card already placed

  const index = selectedCardsArrangement.value.indexOf(card);
  if (index > -1) {
    selectedCardsArrangement.value.splice(index, 1);
  } else {
    selectedCardsArrangement.value.push(card);
  }
};

const isCardSelectedForArrangement = (card) => {
  return selectedCardsArrangement.value.includes(card);
};

const clearSelectedCardsArrangement = () => {
  selectedCardsArrangement.value = [];
}

const addToSegment = (segment, maxSize) => {
  if (segment.value.length < maxSize) {
    const cardsToAdd = selectedCardsArrangement.value.slice(0, maxSize - segment.value.length);
    segment.value.push(...cardsToAdd);
    // Remove added cards from myHand (visual cue) or selectedCards
    cardsToAdd.forEach(c => {
        const idx = selectedCardsArrangement.value.indexOf(c);
        if(idx > -1) selectedCardsArrangement.value.splice(idx, 1);
    });
  }
};
const addToFront = () => addToSegment(arrangedFront, 3);
const addToMiddle = () => addToSegment(arrangedMiddle, 5);
const addToBack = () => addToSegment(arrangedBack, 5);

const resetArrangement = () => {
    arrangedFront.value = [];
    arrangedMiddle.value = [];
    arrangedBack.value = [];
    selectedCardsArrangement.value = []; // Clear selections too
    // Potentially re-fetch myHand if it was modified visually
};


const submitArrangement = async () => {
  if (arrangedFront.value.length !== 3 || arrangedMiddle.value.length !== 5 || arrangedBack.value.length !== 5) {
    alert("牌墩数量不正确！头道3张，中道5张，尾道5张。");
    return;
  }
  // Basic check for unique cards in arrangement (more robust validation server-side)
  const allArranged = [...arrangedFront.value, ...arrangedMiddle.value, ...arrangedBack.value];
  if (new Set(allArranged).size !== 13) {
      alert("墩牌中的牌必须是您手牌中不重复的13张牌！");
      return;
  }

  isSubmitting.value = true;
  error.value = '';
  try {
    const arrangementPayload = {
      front: arrangedFront.value,
      middle: arrangedMiddle.value,
      back: arrangedBack.value,
    };
    await api.submitArrangement(props.gameId, arrangementPayload);
    // After successful submission, gameState poll will update 'hasSubmitted'
    // Optionally, clear local arrangement form or show a success message
    alert("牌型已提交！");
    await fetchGameState(); // Fetch state immediately to reflect submission
  } catch (err) {
    console.error("Error submitting arrangement:", err);
    error.value = err.response?.data?.error || err.message || '提交牌型失败。';
  } finally {
    isSubmitting.value = false;
  }
};

onMounted(async () => {
  await authStore.checkAuthStatus(); // Ensure auth is resolved
  if (!currentUserId.value) {
    router.push({name: 'Login', query: { redirect: route.fullPath }});
    return;
  }
  await fetchGameState(); // Initial fetch
  if (!hasSubmittedArrangement.value) { // Only fetch hand if not submitted
      await fetchMyHand();
  }
  pollInterval = setInterval(fetchGameState, 5000); // Poll every 5 seconds
});

onUnmounted(() => {
  if (pollInterval) {
    clearInterval(pollInterval);
  }
});

// Watch for game status changes, e.g., when game is 'finished'
watch(() => gameState.value?.gameInfo?.game_status, (newStatus) => {
    if (newStatus === 'finished' && pollInterval) {
        // Optionally stop polling or poll less frequently once game is truly over
        // clearInterval(pollInterval);
        // alert("游戏结束！");
    }
});

</script>

<style scoped>
.game-view { padding: 1rem; }
.error { color: red; margin-bottom: 1rem; }
.my-hand-section, .players-info { margin-top: 1.5rem; }
.cards-display { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 1rem; }
.card.selected { border: 2px solid blue; } /* Style for selected cards */
.arrangement-form div { margin-bottom: 0.5rem; }
.arrangement-form button { margin-right: 5px; margin-top: 5px; }
.arranged-cards { font-weight: bold; margin-left: 5px; }
.player-info { border: 1px solid #eee; padding: 0.5rem; margin-bottom: 0.5rem; border-radius: 4px;}
.player-info p { margin: 0.2rem 0;}
</style>
