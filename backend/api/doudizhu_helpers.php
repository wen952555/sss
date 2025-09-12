<?php
// backend/api/doudizhu_helpers.php

/**
 * A simple AI to determine what to bid.
 * (Code from previous step)
 */
function getDoudizhuAiBid(array $hand) {
    $jokers = 0;
    $twos = 0;
    foreach ($hand as $card) {
        if ($card['rank'] === 'joker') $jokers++;
        if ($card['rank'] === '2') $twos++;
    }
    if ($jokers === 2) return 3;
    if ($twos >= 3 && $jokers === 1) return 3;
    if ($twos === 4) return 3;
    if ($twos >= 2 && $jokers === 1) return 2;
    if ($twos === 3) return 2;
    if ($jokers === 1 || $twos >= 2) return 1;
    return 0;
}

/**
 * Creates a standard 54-card deck for Dou Di Zhu.
 * (Code from previous step)
 */
function createDoudizhuDeck() {
    $ranks = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];
    $suits = ['spades', 'clubs', 'diamonds', 'hearts'];
    $rank_values = array_flip($ranks);
    $deck = [];
    foreach ($suits as $suit) {
        foreach ($ranks as $rank) {
            $deck[] = ['rank' => $rank, 'suit' => $suit, 'value' => $rank_values[$rank], 'name' => "{$rank}_of_{$suit}"];
        }
    }
    $deck[] = ['rank' => 'joker', 'suit' => 'black', 'value' => 13, 'name' => 'black_joker'];
    $deck[] = ['rank' => 'joker', 'suit' => 'red', 'value' => 14, 'name' => 'red_joker'];
    return $deck;
}

/**
 * Analyzes a combination of cards according to Dou Di Zhu rules.
 * This is a complex function that needs to identify many hand types.
 */
function analyzeDoudizhuCombination(array $cards) {
    $count = count($cards);
    if ($count === 0) return ['type' => 'invalid'];

    // Sort cards by value to make analysis easier
    usort($cards, fn($a, $b) => $a['value'] <=> $b['value']);
    $high_card = end($cards);

    // --- Trivial cases ---
    if ($count === 1) return ['type' => 'single', 'rank' => $high_card['value']];
    if ($count === 2 && $cards[0]['rank'] === 'joker' && $cards[1]['rank'] === 'joker') return ['type' => 'rocket', 'rank' => 15];

    // --- Count ranks to identify pairs, trios, bombs ---
    $counts = array_count_values(array_column($cards, 'value'));
    $ranks_by_count = [];
    foreach ($counts as $value => $num) {
        $ranks_by_count[$num][] = $value;
    }

    // --- Check for simple, non-kicker hands ---
    if (isset($ranks_by_count[4])) return ['type' => 'bomb', 'rank' => $ranks_by_count[4][0]];
    if (isset($ranks_by_count[3]) && $count === 3) return ['type' => 'trio', 'rank' => $ranks_by_count[3][0]];
    if (isset($ranks_by_count[2]) && $count === 2) return ['type' => 'pair', 'rank' => $ranks_by_count[2][0]];

    // --- Check for hands with kickers ---
    if (isset($ranks_by_count[3]) && $count === 4) return ['type' => 'trio_with_single', 'rank' => $ranks_by_count[3][0]];
    if (isset($ranks_by_count[3]) && isset($ranks_by_count[2]) && $count === 5) return ['type' => 'trio_with_pair', 'rank' => $ranks_by_count[3][0]];
    if (isset($ranks_by_count[4]) && $count === 6 && isset($ranks_by_count[1]) && count($ranks_by_count[1]) === 2) return ['type' => 'four_with_two_singles', 'rank' => $ranks_by_count[4][0]];
    if (isset($ranks_by_count[4]) && $count === 8 && isset($ranks_by_count[2]) && count($ranks_by_count[2]) === 2) return ['type' => 'four_with_two_pairs', 'rank' => $ranks_by_count[4][0]];

    // --- Check for straights and airplanes ---
    $is_consecutive = fn($arr) => {
        for ($i = 0; $i < count($arr) - 1; $i++) {
            if ($arr[$i+1] !== $arr[$i] + 1) return false;
        }
        return true;
    };

    // Straight (5+ cards, all singles)
    if ($count >= 5 && isset($ranks_by_count[1]) && count($ranks_by_count[1]) === $count) {
        $values = array_keys($counts);
        sort($values);
        if ($is_consecutive($values) && max($values) < 13) { // 2 cannot be in a straight
            return ['type' => 'straight', 'rank' => max($values), 'length' => $count];
        }
    }

    // Consecutive Pairs (3+ pairs)
    if ($count >= 6 && $count % 2 === 0 && isset($ranks_by_count[2]) && count($ranks_by_count[2]) === $count / 2) {
        $values = array_keys($counts);
        sort($values);
        if ($is_consecutive($values) && max($values) < 13) {
            return ['type' => 'consecutive_pairs', 'rank' => max($values), 'length' => $count / 2];
        }
    }

    // Airplane (2+ trios)
    if ($count >= 6 && $count % 3 === 0 && isset($ranks_by_count[3]) && count($ranks_by_count[3]) === $count / 3) {
        $values = array_keys($counts);
        sort($values);
        if ($is_consecutive($values) && max($values) < 13) {
            return ['type' => 'airplane', 'rank' => max($values), 'length' => $count / 3];
        }
    }

    // Airplane with kickers
    if ($count >= 8 && isset($ranks_by_count[3])) {
        $trio_values = $ranks_by_count[3];
        sort($trio_values);
        if ($is_consecutive($trio_values) && max($trio_values) < 13) {
            $num_trios = count($trio_values);
            // Airplane with single kickers
            if (isset($ranks_by_count[1]) && count($ranks_by_count[1]) === $num_trios && $count === $num_trios * 4) {
                return ['type' => 'airplane_with_singles', 'rank' => max($trio_values), 'length' => $num_trios];
            }
            // Airplane with pair kickers
            if (isset($ranks_by_count[2]) && count($ranks_by_count[2]) === $num_trios && $count === $num_trios * 5) {
                return ['type' => 'airplane_with_pairs', 'rank' => max($trio_values), 'length' => $num_trios];
            }
        }
    }

    return ['type' => 'invalid'];
}

