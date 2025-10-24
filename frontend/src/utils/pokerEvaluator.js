
const cardRanks = { 'A': 14, 'K': 13, 'Q': 12, 'J': 11, '10': 10, '9': 9, '8': 8, '7': 7, '6': 6, '5': 5, '4': 4, '3': 3, '2': 2 };

export const parseCard = (cardStr) => {
  if (typeof cardStr !== 'string') return null;
  const parts = cardStr.split('_of_');
  if (parts.length !== 2) return null;
  const [rank, suit] = parts;
  const value = cardRanks[rank];
  if (!value || !['spades', 'hearts', 'diamonds', 'clubs'].includes(suit)) return null;
  return { rank, suit, value };
};

export const evaluateHand = (hand) => {
  if (!hand || hand.length !== 5) return { rank: -1, values: [], name: 'Invalid Hand' };
  const ranks = hand.map(c => c.value).sort((a, b) => b - a);
  const suits = hand.map(c => c.suit);
  const isFlush = suits.every(s => s === suits[0]);
  const rankCounts = ranks.reduce((acc, rank) => ({ ...acc, [rank]: (acc[rank] || 0) + 1 }), {});
  const counts = Object.values(rankCounts).sort((a, b) => b - a);
  const isStraight = ranks[0] - ranks[4] === 4 && new Set(ranks).size === 5;
  const isAceLowStraight = JSON.stringify(ranks) === JSON.stringify([14, 5, 4, 3, 2]);

  if (isStraight && isFlush) return { rank: 8, values: ranks, name: 'Straight Flush' };
  if (counts[0] === 4) return { rank: 7, values: getHandValues(rankCounts), name: 'Four of a Kind' };
  if (counts[0] === 3 && counts[1] === 2) return { rank: 6, values: getHandValues(rankCounts), name: 'Full House' };
  if (isFlush) return { rank: 5, values: ranks, name: 'Flush' };
  if (isStraight) return { rank: 4, values: ranks, name: 'Straight' };
  if (isAceLowStraight) return { rank: 4, values: [5, 4, 3, 2, 1], name: 'Straight' };
  if (counts[0] === 3) return { rank: 3, values: getHandValues(rankCounts), name: 'Three of a Kind' };
  if (counts[0] === 2 && counts[1] === 2) return { rank: 2, values: getHandValues(rankCounts), name: 'Two Pair' };
  if (counts[0] === 2) return { rank: 1, values: getHandValues(rankCounts), name: 'One Pair' };
  return { rank: 0, values: ranks, name: 'High Card' };
};

const getHandValues = (rankCounts) => {
  const sortedRanks = Object.keys(rankCounts).sort((a, b) => rankCounts[b] - rankCounts[a] || b - a);
  return sortedRanks.map(r => parseInt(r, 10));
};

export const compareHands = (hand1, hand2) => {
  if (hand1.rank !== hand2.rank) return hand1.rank - hand2.rank;
  for (let i = 0; i < hand1.values.length; i++) {
    if (hand1.values[i] !== hand2.values[i]) return hand1.values[i] - hand2.values[i];
  }
  return 0;
};