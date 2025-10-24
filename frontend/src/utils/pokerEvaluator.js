
export const RANKS = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
    'j': 11, 'q': 12, 'k': 13, 'a': 14,
    'J': 11, 'Q': 12, 'K': 13, 'A': 14,
    'jack': 11, 'queen': 12, 'king': 13, 'ace': 14
};

export const parseCard = (cardStr) => {
    if (typeof cardStr !== 'string') return null;

    let parts;
    if (cardStr.includes('_of_')) {
        parts = cardStr.split('_of_');
    } else {
        parts = cardStr.split('_');
    }

    if (parts.length !== 2) return null;

    const [rank, suit] = parts;
    const value = RANKS[rank];
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