/**
 * Checks if a play is a valid counter to the last play in Dou Di Zhu.
 */
function isValidDoudizhuMove(array $play, array $last_play): bool {
    // Rocket (Joker pair) beats anything.
    if ($play['type'] === 'rocket') {
        return true;
    }

    // If the last play was a rocket, nothing can beat it.
    if ($last_play['type'] === 'rocket') {
        return false;
    }

    // A bomb can beat any non-bomb, non-rocket hand.
    if ($play['type'] === 'bomb' && $last_play['type'] !== 'bomb') {
        return true;
    }

    // If both are bombs, the higher rank wins.
    if ($play['type'] === 'bomb' && $last_play['type'] === 'bomb') {
        return $play['rank'] > $last_play['rank'];
    }

    // For all other plays, the type and length (for straights/airplanes) must match.
    if ($play['type'] !== $last_play['type']) {
        return false;
    }
    if (isset($play['length']) && (!isset($last_play['length']) || $play['length'] !== $last_play['length'])) {
        return false;
    }

    // The rank of the new play must be higher.
    return $play['rank'] > $last_play['rank'];
}


/**
 * A simple AI to find a valid move in Dou Di Zhu.
 */
function findBestDoudizhuMove($ai_hand, $last_play_cards) {
    // This is a placeholder for a much more complex AI.
    // A real AI would generate all possible valid plays and choose the best one.
    // For now, we will use a very simple "greedy" algorithm.

    // If AI is leading, play the lowest single card.
    if (empty($last_play_cards)) {
        usort($ai_hand, fn($a, $b) => $a['value'] <=> $b['value']);
        return ['action' => 'play', 'cards' => [$ai_hand[0]]];
    }

    // For now, if following, the simple AI will just pass.
    // A real implementation would need to find a valid counter-play.
    return ['action' => 'pass'];
}
?>
