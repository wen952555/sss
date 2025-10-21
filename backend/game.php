<?php
// backend/game.php

require_once 'constants.php';

// --- Deck Operations ---

/**
 * Creates a standard 52-card deck.
 * @return array An array of card objects.
 */
function createDeck() {
    $deck = [];
    foreach (SUITS as $suit) {
        foreach (RANKS as $rank) {
            $deck[] = ['suit' => $suit, 'rank' => $rank, 'value' => RANK_VALUES[$rank]];
        }
    }
    return $deck;
}

/**
 * Shuffles an array of cards.
 * @param array $deck The deck of cards to shuffle.
 * @return array The shuffled deck.
 */
function shuffleDeck(array &$deck) {
    shuffle($deck);
    return $deck;
}

/**
 * Deals 13 cards to up to 4 players.
 * @param int $numPlayers The number of players to deal to.
 * @return array An object with keys `player1`, `player2`, etc., containing their hands.
 */
function dealCards($numPlayers = 4) {
    $deck = shuffleDeck(createDeck());
    $hands = [];
    for ($i = 0; $i < $numPlayers; $i++) {
        $hands['player' . ($i + 1)] = array_slice($deck, $i * 13, 13);
    }
    return $hands;
}


// --- Hand Evaluation Helpers ---

/**
 * Calculates the counts of each rank and suit in a hand.
 * @param array $hand The hand to analyze.
 * @return array Counts of ranks and suits.
 */
function getCounts(array $hand) {
    $rankCounts = [];
    $suitCounts = [];
    foreach ($hand as $card) {
        $rankCounts[$card['rank']] = ($rankCounts[$card['rank']] ?? 0) + 1;
        $suitCounts[$card['suit']] = ($suitCounts[$card['suit']] ?? 0) + 1;
    }
    return ['rankCounts' => $rankCounts, 'suitCounts' => $suitCounts];
}

/**
 * Checks if a hand is a flush.
 * @param array $hand The hand to check.
 * @return bool True if the hand is a flush.
 */
function isFlush(array $hand) {
    if (empty($hand)) return false;
    $firstSuit = $hand[0]['suit'];
    foreach ($hand as $card) {
        if ($card['suit'] !== $firstSuit) {
            return false;
        }
    }
    return true;
}

/**
 * Checks if a hand is a straight.
 * @param array $hand The hand to check.
 * @return array Result object.
 */
function isStraight(array $hand) {
    $values = array_map(function($c) { return $c['value']; }, $hand);
    $uniqueValues = array_unique($values);
    sort($uniqueValues);

    if (count($uniqueValues) !== count($hand)) {
        return ['isStraight' => false]; // Not unique ranks means pairs, etc.
    }

    // Ace-low straight (A-2-3-4-5)
    $aceLowRanks = [RANK_VALUES['2'], RANK_VALUES['3'], RANK_VALUES['4'], RANK_VALUES['5'], RANK_VALUES['A']];
    sort($aceLowRanks);
    if ($uniqueValues === $aceLowRanks) {
        return ['isStraight' => true, 'highCard' => RANK_VALUES['5'], 'ranks' => array_reverse($aceLowRanks)];
    }

    // Standard straight
    for ($i = 0; $i < count($uniqueValues) - 1; $i++) {
        if ($uniqueValues[$i+1] - $uniqueValues[$i] !== 1) {
            return ['isStraight' => false];
        }
    }

    return ['isStraight' => true, 'highCard' => $uniqueValues[count($uniqueValues) - 1], 'ranks' => array_reverse($uniqueValues)];
}

/**
 * Finds group of cards by size (e.g., finds pairs, three-of-a-kind).
 * @param array $rankCounts - A map of card ranks to their counts.
 * @param int $size - The size of the group to find.
 * @return array An array of ranks that form groups of the given size.
 */
function findGroups(array $rankCounts, $size) {
    $groups = [];
    foreach ($rankCounts as $rank => $count) {
        if ($count === $size) {
            $groups[] = $rank;
        }
    }
    return $groups;
}


