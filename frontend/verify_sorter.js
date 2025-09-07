import { getSmartSortedHand } from './src/utils/autoSorter.js';
import { getAreaType } from './src/utils/sssScorer.js';
import { parseCard } from './src/utils/pokerEvaluator.js';

function run() {
    const sampleHand = [
        'ace_of_spades', 'ace_of_hearts', 'king_of_clubs',
        'king_of_spades', 'king_of_hearts',
        '5_of_spades', '6_of_hearts', 'jack_of_diamonds', '10_of_clubs',
        '9_of_diamonds', '8_of_clubs', '7_of_diamonds', '2_of_clubs',
    ].map(parseCard);

    console.log("Original Hand:", sampleHand.map(c => `${c.rank}_of_${c.suit}`).join(', '));

    const strategies = ['bottom', 'middle', 'top'];

    for (const strategy of strategies) {
        console.log(`\n--- Testing Strategy: ${strategy.toUpperCase()} ---`);
        const sortedHand = getSmartSortedHand(sampleHand, strategy);

        if (sortedHand) {
            const top = sortedHand.top.map(c => `${c.rank}_of_${c.suit}`);
            const middle = sortedHand.middle.map(c => `${c.rank}_of_${c.suit}`);
            const bottom = sortedHand.bottom.map(c => `${c.rank}_of_${c.suit}`);

            console.log("Top Lane:", top.join(', '));
            console.log("Middle Lane:", middle.join(', '));
            console.log("Bottom Lane:", bottom.join(', '));

            const topType = getAreaType(top, 'head');
            const middleType = getAreaType(middle, 'middle');
            const bottomType = getAreaType(bottom, 'tail');

            console.log("Hand Types -> Top:", topType, "| Middle:", middleType, "| Bottom:", bottomType);
        } else {
            console.log("Could not sort hand for strategy:", strategy);
        }
    }
}

run();
