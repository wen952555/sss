import { compareHands, combinations, parseCard, evaluateHand } from './pokerEvaluator';
import { getSmartSortedHand } from './autoSorter';

// --- Game Setup ---
export const createDeck = () => {
  const deck = [];
  const SUITS = ['spades', 'hearts', 'clubs', 'diamonds'];
  const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king', 'ace'];
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

// --- 8-Card Game Functions ---
export const dealOfflineEightCardGame = (playerCount = 6) => {
  const deck = shuffleDeck(createDeck());
  if (playerCount * 8 > 52) throw new Error("Not enough cards");
  const hands = Array(playerCount).fill(0).map(() => []);
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < playerCount; j++) {
      hands[j].push(deck.pop());
    }
  }
  return { playerHand: hands[0], aiHands: hands.slice(1) };
};

export const calculateEightCardTrialResult = (playerHand, aiHands) => {
    const isPlayerFoul = isSssFoul(playerHand);
    let totalScore = 0;
    aiHands.forEach(aiHand => {
        if (!aiHand) return;
        const isAiFoul = isSssFoul(aiHand);
        let pairScore = 0;
        if (isPlayerFoul && !isAiFoul) pairScore = -3;
        else if (!isPlayerFoul && isAiFoul) pairScore = 3;
        else if (!isPlayerFoul && !isAiFoul) {
            pairScore += compareSssLanes(playerHand.top, aiHand.top);
            pairScore += compareSssLanes(playerHand.middle, aiHand.middle);
            pairScore += compareSssLanes(playerHand.bottom, aiHand.bottom);
        }
        totalScore += pairScore;
    });
    return { playerScore: totalScore };
};

// --- 13-Card Game Functions ---
export const dealOfflineThirteenGame = (playerCount = 4) => {
  const deck = shuffleDeck(createDeck());
  if (playerCount * 13 > 52) throw new Error("Not enough cards");
  const hands = Array(playerCount).fill(0).map(() => []);
  for (let i = 0; i < 13; i++) {
    for (let j = 0; j < playerCount; j++) {
      hands[j].push(deck.pop());
    }
  }
  return { playerHand: hands[0], aiHands: hands.slice(1) };
};

export const getAiThirteenHand = (thirteenCards) => {
  const cardObjects = thirteenCards.map(parseCard);
  return getSmartSortedHand(cardObjects);
};

import { calculateSinglePairScore } from './sssScorer';

export const calculateThirteenTrialResult = (playerHand, aiHands) => {
    let totalScore = 0;
    aiHands.forEach(aiHand => {
        if (aiHand) {
            // sssScorer expects the hand to have properties head, middle, tail.
            const p1 = { head: playerHand.top, middle: playerHand.middle, tail: playerHand.bottom };
            const p2 = { head: aiHand.top, middle: aiHand.middle, tail: aiHand.bottom };
            totalScore += calculateSinglePairScore(p1, p2);
        }
    });
    return { playerScore: totalScore };
};