// --- 3-Card Hand Evaluation ---
function evaluate3CardHand(array $hand) {
    if (count($hand) !== 3) return null;

    usort($hand, function($a, $b) { return $b['value'] - $a['value']; });
    $ranks = array_map(function($c) { return $c['value']; }, $hand);
    $counts = getCounts($hand);
    $rankCounts = $counts['rankCounts'];

    // Three of a Kind
    $threeOfAKindRank = findGroups($rankCounts, 3);
    if (count($threeOfAKindRank) === 1) {
        return ['type' => HAND_TYPES['THREE_OF_A_KIND'], 'ranks' => [RANK_VALUES[$threeOfAKindRank[0]]], 'hand' => $hand];
    }

    // One Pair
    $pairRank = findGroups($rankCounts, 2);
    if (count($pairRank) === 1) {
        $kickerRank = findGroups($rankCounts, 1);
        return ['type' => HAND_TYPES['ONE_PAIR'], 'ranks' => [RANK_VALUES[$pairRank[0]], RANK_VALUES[$kickerRank[0]]], 'hand' => $hand];
    }

    // High Card
    return ['type' => HAND_TYPES['HIGH_CARD'], 'ranks' => $ranks, 'hand' => $hand];
}


// --- 5-Card Hand Evaluation ---
function evaluate5CardHand(array $hand) {
    if (count($hand) !== 5) return null;

    usort($hand, function($a, $b) { return $b['value'] - $a['value']; });
    $ranks = array_map(function($c) { return $c['value']; }, $hand);
    $counts = getCounts($hand);
    $rankCounts = $counts['rankCounts'];

    $flush = isFlush($hand);
    $straight = isStraight($hand);

    if ($straight['isStraight'] && $flush) {
        $type = ($straight['highCard'] === RANK_VALUES['A']) ? HAND_TYPES['ROYAL_FLUSH'] : HAND_TYPES['STRAIGHT_FLUSH'];
        return ['type' => $type, 'ranks' => $straight['ranks'], 'hand' => $hand];
    }

    $fourRank = findGroups($rankCounts, 4);
    if (count($fourRank) === 1) {
        $kickerRank = findGroups($rankCounts, 1);
        return ['type' => HAND_TYPES['FOUR_OF_A_KIND'], 'ranks' => [RANK_VALUES[$fourRank[0]], RANK_VALUES[$kickerRank[0]]], 'hand' => $hand];
    }

    $threeRank = findGroups($rankCounts, 3);
    $pairRank = findGroups($rankCounts, 2);
    if (count($threeRank) === 1 && count($pairRank) === 1) {
        return ['type' => HAND_TYPES['FULL_HOUSE'], 'ranks' => [RANK_VALUES[$threeRank[0]], RANK_VALUES[$pairRank[0]]], 'hand' => $hand];
    }

    if ($flush) {
        return ['type' => HAND_TYPES['FLUSH'], 'ranks' => $ranks, 'hand' => $hand];
    }

    if ($straight['isStraight']) {
        return ['type' => HAND_TYPES['STRAIGHT'], 'ranks' => $straight['ranks'], 'hand' => $hand];
    }

    if (count($threeRank) === 1) {
        $kickers = array_map(function($r) { return RANK_VALUES[$r]; }, findGroups($rankCounts, 1));
        rsort($kickers);
        return ['type' => HAND_TYPES['THREE_OF_A_KIND'], 'ranks' => [RANK_VALUES[$threeRank[0]], ...$kickers], 'hand' => $hand];
    }

    $pairRanks = findGroups($rankCounts, 2);
    if (count($pairRanks) === 2) {
        $kickerRank = findGroups($rankCounts, 1);
        $sortedPairRanks = array_map(function($r) { return RANK_VALUES[$r]; }, $pairRanks);
        rsort($sortedPairRanks);
        return ['type' => HAND_TYPES['TWO_PAIR'], 'ranks' => [...$sortedPairRanks, RANK_VALUES[$kickerRank[0]]], 'hand' => $hand];
    }

    if (count($pairRanks) === 1) {
        $kickers = array_map(function($r) { return RANK_VALUES[$r]; }, findGroups($rankCounts, 1));
        rsort($kickers);
        return ['type' => HAND_TYPES['ONE_PAIR'], 'ranks' => [RANK_VALUES[$pairRanks[0]], ...$kickers], 'hand' => $hand];
    }

    return ['type' => HAND_TYPES['HIGH_CARD'], 'ranks' => $ranks, 'hand' => $hand];
}


