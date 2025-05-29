<template>
  <div class="card" :class="[{ small: small }, suitColorClass]">
    <img v-if="imageSrc" :src="imageSrc" :alt="altText" class="card-image" @error="handleImageError" />
    <div v-else class="card-fallback">
      <!-- Fallback text if image fails to load or card prop is invalid -->
      <span class="rank-text">{{ displayRankFallback }}</span>
      <span class="suit-text">{{ displaySuitFallback }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';

const props = defineProps({
  card: { // e.g., "AH", "KD", "TC" (T for 10)
    type: String,
    required: true,
    validator: (value) => {
      return /^[2-9TJQKA][CDHS]$/i.test(value) && value.length === 2;
    }
  },
  small: {
    type: Boolean,
    default: false
  }
});

const imageError = ref(false);

const parsedCard = computed(() => {
  if (!props.card || props.card.length !== 2) {
    return { rank: '', suit: '', rankFile: '', suitFile: '' };
  }
  const rankCode = props.card.slice(0, -1).toUpperCase();
  const suitCode = props.card.slice(-1).toUpperCase();
  let rankFile = '';
  let suitFile = '';

  switch (rankCode) {
    case 'A': rankFile = 'ace'; break;
    case 'K': rankFile = 'king'; break;
    case 'Q': rankFile = 'queen'; break;
    case 'J': rankFile = 'jack'; break;
    case 'T': rankFile = '10'; break;
    default: rankFile = rankCode; // For 2-9
  }

  switch (suitCode) {
    case 'S': suitFile = 'spades'; break;
    case 'H': suitFile = 'hearts'; break;
    case 'D': suitFile = 'diamonds'; break;
    case 'C': suitFile = 'clubs'; break;
  }
  return { rank: rankCode, suit: suitCode, rankFile, suitFile };
});

const imageSrc = computed(() => {
  if (imageError.value || !parsedCard.value.rankFile || !parsedCard.value.suitFile) {
    return ''; // Return empty or a placeholder image path if error or invalid card
  }
  // Files in `public` directory are served from the root.
  return `/images/cards/${parsedCard.value.rankFile}_of_${parsedCard.value.suitFile}.svg`;
});

const altText = computed(() => {
  if (!parsedCard.value.rank || !parsedCard.value.suit) return 'Invalid Card';
  const rankNames = { A: 'Ace', K: 'King', Q: 'Queen', J: 'Jack', T: 'Ten', '9':'Nine', '8':'Eight', '7':'Seven', '6':'Six', '5':'Five', '4':'Four', '3':'Three', '2':'Two' };
  const suitNames = { S: 'Spades', H: 'Hearts', D: 'Diamonds', C: 'Clubs' };
  return `${rankNames[parsedCard.value.rank] || parsedCard.value.rank} of ${suitNames[parsedCard.value.suit] || parsedCard.value.suit}`;
});

const suitColorClass = computed(() => {
  if (parsedCard.value.suit === 'H' || parsedCard.value.suit === 'D') {
    return 'red-suit-fallback'; // For fallback text color
  }
  return 'black-suit-fallback'; // For fallback text color
});

// Fallback display values (used if image fails)
const displayRankFallback = computed(() => {
  const r = parsedCard.value.rank;
  if (r === 'T') return '10';
  return r;
});

const displaySuitFallback = computed(() => {
  const s = parsedCard.value.suit;
  if (s === 'H') return '♥';
  if (s === 'D') return '♦';
  if (s === 'C') return '♣';
  if (s === 'S') return '♠';
  return '?';
});

const handleImageError = () => {
  console.warn(`Failed to load image: ${imageSrc.value}`);
  imageError.value = true; // Trigger fallback display
};

</script>

<style scoped>
.card {
  display: inline-block; /* Changed from inline-flex to make img behave better*/
  width: 60px;
  height: 90px;
  border: 1px solid #bbb; /* Lighter border */
  border-radius: 5px;
  background-color: white;
  user-select: none;
  cursor: default; /* Usually cards aren't clickable unless part of interaction */
  box-shadow: 1px 1px 3px rgba(0,0,0,0.1);
  overflow: hidden; /* Ensure image stays within rounded borders */
  position: relative; /* For fallback text positioning */
}
.card.small {
  width: 40px; /* Adjusted for better proportion */
  height: 60px;
  border-radius: 3px;
}

.card-image {
  width: 100%;
  height: 100%;
  object-fit: contain; /* Use 'contain' to ensure whole card is visible, 'cover' might crop */
                           /* If SVGs are designed for exact fit, 'fill' might also work. */
}

.card-fallback {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-family: Arial, sans-serif;
}

.card.small .card-fallback {
  font-size: 0.7em; /* Scale fallback text for small cards */
}

.rank-text {
  font-size: 1.8em;
  font-weight: bold;
}
.card.small .rank-text {
  font-size: 1.6em;
}

.suit-text {
  font-size: 1.5em;
}
.card.small .suit-text {
  font-size: 1.3em;
}

/* Fallback text colors */
.red-suit-fallback .rank-text,
.red-suit-fallback .suit-text {
  color: red;
}
.black-suit-fallback .rank-text,
.black-suit-fallback .suit-text {
  color: black;
}
</style>
