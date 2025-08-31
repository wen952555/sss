import { getSmartSortedHand } from './src/utils/autoSorter.js';
import { parseCard } from './src/utils/pokerEvaluator.js';

// A sample hand that is known to have multiple valid arrangements
const sampleHand = [
    'ace_of_spades', 'king_of_spades', 'queen_of_spades', 'jack_of_spades', '10_of_spades', // Royal Flush
    '9_of_hearts', '8_of_hearts', '7_of_hearts', // 3-card flush
    '6_of_clubs', '6_of_diamonds', // a pair
    '5_of_clubs', '4_of_diamonds', '3_of_spades'
].map(parseCard);


function runVerification() {
    console.log("Running verification for smart sorter...");

    const results = [];
    for (let i = 0; i < 5; i++) {
        const sortedHand = getSmartSortedHand(sampleHand);
        if (!sortedHand) {
            console.error("Verification failed: getSmartSortedHand returned null.");
            return;
        }
        // Convert to a string representation for easy comparison
        const handString = JSON.stringify({
            top: sortedHand.top.map(c => `${c.rank}_of_${c.suit}`).sort(),
            middle: sortedHand.middle.map(c => `${c.rank}_of_${c.suit}`).sort(),
            bottom: sortedHand.bottom.map(c => `${c.rank}_of_${c.suit}`).sort()
        });
        results.push(handString);
    }

    const uniqueResults = new Set(results);

    console.log(`Generated ${results.length} hands.`);
    console.log(`Found ${uniqueResults.size} unique arrangements.`);

    if (uniqueResults.size > 1) {
        console.log("SUCCESS: The smart sorter produced multiple different hand arrangements.");
    } else if (uniqueResults.size === 1) {
        console.log("NOTE: The smart sorter produced only one unique arrangement for this specific hand. This might be correct if there is only one optimal solution, but it does not confirm variety.");
    } else {
        console.error("FAILURE: The smart sorter produced no valid arrangements.");
    }

    console.log("\nSample of one arrangement:");
    console.log(JSON.parse(results[0]));
}

runVerification();
