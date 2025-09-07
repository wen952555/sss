import { getSmartSortedHand } from './frontend/src/utils/autoSorter.js';
import { getAreaType } from './frontend/src/utils/sssScorer.js';
import { parseCard } from './frontend/src/utils/pokerEvaluator.js';

function run() {
    // This hand can form a three-of-a-kind of Aces.
    // The new logic should prioritize putting this in the top lane.
    const sampleHand = [
        'ace_of_spades', 'ace_of_hearts', 'ace_of_clubs',
        'king_of_spades', 'king_of_hearts',
        '5_of_spades', '6_of_hearts', 'jack_of_diamonds', '10_of_clubs',
        '9_of_diamonds', '8_of_clubs', '7_of_diamonds', '2_of_clubs',
    ].map(parseCard);

    console.log("Original Hand:", sampleHand.map(c => `${c.rank}_of_${c.suit}`).join(', '));

    const sortedHand = getSmartSortedHand(sampleHand);

    if (sortedHand) {
        console.log("\n--- Smart Sorted Hand ---");
        const top = sortedHand.top.map(c => `${c.rank}_of_${c.suit}`);
        const middle = sortedHand.middle.map(c => `${c.rank}_of_${c.suit}`);
        const bottom = sortedHand.bottom.map(c => `${c.rank}_of_${c.suit}`);

        console.log("Top Lane:", top.join(', '));
        console.log("Middle Lane:", middle.join(', '));
        console.log("Bottom Lane:", bottom.join(', '));

        const topType = getAreaType(top, 'head');
        const middleType = getAreaType(middle, 'middle');
        const bottomType = getAreaType(bottom, 'tail');

        console.log("\n--- Hand Types ---");
        console.log("Top:", topType);
        console.log("Middle:", middleType);
        console.log("Bottom:", bottomType);

        // Assertions
        if (topType === '三条') {
            console.log("Assertion passed: Top lane is three of a kind.");
        } else {
            console.error(`Assertion failed: Expected top lane to be three of a kind, but got ${topType}`);
        }

    } else {
        console.log("Could not sort hand.");
    }
}

run();
