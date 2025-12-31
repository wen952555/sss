const cardValues = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
    'jack': 11, 'queen': 12, 'king': 13, 'ace': 14
};

const handRanks = {
    HIGH_CARD: 0, PAIR: 1, TWO_PAIR: 2, THREE_OF_A_KIND: 3, STRAIGHT: 4,
    FLUSH: 5, FULL_HOUSE: 6, FOUR_OF_A_KIND: 7, STRAIGHT_FLUSH: 8
};

function parseCard(card) {
    const [value, _, suit] = card.split('_');
    return { value: cardValues[value], suit, raw: card };
}

export const getHandScore = (cards) => {
    if (!cards || cards.length === 0) return { rank: handRanks.HIGH_CARD, score: 0, name: '无' };

    const parsedCards = cards.map(parseCard).sort((a, b) => b.value - a.value);
    const values = parsedCards.map(c => c.value);
    const suits = parsedCards.map(c => c.suit);

    const isFlush = new Set(suits).size === 1;
    const isStraight = values.every((v, i) => i === 0 || v === values[i - 1] - 1);
    
    // Handle A-2-3-4-5 straight (wheel)
    const isWheel = JSON.stringify(values) === JSON.stringify([14, 5, 4, 3, 2]);
    if (isWheel) {
        // For scoring, treat Ace as low
        const wheelValues = [5, 4, 3, 2, 1];
        if (isFlush) return { rank: handRanks.STRAIGHT_FLUSH, score: 5, name: '同花顺' };
        return { rank: handRanks.STRAIGHT, score: 5, name: '顺子' };
    }

    if (isStraight && isFlush) return { rank: handRanks.STRAIGHT_FLUSH, score: values[0], name: '同花顺' };

    const valueCounts = values.reduce((acc, v) => ({ ...acc, [v]: (acc[v] || 0) + 1 }), {});
    const counts = Object.values(valueCounts).sort((a, b) => b - a);
    const primaryScore = parseInt(Object.keys(valueCounts).find(k => valueCounts[k] === counts[0]));
    const secondaryScore = parseInt(Object.keys(valueCounts).find(k => valueCounts[k] === counts[1])) || 0;

    if (counts[0] === 4) return { rank: handRanks.FOUR_OF_A_KIND, score: primaryScore, name: '四条' };
    if (counts[0] === 3 && counts[1] === 2) return { rank: handRanks.FULL_HOUSE, score: primaryScore + secondaryScore / 100, name: '葫芦' };
    if (isFlush) return { rank: handRanks.FLUSH, score: values.reduce((s, v) => s + v, 0), name: '同花' };
    if (isStraight) return { rank: handRanks.STRAIGHT, score: values[0], name: '顺子' };
    if (counts[0] === 3) return { rank: handRanks.THREE_OF_A_KIND, score: primaryScore, name: '三条' };
    if (counts[0] === 2 && counts[1] === 2) return { rank: handRanks.TWO_PAIR, score: primaryScore + secondaryScore / 100, name: '两对' };
    if (counts[0] === 2) return { rank: handRanks.PAIR, score: primaryScore, name: '对子' };

    return { 
        rank: handRanks.HIGH_CARD, 
        score: values.reduce((s, v, i) => s + v / Math.pow(100, i), 0), // Lexicographical score
        name: '散牌' 
    };
};

export const getPatternName = (cards) => {
    return getHandScore(cards).name;
};


function findBestFive(cards) {
  // This is a placeholder for a more complex algorithm (e.g., for 7-card stud)
  // For 13-card game, we deal with fixed hands, so this is less critical.
  return cards.slice(0, 5);
}

export const smartSort = (allCards) => {
    const hands = {
        head: allCards.slice(0, 3),
        mid: allCards.slice(3, 8),
        back: allCards.slice(8, 13)
    };

    // A true smart sort would involve combinatorial optimization.
    // The below is a simplified heuristic placeholder.
    // It sorts cards by value and distributes them.
    const sortedCards = allCards.map(parseCard).sort((a, b) => b.value - a.value).map(c => c.raw);

    // This simple distribution is likely to be invalid. 
    // A real algorithm is needed here for a good player AI or suggestion tool.
    return {
        head: sortedCards.slice(10, 13),
        mid: sortedCards.slice(5, 10),
        back: sortedCards.slice(0, 5)
    };
};