// frontend/src/utils/cardAsset.js

// This function maps the card data from our game logic to the corresponding SVG asset filename.
export function getCardAssetName(card) {
  if (!card || !card.suit || !card.rank) {
    // Return a placeholder or a "back of card" image if the card data is invalid
    return 'back.svg';
  }

  // Handle Jokers first, as they don't have a standard suit/rank
  if (card.rank === 'red_joker') {
    return 'red_joker.svg';
  }
  if (card.rank === 'black_joker') {
    return 'black_joker.svg';
  }

  const rankMap = {
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
    '2': '2',
  };

  const rankName = rankMap[card.rank];
  const suitName = card.suit.toLowerCase(); // 'spades', 'hearts', 'diamonds', 'clubs'

  if (!rankName || !suitName) {
    return 'back.svg'; // Fallback for any unexpected card data
  }

  return `${rankName}_of_${suitName}.svg`;
}