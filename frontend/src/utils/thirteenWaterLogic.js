// src/utils/thirteenWaterLogic.js
import { VALUES_MAP as cardValues, SUITS as cardSuits } from './cardUtils'; // Assuming you have these

// Helper to get numerical value for sorting (A=14, K=13 ...)
function getCardNumericValue(cardId) { // "14s" -> 14
    const valueChar = cardId.slice(0, -1);
    return parseInt(valueChar, 10); // Assuming cardId value part is numeric
}
function getCardSuit(cardId) { // "14s" -> "s"
    return cardId.slice(-1);
}

// Very simple AI: sorts cards and splits them. DOES NOT check for valid hand strengths.
export function 十三水AI简易分牌(thirteenCards) { // array of cardId strings
    if (!thirteenCards || thirteenCards.length !== 13) {
        console.error("AI分牌需要13张牌");
        return { front: [], middle: [], back: [] };
    }

    // Sort cards: primarily by value, then by suit (suit for tie-break, not strategically important here)
    const sortedCards = [...thirteenCards].sort((a, b) => {
        const valA = getCardNumericValue(a);
        const valB = getCardNumericValue(b);
        if (valA !== valB) return valB - valA; // Descending value

        // Optional: sort by suit if values are same (not standard for thirteen water sorting usually)
        // const suitA = getCardSuit(a);
        // const suitB = getCardSuit(b);
        // Define suit order if needed, e.g., s > h > d > c
        return 0;
    });

    // Simplest split:
    // Back: 5 strongest cards
    // Middle: Next 5 cards
    // Front: Weakest 3 cards
    // THIS IS NOT STRATEGICALLY OPTIMAL FOR THIRTEEN WATER
    // A real AI needs to evaluate hand types (pairs, straights, flushes etc.)
    return {
        back: sortedCards.slice(0, 5),
        middle: sortedCards.slice(5, 10),
        front: sortedCards.slice(10, 13),
    };
}

// TODO: Add functions to evaluate hand strength for front, middle, back
// e.g., evaluateHand(cardsArray) -> { type: 'pair', rank: 7, kicker: [...] }
// This is critical for validating arrangements and for a better AI.
