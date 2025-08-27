export const parseVerboseCardString = (card) => {
  if (typeof card !== 'string' || !card.includes('_of_')) {
    if (typeof card === 'object' && card.rank && card.suit) return card;
    return null;
  }
  const [rank, , suit] = card.split('_');
  return { rank, suit };
};

export const rankToShort = (rank) => {
  if (rank === '10') return 'T';
  const specialRanks = { 'jack': 'J', 'queen': 'Q', 'king': 'K', 'ace': 'A' };
  return specialRanks[rank] || rank.toUpperCase();
};

export const suitToShort = (suit) => suit.charAt(0);

export const parseShortCardString = (cardStr) => {
  if (typeof cardStr !== 'string' || cardStr.length !== 2) {
    if (typeof cardStr === 'object' && cardStr.rank && cardStr.suit) return cardStr;
    return null;
  }
  const rankMap = { 'T': '10', 'J': 'jack', 'Q': 'queen', 'K': 'king', 'A': 'ace' };
  const suitMap = { 's': 'spades', 'h': 'hearts', 'd': 'diamonds', 'c': 'clubs' };

  const rankShort = cardStr.charAt(0);
  const suitShort = cardStr.charAt(1);

  return {
    rank: rankMap[rankShort] || rankShort,
    suit: suitMap[suitShort]
  };
};
