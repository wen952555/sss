<template>
  <div class="game-room">
    <h2>房间号: {{ roomId }}</h2>
    
    <div class="players-container">
      <Player v-for="(player, index) in players" 
              :key="index"
              :player="player"
              :isCurrent="player.id === currentPlayerId"
              @play-cards="handlePlayCards"/>
    </div>

    <div class="hand-cards">
      <Card v-for="(card, index) in myHand" 
            :key="index"
            :card="card"
            @card-selected="toggleCardSelection(card)"/>
    </div>

    <button @click="submitCards" :disabled="selectedCards.length !== 13">出牌</button>
  </div>
</template>

<script>
import Card from './Card.vue';
import Player from './Player.vue';
import { ref, onMounted } from 'vue';
import axios from 'axios';

export default {
  components: { Card, Player },
  setup() {
    const API_BASE = 'https://9525.ip-ddns.com/api';
    const roomId = ref('');
    const players = ref([]);
    const currentPlayerId = ref('');
    const myHand = ref([]);
    const selectedCards = ref([]);

    // 获取游戏状态
    const fetchGameState = async () => {
      try {
        const response = await axios.get(`${API_BASE}/game_state.php`, {
          params: { room_id: roomId.value }
        });
        const data = response.data;
        players.value = data.players;
        currentPlayerId.value = data.current_player;
        myHand.value = data.my_hand;
      } catch (error) {
        console.error('获取游戏状态失败:', error);
      }
    };

    // 切换卡牌选择
    const toggleCardSelection = (card) => {
      const index = selectedCards.value.findIndex(c => 
        c.suit === card.suit && c.value === card.value);
      
      if (index > -1) {
        selectedCards.value.splice(index, 1);
      } else {
        if (selectedCards.value.length < 13) {
          selectedCards.value.push(card);
        }
      }
    };

    // 提交出牌
    const submitCards = async () => {
      try {
        await axios.post(`${API_BASE}/play_cards.php`, {
          room_id: roomId.value,
          cards: selectedCards.value
        });
        selectedCards.value = [];
        fetchGameState();
      } catch (error) {
        console.error('出牌失败:', error);
      }
    };

    onMounted(() => {
      roomId.value = new URLSearchParams(window.location.search).get('room');
      if (roomId.value) {
        setInterval(fetchGameState, 3000); // 每3秒更新状态
      }
    });

    return {
      roomId,
      players,
      currentPlayerId,
      myHand,
      selectedCards,
      toggleCardSelection,
      submitCards
    };
  }
};
</script>