// --- 13-Card Special Hand Evaluation ---
function evaluate13CardHand($front, $middle, $back) {
    $allCards = array_merge($front, $middle, $back);
    if (count($allCards) !== 13) return SPECIAL_HAND_TYPES['NONE'];

    $counts = getCounts($allCards);
    $rankCounts = $counts['rankCounts'];
    $suitCounts = $counts['suitCounts'];

    $values = array_map(function($c) { return $c['value']; }, $allCards);
    sort($values);
    $uniqueValues = array_unique($values);

    if (count($uniqueValues) === 13) {
        return isFlush($allCards) ? SPECIAL_HAND_TYPES['SUPREME_DRAGON'] : SPECIAL_HAND_TYPES['DRAGON'];
    }

    $royalRanks = [RANK_VALUES['J'], RANK_VALUES['Q'], RANK_VALUES['K'], RANK_VALUES['A']];
    $twelveRoyalsCount = 0;
    foreach ($allCards as $card) {
        if (in_array($card['value'], $royalRanks)) {
            $twelveRoyalsCount++;
        }
    }
    if ($twelveRoyalsCount >= 12) {
        return SPECIAL_HAND_TYPES['TWELVE_ROYALS'];
    }

    $frontEval = evaluate3CardHand($front);
    $middleEval = evaluate5CardHand($middle);
    $backEval = evaluate5CardHand($back);

    if ($frontEval['type'] === HAND_TYPES['STRAIGHT_FLUSH'] && $middleEval['type'] === HAND_TYPES['STRAIGHT_FLUSH'] && $backEval['type'] === HAND_TYPES['STRAIGHT_FLUSH']) {
        return SPECIAL_HAND_TYPES['THREE_STRAIGHT_FLUSHES'];
    }

    $triples = findGroups($rankCounts, 3);
    if (count($triples) === 4) {
        return SPECIAL_HAND_TYPES['FOUR_TRIPLES'];
    }

    $isAllBig = true;
    foreach ($allCards as $card) {
        if ($card['value'] < RANK_VALUES['8']) {
            $isAllBig = false;
            break;
        }
    }
    if ($isAllBig) return SPECIAL_HAND_TYPES['ALL_BIG'];

    $isAllSmall = true;
    foreach ($allCards as $card) {
        if ($card['value'] >= RANK_VALUES['8']) {
            $isAllSmall = false;
            break;
        }
    }
    if ($isAllSmall) return SPECIAL_HAND_TYPES['ALL_SMALL'];

    $isAllSameColor = (isset($suitCounts['spades']) && isset($suitCounts['clubs']) && !isset($suitCounts['hearts']) && !isset($suitCounts['diamonds'])) || (!isset($suitCounts['spades']) && !isset($suitCounts['clubs']) && isset($suitCounts['hearts']) && isset($suitCounts['diamonds']));
    if ($isAllSameColor) {
        return SPECIAL_HAND_TYPES['ALL_SAME_COLOR'];
    }

    if (count(findGroups($rankCounts, 2)) === 5 && count($triples) === 1) {
        return SPECIAL_HAND_TYPES['FIVE_PAIRS_AND_TRIPLE'];
    }

    if (isFlush($front) && isFlush($middle) && isFlush($back)) {
        return SPECIAL_HAND_TYPES['THREE_FLUSHES'];
    }

    if (isStraight($front)['isStraight'] && isStraight($middle)['isStraight'] && isStraight($back)['isStraight']) {
        return SPECIAL_HAND_TYPES['THREE_STRAIGHTS'];
    }

    if (count(findGroups($rankCounts, 2)) === 6) {
        return SPECIAL_HAND_TYPES['SIX_PAIRS'];
    }

    return SPECIAL_HAND_TYPES['NONE'];
}

// --- Comparison and Validation ---
function compareEvaluatedHands($eval1, $eval2) {
    if ($eval1['type']['value'] !== $eval2['type']['value']) {
        return $eval1['type']['value'] > $eval2['type']['value'] ? 1 : -1;
    }
    for ($i = 0; $i < count($eval1['ranks']); $i++) {
        if ($eval1['ranks'][$i] !== $eval2['ranks'][$i]) {
            return $eval1['ranks'][$i] > $eval2['ranks'][$i] ? 1 : -1;
        }
    }
    return 0; // Tie
}

