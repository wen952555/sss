<template>
  <div class="card" :class="{ 'card-back': isBack }" @click="handleClick">
    <img v-if="!isBack" :src="cardImage" :alt="cardValue" />
    <img v-else src="/img/back.png" alt="Card Back" />
  </div>
</template>

<script>
export default {
  props: {
    card: Object, // { suit: 'hearts', value: '10' }
    isBack: Boolean
  },
  computed: {
    cardImage() {
      if (!this.card) return '';
      const valueMap = {
        'A': 'ace',
        'K': 'king',
        'Q': 'queen',
        'J': 'jack',
        '10': '10',
        '9': '9',
        '8': '8',
        '7': '7',
        '6': '6',
        '5': '5',
        '4': '4',
        '3': '3',
        '2': '2'
      };
      const suitMap = {
        'spades': 'spades',
        'hearts': 'hearts',
        'diamonds': 'diamonds',
        'clubs': 'clubs'
      };
      return `/img/${valueMap[this.card.value]}_of_${suitMap[this.card.suit]}.png`;
    }
  },
  methods: {
    handleClick() {
      this.$emit('card-selected', this.card);
    }
  }
};
</script>

<style scoped>
.card {
  width: 80px;
  height: 120px;
  margin: 5px;
  cursor: pointer;
  transition: transform 0.2s;
}
.card:hover {
  transform: translateY(-10px);
}
.card img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
