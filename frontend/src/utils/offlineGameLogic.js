import { compareHands, combinations, parseCard, evaluateHand } from './pokerEvaluator';

const SUITS = ['spades', 'hearts', 'clubs', 'diamonds'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king', 'ace'];

// 1. --- Game Setup ---
export const createDeck = () => {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push(`${rank}_of_${suit}`);
    }
  }
  return deck;
};

export const shuffleDeck = (deck) => {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export const dealOfflineEightCardGame = () => {
  const deck = shuffleDeck(createDeck());
  const playerHand = [];
  const aiHand = [];
  for (let i = 0; i < 8; i++) {
    playerHand.push(deck.pop());
    aiHand.push(deck.pop());
  }
  return { playerHand, aiHand };
};


// 2. --- Core Game Logic for 8-Card Game ---

/**
 * Finds the best possible 5-card poker hand from a given set of 8 cards.
 * This is the crucial rule for the 8-card game.
 * @param {Array<string>} eightCards - An array of 8 card strings (e.g., 'ace_of_spades').
 * @returns {Object} The evaluation object of the best 5-card hand found.
 */
function getBest5From8(eightCards) {
  if (!eightCards || eightCards.length < 5) return null;

  const cardCombinations = combinations(eightCards, 5);
  let bestEval = null;

  for (const fiveCardHand of cardCombinations) {
    const handObjects = fiveCardHand.map(parseCard);
    const currentEval = evaluateHand(handObjects);
    if (!bestEval || compareHands(currentEval, bestEval) > 0) {
      bestEval = currentEval;
    }
  }
  return bestEval;
}

/**
 * Calculates the result of a trial game between a player and an AI.
 * @param {Array<string>} playerEightCards - The player's 8 cards.
 * @param {Array<string>} aiEightCards - The AI's 8 cards.
 * @returns {Object} A result object.
 */
export const calculateTrialResult = (playerEightCards, aiEightCards) => {
  const playerBestHand = getBest5From8(playerEightCards);
  const aiBestHand = getBest5From8(aiEightCards);

  const comparison = compareHands(playerBestHand, aiBestHand);

  let winner = 'tie';
  if (comparison > 0) winner = 'player';
  if (comparison < 0) winner = 'ai';

  return {
    winner,
    playerHand: playerEightCards,
    aiHand: aiEightCards,
    playerResult: {
      name: playerBestHand.name,
      values: playerBestHand.values
    },
    aiResult: {
      name: aiBestHand.name,
      values: aiBestHand.values
    }
  };
};

/**
 * A simple AI for the trial mode. For the 8-card game, the AI doesn't need
 * to "sort" its hand into lanes, so it just presents the cards it was dealt.
 * The "skill" is in the evaluation of the best 5-card hand, which happens at showdown.
 * @param {Array<string>} aiEightCards - The AI's 8 cards.
 * @returns {Array<string>} The same 8 cards.
 */
export const getAiEightCardHand = (aiEightCards) => {
  // In a 1-lane game, there's no complex arrangement logic needed for the AI.
  // We could try to sort them for visual appeal, but it's not necessary for the game logic.
  return aiEightCards;
};