function isValidHand($front, $middle, $back) {
    if (count($front) !== 3 || count($middle) !== 5 || count($back) !== 5) {
        return false;
    }

    $frontEval = evaluate3CardHand($front);
    $middleEval = evaluate5CardHand($middle);
    $backEval = evaluate5CardHand($back);

    if (!$frontEval || !$middleEval || !$backEval) return false;

    if (compareEvaluatedHands($middleEval, $backEval) > 0) return false;
    if (compareEvaluatedHands($frontEval, $middleEval) > 0) return false;

    return true;
}

// --- Player vs. Player Scoring ---
function comparePlayerHands($p1_eval, $p2_eval) {
    $p1_total_score = 0;
    $p2_total_score = 0;

    $p1_wins = 0;
    $p2_wins = 0;

    foreach (['front', 'middle', 'back'] as $segment) {
        $result = compareEvaluatedHands($p1_eval[$segment], $p2_eval[$segment]);
        if ($result > 0) $p1_wins++;
        if ($result < 0) $p2_wins++;
    }

    foreach (['front', 'middle', 'back'] as $segment) {
        $result = compareEvaluatedHands($p1_eval[$segment], $p2_eval[$segment]);
        $winner_eval = $result > 0 ? $p1_eval : $p2_eval;
        $hand_type_name = $winner_eval[$segment]['type']['name'];
        $bonus = SEGMENT_SCORES[$segment][$hand_type_name] ?? 1;
        if ($result > 0) {
            $p1_total_score += $bonus;
        } elseif ($result < 0) {
            $p2_total_score += $bonus;
        }
    }

    if ($p1_wins === 3) {
        $p1_total_score *= 2;
    } elseif ($p2_wins === 3) {
        $p2_total_score *= 2;
    }

    return ['p1_score' => $p1_total_score - $p2_total_score, 'p2_score' => $p2_total_score - $p1_total_score];
}

function calculateResults($gameId) {
    $db = getDbConnection();
    $stmt = $db->prepare('SELECT * FROM player_hands WHERE game_id = ?');
    $stmt->bindValue(1, $gameId, SQLITE3_INTEGER);
    $result = $stmt->execute();

    $playerHands = [];
    while ($row = $result->fetchArray(SQLITE3_ASSOC)) {
        $playerHands[$row['player_id']] = [
            'front' => json_decode($row['hand_front'], true),
            'middle' => json_decode($row['hand_middle'], true),
            'back' => json_decode($row['hand_back'], true)
        ];
    }

    $playerIds = array_keys($playerHands);
    $evaluatedHands = [];
    foreach ($playerHands as $playerId => $hands) {
        $evaluatedHands[$playerId] = [
            'front' => evaluate3CardHand($hands['front']),
            'middle' => evaluate5CardHand($hands['middle']),
            'back' => evaluate5CardHand($hands['back'])
        ];
    }

    $finalScores = array_fill_keys($playerIds, 0);

    for ($i = 0; $i < count($playerIds); $i++) {
        for ($j = $i + 1; $j < count($playerIds); $j++) {
            $p1_id = $playerIds[$i];
            $p2_id = $playerIds[$j];
            $scores = comparePlayerHands($evaluatedHands[$p1_id], $evaluatedHands[$p2_id]);
            $finalScores[$p1_id] += $scores['p1_score'];
            $finalScores[$p2_id] += $scores['p2_score'];
        }
    }

    foreach ($finalScores as $playerId => $score) {
        $stmt = $db->prepare('INSERT INTO player_scores (game_id, player_id, player_name, hand_front, hand_middle, hand_back, score) VALUES (?, ?, ?, ?, ?, ?, ?)');
        $stmt->bindValue(1, $gameId, SQLITE3_INTEGER);
        $stmt->bindValue(2, $playerId, SQLITE3_INTEGER);
        $stmt->bindValue(3, "Player " . $playerId, SQLITE3_TEXT); // Placeholder for player name
        $stmt->bindValue(4, json_encode($playerHands[$playerId]['front']), SQLITE3_TEXT);
        $stmt->bindValue(5, json_encode($playerHands[$playerId]['middle']), SQLITE3_TEXT);
        $stmt->bindValue(6, json_encode($playerHands[$playerId]['back']), SQLITE3_TEXT);
        $stmt->bindValue(7, $score, SQLITE3_INTEGER);
        $stmt->execute();
    }

    return $finalScores;
}
