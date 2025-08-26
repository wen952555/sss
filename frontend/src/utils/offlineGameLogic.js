import { compareHands, combinations, parseCard, evaluateHand, HAND_TYPES } from './pokerEvaluator';
import { getSmartSortedHand } from './autoSorter';

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

export const dealOfflineEightCardGame = (playerCount = 6) => {
  const deck = shuffleDeck(createDeck());
  if (playerCount * 8 > 52) throw new Error("Not enough cards for this many players");

  const hands = Array(playerCount).fill(0).map(() => []);

  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < playerCount; j++) {
      hands[j].push(deck.pop());
    }
  }

  return {
    playerHand: hands[0],
    aiHands: hands.slice(1),
  };
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
 * @param {Array<string>} playerEightCards - The player's 8 cards.
 * @param {Object} playerHand - Player's hand {top, middle}.
 * @param {Array<Object>} aiHands - Array of AI hands {top, middle}.
 * @returns {Object} A result object.
 */
export const calculateEightCardTrialResult = (playerHand, aiHands) => {
  const playerHandObj = {
      top: playerHand.top.map(parseCard),
      middle: playerHand.middle.map(parseCard),
  };
  const aiHandObjs = aiHands.map(h => ({
      top: h.top.map(parseCard),
      middle: h.middle.map(parseCard),
  }));

  const isPlayerFoul = compareSssLanes(playerHandObj.top, playerHandObj.middle) > 0;

  let totalScore = 0;

  aiHandObjs.forEach(aiHand => {
      const isAiFoul = compareSssLanes(aiHand.top, aiHand.middle) > 0;
      if (isPlayerFoul && !isAiFoul) {
          totalScore -= 2; // Lose 1 point for each lane
          return;
      }
      if (!isPlayerFoul && isAiFoul) {
          totalScore += 2; // Win 1 point for each lane
          return;
      }
      if (isPlayerFoul && isAiFoul) {
          return; // Tie
      }

      // Compare lanes
      if (compareSssLanes(playerHandObj.top, aiHand.top) > 0) totalScore++;
      if (compareSssLanes(playerHandObj.top, aiHand.top) < 0) totalScore--;
      if (compareSssLanes(playerHandObj.middle, aiHand.middle) > 0) totalScore++;
      if (compareSssLanes(playerHandObj.middle, aiHand.middle) < 0) totalScore--;
  });

  return {
    playerScore: totalScore,
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


// 3. --- Game Logic for 13-Card Game (SSS) ---

export const dealOfflineThirteenGame = () => {
  const deck = shuffleDeck(createDeck());
  const playerHand = [];
  const aiHand = [];
  for (let i = 0; i < 13; i++) {
    playerHand.push(deck.pop());
    aiHand.push(deck.pop());
  }
  return { playerHand, aiHand };
};

export const getAiThirteenHand = (thirteenCards) => {
  const cardObjects = thirteenCards.map(parseCard);
  const sortedHand = getSmartSortedHand(cardObjects);
  // Convert back to string arrays for consistency
  if (sortedHand) {
    return {
      top: sortedHand.top.map(c => `${c.rank}_of_${c.suit}`),
      middle: sortedHand.middle.map(c => `${c.rank}_of_${c.suit}`),
      bottom: sortedHand.bottom.map(c => `${c.rank}_of_${c.suit}`),
    };
  }
  return null; // Should not happen in a standard game
};

// --- SSS Scoring Logic (ported from scorer.php) ---

const SSS_HAND_RANKS = { "高牌": 1, "对子": 2, "两对": 3, "三条": 4, "顺子": 5, "同花": 6, "葫芦": 7, "铁支": 8, "同花顺": 9 };

function getSssLaneType(cards) {
    if (!cards || cards.length === 0) return "高牌";
    const cardObjects = cards.map(parseCard);
    if (cards.length === 3) {
        const hand = evaluateHand(cardObjects);
        if (hand.rank === HAND_TYPES.THREE_OF_A_KIND.rank) return "三条";
        if (hand.rank === HAND_TYPES.PAIR.rank) return "对子";
        return "高牌";
    }
    // For 5-card hands, the name is already correct
    return evaluateHand(cardObjects).name;
}

function compareSssLanes(laneA, laneB) {
    const typeA = getSssLaneType(laneA);
    const typeB = getSssLaneType(laneB);
    const rankA = SSS_HAND_RANKS[typeA] || 1;
    const rankB = SSS_HAND_RANKS[typeB] || 1;

    if (rankA !== rankB) return rankA - rankB;

    // If ranks are the same, use the detailed 5-card evaluator
    const handA = evaluateHand(laneA.map(parseCard));
    const handB = evaluateHand(laneB.map(parseCard));
    return compareHands(handA, handB);
}

function isSssFoul(hand) {
    if (compareSssLanes(hand.middle, hand.bottom) > 0) return true;
    if (compareSssLanes(hand.top, hand.middle) > 0) return true;
    return false;
}

export const calculateThirteenTrialResult = (playerHand, aiHand) => {
    const playerIsFoul = isSssFoul(playerHand);
    const aiIsFoul = isSssFoul(aiHand);

    if (playerIsFoul && !aiIsFoul) return { winner: 'ai', reason: '玩家相公' };
    if (!playerIsFoul && aiIsFoul) return { winner: 'player', reason: 'AI相公' };
    if (playerIsFoul && aiIsFoul) return { winner: 'tie', reason: '双方相公' };

    let playerScore = 0;
    const topComparison = compareSssLanes(playerHand.top, aiHand.top);
    const middleComparison = compareSssLanes(playerHand.middle, aiHand.middle);
    const bottomComparison = compareSssLanes(playerHand.bottom, aiHand.bottom);

    if (topComparison > 0) playerScore++;
    if (topComparison < 0) playerScore--;
    if (middleComparison > 0) playerScore++;
    if (middleComparison < 0) playerScore--;
    if (bottomComparison > 0) playerScore++;
    if (bottomComparison < 0) playerScore--;

    let winner = 'tie';
    if (playerScore > 0) winner = 'player';
    if (playerScore < 0) winner = 'ai';

    return { winner, playerScore };
};
