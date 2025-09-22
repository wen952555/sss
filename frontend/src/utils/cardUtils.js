import { parseCard } from './pokerEvaluator';

export const areCardsEqual = (card1, card2) =>
  card1 && card2 && card1.rank === card2.rank && card1.suit === card2.suit;

/**
 * Sanitizes a hand object received from the server.
 * Ensures that each lane is an array of valid card objects.
 * @param {object} hand The raw hand object from the server.
 * @returns {object} A sanitized hand object with clean card arrays.
 */
export const sanitizeHand = (hand) => {
  if (!hand) {
    return { top: [], middle: [], bottom: [] };
  }

  const sanitizeLane = (lane) =>
    (lane || [])
      .map(cardStr => (typeof cardStr === 'string' ? parseCard(cardStr) : cardStr))
      .filter(Boolean);

  return {
    top: sanitizeLane(hand.top),
    middle: sanitizeLane(hand.middle),
    bottom: sanitizeLane(hand.bottom),
  };
};
