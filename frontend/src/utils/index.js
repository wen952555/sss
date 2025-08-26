export * from './autoSorter.js';
export * from './cardUtils.js';
export * from './eightCardAutoSorter.js';
export * from './eightCardScorer.js';
export * from './offlineGameLogic.js';
export * from './pokerEvaluator.js';
export * from './sssScorer.js';

export const areCardsEqual = (cardA, cardB) => {
  if (!cardA || !cardB) return false;
  // In trial mode, cards are strings. In online mode, they are objects.
  if (typeof cardA === 'string' || typeof cardB === 'string') {
    // This is a fallback, ideally cards are always objects in the component state
    return cardA === cardB;
  }
  return cardA.rank === cardB.rank && cardA.suit === cardB.suit;
};
