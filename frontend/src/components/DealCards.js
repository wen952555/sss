export const getShuffledDeck = () => {
  const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king', 'ace'];
  const suits = ['spades', 'hearts', 'clubs', 'diamonds'];
  const deck = [];
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push(`${rank}_of_${suit}`);
    }
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
};

export const dealHands = (deck) => {
  const hands = [[], [], [], []];
  for (let i = 0; i < 13; i++) {
    for (let j = 0; j < 4; j++) {
      hands[j].push(deck[i * 4 + j]);
    }
  }
  return hands;
};
