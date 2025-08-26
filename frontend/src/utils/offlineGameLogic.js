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
 * @param {Array<string>} playerEightCards - The player's 8-card hand.
 * @param {Array<Array<string>>} aiHands - An array of AI 8-card hands.
 * @returns {Object} A result object.
 */
export const calculateEightCardTrialResult = (playerEightCards, aiHands) => {
  const playerBestHand = getBest5From8(playerEightCards);
  const aiBestHands = aiHands.map(getBest5From8);
  let totalScore = 0;
  const hand_type_score_map = { '高牌': 1, '对子': 2, '两对': 3, '三条': 4, '顺子': 5, '同花': 6, '葫芦': 7, '铁支': 8, '同花顺': 10 };

  aiBestHands.forEach(aiHand => {
    const comparison = compareHands(playerBestHand, aiHand);
    if (comparison > 0) {
      totalScore += hand_type_score_map[playerBestHand.name] || 1;
    } else if (comparison < 0) {
      totalScore -= hand_type_score_map[aiHand.name] || 1;
    }
  });

  return {
    playerScore: totalScore,
  };
};


// 3. --- Game Logic for 13-Card Game (SSS) ---

export const dealOfflineThirteenGame = (playerCount = 4) => {
  const deck = shuffleDeck(createDeck());
  if (playerCount * 13 > 52) throw new Error("Not enough cards for this many players");

  const hands = Array(playerCount).fill(0).map(() => []);

  for (let i = 0; i < 13; i++) {
    for (let j = 0; j < playerCount; j++) {
      hands[j].push(deck.pop());
    }
  }

  return {
    playerHand: hands[0],
    aiHands: hands.slice(1),
  };
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

export const calculateThirteenTrialResult = (playerHand, aiHands) => {
    const playerIsFoul = isSssFoul(playerHand);
    let totalScore = 0;

    aiHands.forEach(aiHand => {
        const aiIsFoul = isSssFoul(aiHand);
        let pairScore = 0;

        if (playerIsFoul && !aiIsFoul) {
            pairScore = -3; // Auto-lose 3 points
        } else if (!playerIsFoul && aiIsFoul) {
            pairScore = 3; // Auto-win 3 points
        } else if (!playerIsFoul && !aiIsFoul) {
            const topComparison = compareSssLanes(playerHand.top, aiHand.top);
            if (topComparison > 0) pairScore++;
            if (topComparison < 0) pairScore--;

            const middleComparison = compareSssLanes(playerHand.middle, aiHand.middle);
            if (middleComparison > 0) pairScore++;
            if (middleComparison < 0) pairScore--;

            const bottomComparison = compareSssLanes(playerHand.bottom, aiHand.bottom);
            if (bottomComparison > 0) pairScore++;
            if (bottomComparison < 0) pairScore--;
        }
        totalScore += pairScore;
    });

    return { playerScore: totalScore };
};
