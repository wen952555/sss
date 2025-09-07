export * from './autoSorter.js';
export * from './cardUtils.js';
export * from './eightCardAutoSorter.js';
export * from './eightCardScorer.js';
export * from './pokerEvaluator.js';
export * from './sssScorer.js';

export const areCardsEqual = (cardA, cardB) => {
  if (!cardA || !cardB) return false;
  return cardA.rank === cardB.rank && cardA.suit === cardB.suit;
};
