// server/gameLogic.js

/**
 * @fileoverview Core game logic for the Thirteen Waters (SSS) card game.
 * Includes deck creation, hand evaluation, and scoring.
 */

const {
    SUITS,
    RANKS,
    RANK_VALUES,
    HAND_TYPES,
    SPECIAL_HAND_TYPES,
    SEGMENT_SCORES
} = require('./constants');


// --- Deck Operations ---

/**
 * Creates a standard 52-card deck.
 * @returns {Array<object>} An array of card objects.
 */
function createDeck() {
    const deck = [];
    for (const suit of SUITS) {
        for (const rank of RANKS) {
            deck.push({ suit, rank, value: RANK_VALUES[rank] });
        }
    }
    return deck;
}

/**
 * Shuffles an array of cards in place.
 * @param {Array<object>} deck The deck of cards to shuffle.
 * @returns {Array<object>} The shuffled deck.
 */
function shuffleDeck(deck) {
    // Fisher-Yates shuffle algorithm
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

/**
 * Deals 13 cards to up to 4 players.
 * @param {number} numPlayers The number of players to deal to.
 * @returns {object} An object with keys `player1`, `player2`, etc., containing their hands.
 */
function dealCards(numPlayers = 4) {
    const deck = shuffleDeck(createDeck());
    const hands = {};
    for (let i = 0; i < numPlayers; i++) {
        hands[`player${i + 1}`] = deck.slice(i * 13, (i + 1) * 13);
    }
    return hands;
}


// --- Hand Evaluation Helpers ---

/**
 * Calculates the counts of each rank and suit in a hand.
 * @param {Array<object>} hand The hand to analyze.
 * @returns {{rankCounts: object, suitCounts: object}} Counts of ranks and suits.
 */
function getCounts(hand) {
    return hand.reduce((acc, card) => {
        acc.rankCounts[card.rank] = (acc.rankCounts[card.rank] || 0) + 1;
        acc.suitCounts[card.suit] = (acc.suitCounts[card.suit] || 0) + 1;
        return acc;
    }, { rankCounts: {}, suitCounts: {} });
}

/**
 * Checks if a hand is a flush.
 * @param {Array<object>} hand The hand to check.
 * @returns {boolean} True if the hand is a flush.
 */
function isFlush(hand) {
    if (!hand || hand.length === 0) return false;
    const firstSuit = hand[0].suit;
    return hand.every(c => c.suit === firstSuit);
}

/**
 * Checks if a hand is a straight.
 * @param {Array<object>} hand The hand to check.
 * @returns {{isStraight: boolean, highCard?: number, ranks?: Array<number>}} Result object.
 */
function isStraight(hand) {
    // Use a Set to get unique rank values, then sort them.
    const sortedRanks = [...new Set(hand.map(c => c.value))].sort((a, b) => a - b);
    if (sortedRanks.length !== hand.length) return { isStraight: false }; // Not unique ranks means pairs, etc.

    // Check for Ace-low straight (A-2-3-4-5)
    const isAceLow = JSON.stringify(sortedRanks) === JSON.stringify([RANK_VALUES['2'], RANK_VALUES['3'], RANK_VALUES['4'], RANK_VALUES['5'], RANK_VALUES['A']]);
    if (isAceLow) {
        // In Ace-low straights, the Ace is considered the lowest card for ranking.
        return { isStraight: true, highCard: RANK_VALUES['5'], ranks: [RANK_VALUES['5'], RANK_VALUES['4'], RANK_VALUES['3'], RANK_VALUES['2'], RANK_VALUES['A']] };
    }

    // Check for standard straight
    for (let i = 0; i < sortedRanks.length - 1; i++) {
        if (sortedRanks[i+1] - sortedRanks[i] !== 1) {
            return { isStraight: false };
        }
    }

    return { isStraight: true, highCard: sortedRanks[sortedRanks.length - 1], ranks: sortedRanks.slice().reverse() };
}

/**
 * Finds group of cards by size (e.g., finds pairs, three-of-a-kind).
 * @param {object} rankCounts - A map of card ranks to their counts.
 * @param {number} size - The size of the group to find (e.g., 2 for a pair).
 * @returns {Array<string>} An array of ranks that form groups of the given size.
 */
function findGroups(rankCounts, size) {
    return Object.keys(rankCounts).filter(rank => rankCounts[rank] === size);
}


// --- 13-Card Special Hand Evaluation ---

/**
 * Evaluates a 13-card hand for special hand types.
 * @param {Array<object>} arrangedHand - The player's complete 13-card hand, arranged.
 * @returns {object} The special hand type object, or NONE if not a special hand.
 */
function evaluate13CardHand(front, middle, back) {
    const allCards = [...front, ...middle, ...back];
    if (allCards.length !== 13) return SPECIAL_HAND_TYPES.NONE;

    const { rankCounts, suitCounts } = getCounts(allCards);
    const ranks = allCards.map(c => c.value).sort((a, b) => a - b);
    const uniqueRanks = [...new Set(ranks)];

    // 一条龙 (Dragon): A-K straight
    if (uniqueRanks.length === 13 && (ranks[12] - ranks[0] === 12)) {
        return SPECIAL_HAND_TYPES.DRAGON;
    }

    // 六对半 (Six Pairs)
    if (findGroups(rankCounts, 2).length === 6) {
        return SPECIAL_HAND_TYPES.SIX_PAIRS;
    }

    // 三同花 (Three Flushes)
    const isFrontFlush = isFlush(front);
    const isMiddleFlush = isFlush(middle);
    const isBackFlush = isFlush(back);
    if (isFrontFlush && isMiddleFlush && isBackFlush) {
        return SPECIAL_HAND_TYPES.THREE_FLUSHES;
    }

    // 三顺子 (Three Straights)
    const isFrontStraight = isStraight(front).isStraight;
    const isMiddleStraight = isStraight(middle).isStraight;
    const isBackStraight = isStraight(back).isStraight;
    if (isFrontStraight && isMiddleStraight && isBackStraight) {
        return SPECIAL_HAND_TYPES.THREE_STRAIGHTS;
    }

    return SPECIAL_HAND_TYPES.NONE;
}

// --- 3-Card Hand Evaluation ---
/**
 * Evaluates a 3-card hand segment.
 * @param {Array<object>} hand - The 3-card hand.
 * @returns {object|null} An object describing the hand type and ranking, or null if invalid.
 */
function evaluate3CardHand(hand) {
    if (!hand || hand.length !== 3) return null;

    const sortedHand = [...hand].sort((a, b) => b.value - a.value);
    const ranks = sortedHand.map(c => c.value);
    const { rankCounts } = getCounts(hand);

    // Three of a Kind
    const threeOfAKindRank = findGroups(rankCounts, 3);
    if (threeOfAKindRank.length === 1) {
        return { type: HAND_TYPES.THREE_OF_A_KIND, ranks: [RANK_VALUES[threeOfAKindRank[0]]], hand: sortedHand };
    }

    // One Pair
    const pairRank = findGroups(rankCounts, 2);
    if (pairRank.length === 1) {
        const kickerRank = findGroups(rankCounts, 1);
        return { type: HAND_TYPES.ONE_PAIR, ranks: [RANK_VALUES[pairRank[0]], RANK_VALUES[kickerRank[0]]], hand: sortedHand };
    }

    // High Card
    return { type: HAND_TYPES.HIGH_CARD, ranks, hand: sortedHand };
}


// --- 5-Card Hand Evaluation ---

/**
 * Checks for a four-of-a-kind in a 5-card hand.
 * @param {object} rankCounts - Counts of each rank.
 * @param {Array<object>} sortedHand - The hand, sorted by card value.
 * @returns {object|null} The evaluated hand object or null.
 */
function checkFourOfAKind(rankCounts, sortedHand) {
    const fourRank = findGroups(rankCounts, 4);
    if (fourRank.length === 1) {
        const kickerRank = findGroups(rankCounts, 1);
        return {
            type: HAND_TYPES.FOUR_OF_A_KIND,
            ranks: [RANK_VALUES[fourRank[0]], RANK_VALUES[kickerRank[0]]],
            hand: sortedHand
        };
    }
    return null;
}

/**
 * Checks for a full house in a 5-card hand.
 * @param {object} rankCounts - Counts of each rank.
 * @param {Array<object>} sortedHand - The hand, sorted by card value.
 * @returns {object|null} The evaluated hand object or null.
 */
function checkFullHouse(rankCounts, sortedHand) {
    const threeRank = findGroups(rankCounts, 3);
    const pairRank = findGroups(rankCounts, 2);
    if (threeRank.length === 1 && pairRank.length === 1) {
        return {
            type: HAND_TYPES.FULL_HOUSE,
            ranks: [RANK_VALUES[threeRank[0]], RANK_VALUES[pairRank[0]]],
            hand: sortedHand
        };
    }
    return null;
}

/**
 * Checks for two pairs in a 5-card hand.
 * @param {object} rankCounts - Counts of each rank.
 * @param {Array<object>} sortedHand - The hand, sorted by card value.
 * @returns {object|null} The evaluated hand object or null.
 */
function checkTwoPair(rankCounts, sortedHand) {
    const pairRanks = findGroups(rankCounts, 2);
    if (pairRanks.length === 2) {
        const kickerRank = findGroups(rankCounts, 1);
        const sortedPairRanks = pairRanks.map(r => RANK_VALUES[r]).sort((a, b) => b - a);
        return {
            type: HAND_TYPES.TWO_PAIR,
            ranks: [...sortedPairRanks, RANK_VALUES[kickerRank[0]]],
            hand: sortedHand
        };
    }
    return null;
}

/**
 * Checks for one pair in a 5-card hand.
 * @param {object} rankCounts - Counts of each rank.
 * @param {Array<object>} sortedHand - The hand, sorted by card value.
 * @returns {object|null} The evaluated hand object or null.
 */
function checkOnePair(rankCounts, sortedHand) {
    const pairRank = findGroups(rankCounts, 2);
    if (pairRank.length === 1) {
        const kickers = findGroups(rankCounts, 1).map(r => RANK_VALUES[r]).sort((a, b) => b - a);
        return {
            type: HAND_TYPES.ONE_PAIR,
            ranks: [RANK_VALUES[pairRank[0]], ...kickers],
            hand: sortedHand
        };
    }
    return null;
}

/**
 * Evaluates a 5-card hand.
 * @param {Array<object>} hand - The 5-card hand.
 * @returns {object|null} An object describing the hand type and ranking, or null if invalid.
 */
function evaluate5CardHand(hand) {
    if (!hand || hand.length !== 5) return null;

    const sortedHand = [...hand].sort((a, b) => b.value - a.value);
    const ranks = sortedHand.map(c => c.value);
    const { rankCounts } = getCounts(hand);

    const flush = isFlush(hand);
    const straight = isStraight(hand);
    
    if (straight.isStraight && flush) {
        const type = (straight.highCard === RANK_VALUES.A) ? HAND_TYPES.ROYAL_FLUSH : HAND_TYPES.STRAIGHT_FLUSH;
        return { type, ranks: straight.ranks, hand: sortedHand };
    }
    
    const fourOfAKind = checkFourOfAKind(rankCounts, sortedHand);
    if (fourOfAKind) return fourOfAKind;

    const fullHouse = checkFullHouse(rankCounts, sortedHand);
    if (fullHouse) return fullHouse;

    if (flush) {
        return { type: HAND_TYPES.FLUSH, ranks, hand: sortedHand };
    }

    if (straight.isStraight) {
        return { type: HAND_TYPES.STRAIGHT, ranks: straight.ranks, hand: sortedHand };
    }

    // Since ThreeOfAKind for 5 cards is different from 3 cards (has kickers)
    const threeRank = findGroups(rankCounts, 3);
    if (threeRank.length === 1) {
        const kickers = findGroups(rankCounts, 1).map(r => RANK_VALUES[r]).sort((a, b) => b - a);
        return {
            type: HAND_TYPES.THREE_OF_A_KIND,
            ranks: [RANK_VALUES[threeRank[0]], ...kickers],
            hand: sortedHand
        };
    }

    const twoPair = checkTwoPair(rankCounts, sortedHand);
    if (twoPair) return twoPair;

    const onePair = checkOnePair(rankCounts, sortedHand);
    if (onePair) return onePair;
    
    return { type: HAND_TYPES.HIGH_CARD, ranks, hand: sortedHand };
}

// --- Comparison and Validation ---

/**
 * Compares two evaluated hands to determine the winner.
 * @param {object} eval1 - The first evaluated hand.
 * @param {object} eval2 - The second evaluated hand.
 * @returns {number} 1 if eval1 wins, -1 if eval2 wins, 0 for a tie.
 */
function compareEvaluatedHands(eval1, eval2) {
    if (eval1.type.value !== eval2.type.value) {
        return eval1.type.value > eval2.type.value ? 1 : -1;
    }
    // Compare based on the pre-sorted ranks array
    for (let i = 0; i < eval1.ranks.length; i++) {
        if (eval1.ranks[i] !== eval2.ranks[i]) {
            return eval1.ranks[i] > eval2.ranks[i] ? 1 : -1;
        }
    }
    return 0; // Hands are identical
}

/**
 * Validates if the player's arranged hand segments are in proper increasing order.
 * @param {Array<object>} front - The 3-card front hand.
 * @param {Array<object>} middle - The 5-card middle hand.
 * @param {Array<object>} back - The 5-card back hand.
 * @returns {boolean} True if the arrangement is valid.
 */
function isValidHand(front, middle, back) {
    if (front.length !== 3 || middle.length !== 5 || back.length !== 5) {
        return false;
    }

    const frontEval = evaluate3CardHand(front);
    const middleEval = evaluate5CardHand(middle);
    const backEval = evaluate5CardHand(back);

    if (!frontEval || !middleEval || !backEval) return false;

    // Back must be >= Middle, Middle must be >= Front
    if (compareEvaluatedHands(middleEval, backEval) > 0) return false;
    if (compareEvaluatedHands(frontEval, middleEval) > 0) return false;

    return true;
}

// --- Player vs. Player Scoring ---

/**
 * Compares the hands of two players and calculates their scores.
 * @param {object} p1_eval - Player 1's evaluated hand segments.
 * @param {object} p2_eval - Player 2's evaluated hand segments.
 * @returns {object} An object containing scores for both players.
 */
function comparePlayerHands(p1_eval, p2_eval) {
    const p1_segment_scores = { front: 0, middle: 0, back: 0 };
    const p2_segment_scores = { front: 0, middle: 0, back: 0 };

    const results = {
        front: compareEvaluatedHands(p1_eval.front, p2_eval.front),
        middle: compareEvaluatedHands(p1_eval.middle, p2_eval.middle),
        back: compareEvaluatedHands(p1_eval.back, p2_eval.back),
    };

    let p1_wins = 0;
    let p2_wins = 0;

    // Calculate base score for each segment
    for (const segment of ['front', 'middle', 'back']) {
        if (results[segment] > 0) p1_wins++;
        if (results[segment] < 0) p2_wins++;
    }

    let p1_total_score = 0;
    let p2_total_score = 0;

    // Calculate segment scores with bonuses
    for (const segment of ['front', 'middle', 'back']) {
        const winner = results[segment] > 0 ? 'p1' : (results[segment] < 0 ? 'p2' : null);
        if (winner) {
            const winner_eval = winner === 'p1' ? p1_eval : p2_eval;
            const hand_type_name = winner_eval[segment].type.name;
            const bonus = SEGMENT_SCORES[segment]?.[hand_type_name] || 1;

            if (winner === 'p1') {
                p1_segment_scores[segment] = bonus;
                p2_segment_scores[segment] = -bonus;
                p1_total_score += bonus;
            } else {
                p2_segment_scores[segment] = bonus;
                p1_segment_scores[segment] = -bonus;
                p2_total_score += bonus;
            }
        }
    }

    // Apply "scoop" (打枪) bonus
    if (p1_wins === 3) {
        p1_total_score *= 2;
    } else if (p2_wins === 3) {
        p2_total_score *= 2;
    }

    // The final score is the net difference
    const final_p1_score = p1_total_score - p2_total_score;
    const final_p2_score = p2_total_score - p1_total_score;

    return { p1_score: final_p1_score, p2_score: final_p2_score, p1_segment_scores, p2_segment_scores };
}


async function calculateResults(roomId, gameRooms, gameDb) {
    const room = gameRooms[roomId];
    if (!room) return;
    const { players, gameState } = room;
    const playerIds = Object.keys(gameState.submittedHands);
    if (playerIds.length === 0) return;

    // First, evaluate all hands and check for special 13-card hands
    playerIds.forEach(id => {
        const { front, middle, back } = gameState.submittedHands[id];

        // Check for special hands based on the final arrangement
        gameState.specialHands[id] = evaluate13CardHand(front, middle, back);

        // Evaluate standard segment hands
        gameState.evaluatedHands[id] = {
            front: evaluate3CardHand(front),
            middle: evaluate5CardHand(middle),
            back: evaluate5CardHand(back),
        };
    });

    const finalScores = playerIds.reduce((acc, id) => ({ ...acc, [id]: { total: 0, special: null } }), {});
    const specialPlayerId = playerIds.find(id => gameState.specialHands[id].value > SPECIAL_HAND_TYPES.NONE.value);

    if (specialPlayerId) {
        const specialHand = gameState.specialHands[specialPlayerId];
        const score = specialHand.score;
        finalScores[specialPlayerId].special = specialHand.name;
        playerIds.forEach(id => {
            finalScores[id].total = (id === specialPlayerId) ? score * (playerIds.length - 1) : -score;
        });
    } else {
        for (let i = 0; i < playerIds.length; i++) {
            for (let j = i + 1; j < playerIds.length; j++) {
                const p1_id = playerIds[i];
                const p2_id = playerIds[j];
                const { p1_score, p2_score } = comparePlayerHands(gameState.evaluatedHands[p1_id], gameState.evaluatedHands[p2_id]);
                finalScores[p1_id].total += p1_score;
                finalScores[p2_id].total += p2_score;
            }
        }
    }

    gameState.results = { scores: finalScores, hands: gameState.submittedHands, evals: gameState.evaluatedHands, playerDetails: players };
    gameState.status = 'finished';

    // Save to DB
    try {
        const [gameResult] = await gameDb.query('INSERT INTO games (room_id) VALUES (?)', [roomId]);
        const gameId = gameResult.insertId;
        for (const playerId of playerIds) {
            const player = Object.values(players).find(p => p.id === playerId);
            if(!player) continue;

            const { front, middle, back } = gameState.submittedHands[playerId];
            const score = finalScores[playerId].total;
            const specialHandType = finalScores[playerId].special || null;

            await gameDb.query(
                'INSERT INTO player_scores (game_id, player_id, player_name, hand_front, hand_middle, hand_back, score, special_hand_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [gameId, player.db_id, player.name, JSON.stringify(front), JSON.stringify(middle), JSON.stringify(back), score, specialHandType]
            );
        }
        console.log(`Game ${gameId} results saved.`);
    } catch (error) {
        console.error(`Failed to save game results for room ${roomId}:`, error);
    }
}


module.exports = {
    dealCards,
    comparePlayerHands,
    evaluate13CardHand,
    evaluate5CardHand,
    evaluate3CardHand,
    isValidHand,
    compareEvaluatedHands,
    calculateResults,
    // We no longer need to export these constants as they will be in their own file
    // SEGMENT_SCORES,
    // SPECIAL_HAND_TYPES
};
