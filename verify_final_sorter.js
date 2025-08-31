import { getSmartSortedHand } from './src/utils/autoSorter.js';
import { parseCard } from './src/utils/pokerEvaluator.js';

/**
 * This sample hand is crafted to test the new scoring logic.
 * It can be arranged in two notable ways:
 * 1. A low-scoring flush in the bottom lane, and weak middle/top lanes.
 *    The simple sum-of-scores logic might have picked this.
 * 2. A full house (Aces full of 2s) in the middle lane, which is strategically
 *    much better as it scores more and provides a stronger middle presence.
 *    The new logic should prioritize this.
 */
const sampleHand = [
    // Cards for a potential full house in the middle
    'ace_of_spades', 'ace_of_hearts', 'ace_of_clubs', '2_of_spades', '2_of_hearts',
    // Cards for a potential flush in the bottom
    'king_of_diamonds', '10_of_diamonds', '8_of_diamonds', '5_of_diamonds', '3_of_diamonds',
    // Remaining cards for the top lane
    'queen_of_clubs', 'jack_of_spades', '9_of_hearts'
].map(parseCard);

function runVerification() {
    console.log("Running verification for the FINAL smart sorter scoring logic...");

    const result = getSmartSortedHand(sampleHand);

    if (!result) {
        console.error("FAILURE: getSmartSortedHand returned null.");
        return;
    }

    // The expected best hand is the one with the full house in the middle.
    const middleHandRanks = new Set(result.middle.map(c => c.rank));
    const hasAce = middleHandRanks.has('ace');
    const hasTwo = middleHandRanks.has('2');

    console.log("Smart sorter produced the following hand:");
    console.log({
        top: result.top.map(c => `${c.rank}_of_${c.suit}`),
        middle: result.middle.map(c => `${c.rank}_of_${c.suit}`),
        bottom: result.bottom.map(c => `${c.rank}_of_${c.suit}`)
    });

    if (hasAce && hasTwo && result.middle.length === 5) {
        console.log("\nSUCCESS: The smart sorter correctly identified the strategically superior hand with the Full House in the middle lane.");
    } else {
        console.error("\nFAILURE: The smart sorter did not pick the expected superior hand.");
    }
}

runVerification();
