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


// 2. --- Core Game Logic for 8-Card Game (2-3-3 structure) ---

export const calculateEightCardTrialResult = (playerHand, aiHands) => {
    const isPlayerFoul = isSssFoul(playerHand);
    let totalScore = 0;

    aiHands.forEach(aiHand => {
        if (!aiHand) return;
        const isAiFoul = isSssFoul(aiHand);
        let pairScore = 0;

        if (isPlayerFoul && !isAiFoul) {
            pairScore = -3;
        } else if (!isPlayerFoul && isAiFoul) {
            pairScore = 3;
        } else if (!isPlayerFoul && !isAiFoul) {
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
  if (sortedHand) {
    return {
      top: sortedHand.top.map(c => `${c.rank}_of_${c.suit}`),
      middle: sortedHand.middle.map(c => `${c.rank}_of_${c.suit}`),
      bottom: sortedHand.bottom.map(c => `${c.rank}_of_${c.suit}`),
    };
  }
  return null;
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
    return evaluateHand(cardObjects).name;
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
            pairScore = -3;
        } else if (!playerIsFoul && aiIsFoul) {
            pairScore = 3;
        } else if (!isPlayerFoul && !aiIsFoul) {
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
