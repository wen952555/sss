<template>
  <div class="player-hand-organizer">
    <h4>我的手牌 (点击选择，再点击目标墩位放置)</h4>
    <div v-if="selectedCard" class="selected-card-indicator">
      已选择: <Card :card="selectedCard" /> (点击下方墩位放置)
    </div>
    <div class="my-hand-area hand-row">
      <Card
        v-for="(card, index) in gameStore.myHand"
        :key="card.id"
        :card="card"
        :selected="selectedCard && selectedCard.id === card.id"
        @click="selectCardFromMyHand(card, index)"
      />
      <div v-if="gameStore.myHand.length === 0" class="empty-pile">手牌区</div>
    </div>

    <h4>摆牌区</h4>
    <div class="arranged-piles">
      <div class="pile front-pile" @click="placeSelectedCard('front')">
        <p>头墩 (3张) - {{ gameStore.arrangedHand.front.length }}/3</p>
        <div class="hand-row">
          <Card
            v-for="(card, index) in gameStore.arrangedHand.front"
            :key="card.id"
            :card="card"
            :selected="selectedCard && selectedCard.id === card.id"
            @click="selectCardFromPile('front', card, index)"
          />
        </div>
      </div>
      <div class="pile middle-pile" @click="placeSelectedCard('middle')">
        <p>中墩 (5张) - {{ gameStore.arrangedHand.middle.length }}/5</p>
        <div class="hand-row">
          <Card
            v-for="(card, index) in gameStore.arrangedHand.middle"
            :key="card.id"
            :card="card"
            :selected="selectedCard && selectedCard.id === card.id"
            @click="selectCardFromPile('middle', card, index)"
          />
        </div>
      </div>
      <div class="pile back-pile" @click="placeSelectedCard('back')">
        <p>尾墩 (5张) - {{ gameStore.arrangedHand.back.length }}/5</p>
        <div class="hand-row">
          <Card
            v-for="(card, index) in gameStore.arrangedHand.back"
            :key="card.id"
            :card="card"
            :selected="selectedCard && selectedCard.id === card.id"
            @click="selectCardFromPile('back', card, index)"
          />
        </div>
      </div>
    </div>
    <button @click="gameStore.submitArrangedHand()" :disabled="!canSubmit" class="submit-button">
      提交牌型
    </button>
    <p v-if="gameStore.error" class="error-message">{{ gameStore.error }}</p>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useGameStore } from '../store/game';
import Card from './Card.vue';

const gameStore = useGameStore();
const selectedCard = ref(null);
const selectedCardOrigin = ref(null); // {pileName: 'myHand'/'front'..., index: number}

function selectCardFromMyHand(card, index) {
  if (selectedCard.value && selectedCard.value.id === card.id) {
    selectedCard.value = null; // 取消选择
    selectedCardOrigin.value = null;
  } else {
    selectedCard.value = card;
    selectedCardOrigin.value = { pileName: 'myHand', index: index };
  }
}

function selectCardFromPile(pileName, card, index) {
  if (selectedCard.value && selectedCard.value.id === card.id) {
    selectedCard.value = null; // 取消选择
    selectedCardOrigin.value = null;
  } else {
    selectedCard.value = card;
    selectedCardOrigin.value = { pileName: pileName, index: index };
  }
}

function placeSelectedCard(targetPileName) {
  if (selectedCard.value && selectedCardOrigin.value) {
    gameStore.moveCard(
      selectedCard.value,
      selectedCardOrigin.value.pileName,
      targetPileName,
      selectedCardOrigin.value.index
    );
    selectedCard.value = null;
    selectedCardOrigin.value = null;
  } else if (selectedCard.value === null) {
    // 如果没有选中的牌，并且目标牌堆有牌，则把目标牌堆的最后一张移回 myHand
    const sourcePile = gameStore.arrangedHand[targetPileName];
    if (sourcePile && sourcePile.length > 0) {
        const cardToMove = sourcePile[sourcePile.length -1]; // 取最后一张
        gameStore.moveCard(cardToMove, targetPileName, 'myHand', sourcePile.length -1);
    }
  }
}

const canSubmit = computed(() => {
  return gameStore.canSubmitHand &&
         gameStore.arrangedHand.front.length === 3 &&
         gameStore.arrangedHand.middle.length === 5 &&
         gameStore.arrangedHand.back.length === 5 &&
         gameStore.myHand.length === 0;
});

</script>

<style scoped>
.player-hand-organizer {
  padding: 15px;
  border: 1px solid #eee;
  margin-bottom: 20px;
  background-color: #f9f9f9;
}
.selected-card-indicator {
  margin-bottom: 10px;
  padding: 5px;
  background-color: #e0e0ff;
  border-radius: 4px;
  display: flex;
  align-items: center;
}
.selected-card-indicator .card {
    margin-left: 10px;
}
.my-hand-area, .hand-row {
  display: flex;
  flex-wrap: wrap;
  min-height: 110px; /* 至少一张牌的高度 */
  border: 1px dashed #ccc;
  padding: 5px;
  margin-bottom: 10px;
}
.empty-pile {
    color: #aaa;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
}
.arranged-piles {
  display: flex;
  justify-content: space-around;
  margin-bottom: 15px;
}
.pile {
  border: 1px solid #ddd;
  padding: 10px;
  min-width: 200px; /* 根据牌数量调整 */
  background-color: #fff;
  border-radius: 5px;
  cursor: pointer; /* 提示可以点击放置 */
}
.pile p {
  margin-top: 0;
  font-weight: bold;
  color: #555;
}
.submit-button {
  padding: 10px 20px;
  font-size: 16px;
  background-color: #28a745;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}
.submit-button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}
.error-message {
  color: red;
  margin-top: 10px;
}
</style>
