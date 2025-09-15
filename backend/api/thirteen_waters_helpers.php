<?php
// backend/api/thirteen_waters_helpers.php

// Hand ranks for 5-card hands (higher is better)
define('TW_HAND_RANK_HIGH_CARD', 1);
define('TW_HAND_RANK_PAIR', 2);
define('TW_HAND_RANK_TWO_PAIR', 3);
define('TW_HAND_RANK_THREE_OF_A_KIND', 4);
define('TW_HAND_RANK_STRAIGHT', 5);
define('TW_HAND_RANK_FLUSH', 6);
define('TW_HAND_RANK_FULL_HOUSE', 7);
define('TW_HAND_RANK_FOUR_OF_A_KIND', 8);
define('TW_HAND_RANK_STRAIGHT_FLUSH', 9);

// Hand ranks for 3-card front hand
define('TW_FRONT_HAND_RANK_HIGH_CARD', 1);
define('TW_FRONT_HAND_RANK_PAIR', 2);
define('TW_FRONT_HAND_RANK_THREE_OF_A_KIND', 3);

/**
 * Evaluates a 5-card hand to determine its rank and tie-breaking values.
 *
 * @param array $hand An array of 5 card objects.
 * @return array An array containing the hand's rank and an array of values for tie-breaking.
 */
function evaluate_5_card_hand(array $hand) {
    usort($hand, fn($a, $b) => $b['value'] <=> $a['value']);
    $values = array_column($hand, 'value');
    $suits = array_column($hand, 'suit');
    $counts = array_count_values($values);
    arsort($counts);

    $is_flush = count(array_unique($suits)) === 1;

    $is_straight = false;
    $unique_values = array_unique($values);
    if (count($unique_values) === 5) {
        $is_straight = (max($values) - min($values) === 4);
        // Special case for A-2-3-4-5 straight (Ace-low)
        if (!$is_straight) {
            $ace_low_straight_values = [12, 3, 2, 1, 0]; // A, 5, 4, 3, 2
            if (empty(array_diff($unique_values, $ace_low_straight_values))) {
                $is_straight = true;
                // For tie-breaking, the high card is the 5
                $values = [3, 2, 1, 0, -1]; // 5, 4, 3, 2, A
            }
        }
    }

    if ($is_straight && $is_flush) {
        return ['rank' => TW_HAND_RANK_STRAIGHT_FLUSH, 'values' => $values];
    }

    $rank_keys = array_keys($counts);

    if ($counts[$rank_keys[0]] === 4) {
        $kickers = array_values(array_diff($values, $rank_keys));
        return ['rank' => TW_HAND_RANK_FOUR_OF_A_KIND, 'values' => array_merge($rank_keys, $kickers)];
    }

    if ($counts[$rank_keys[0]] === 3 && $counts[$rank_keys[1]] === 2) {
        return ['rank' => TW_HAND_RANK_FULL_HOUSE, 'values' => $rank_keys];
    }

    if ($is_flush) {
        return ['rank' => TW_HAND_RANK_FLUSH, 'values' => $values];
    }

    if ($is_straight) {
        return ['rank' => TW_HAND_RANK_STRAIGHT, 'values' => $values];
    }

    if ($counts[$rank_keys[0]] === 3) {
        $kickers = array_values(array_diff($values, $rank_keys));
        return ['rank' => TW_HAND_RANK_THREE_OF_A_KIND, 'values' => array_merge($rank_keys, $kickers)];
    }

    if ($counts[$rank_keys[0]] === 2 && $counts[$rank_keys[1]] === 2) {
        $pairs = array_slice($rank_keys, 0, 2);
        $kickers = array_values(array_diff($values, $pairs));
        return ['rank' => TW_HAND_RANK_TWO_PAIR, 'values' => array_merge($pairs, $kickers)];
    }

    if ($counts[$rank_keys[0]] === 2) {
        $pair = array_slice($rank_keys, 0, 1);
        $kickers = array_values(array_diff($values, $pair));
        return ['rank' => TW_HAND_RANK_PAIR, 'values' => array_merge($pair, $kickers)];
    }

    return ['rank' => TW_HAND_RANK_HIGH_CARD, 'values' => $values];
}

/**
 * Evaluates a 3-card hand for the front position.
 *
 * @param array $hand An array of 3 card objects.
 * @return array An array containing the hand's rank and tie-breaking values.
 */
function evaluate_3_card_hand(array $hand) {
    usort($hand, fn($a, $b) => $b['value'] <=> $a['value']);
    $values = array_column($hand, 'value');
    $counts = array_count_values($values);
    arsort($counts);

    $rank_keys = array_keys($counts);

    if ($counts[$rank_keys[0]] === 3) {
        return ['rank' => TW_FRONT_HAND_RANK_THREE_OF_A_KIND, 'values' => $rank_keys];
    }

    if ($counts[$rank_keys[0]] === 2) {
        $pair = array_slice($rank_keys, 0, 1);
        $kickers = array_values(array_diff($values, $pair));
        return ['rank' => TW_FRONT_HAND_RANK_PAIR, 'values' => array_merge($pair, $kickers)];
    }

    return ['rank' => TW_FRONT_HAND_RANK_HIGH_CARD, 'values' => $values];
}


/**
 * Compares two evaluated hands.
 * Returns > 0 if hand1 is better, < 0 if hand2 is better, 0 if they are equal.
 */
function compare_evaluated_hands($hand1_eval, $hand2_eval) {
    if ($hand1_eval['rank'] !== $hand2_eval['rank']) {
        return $hand1_eval['rank'] - $hand2_eval['rank'];
    }

    // Tie-breaking logic by comparing card values from highest to lowest.
    for ($i = 0; $i < count($hand1_eval['values']); $i++) {
        if ($hand1_eval['values'][$i] !== $hand2_eval['values'][$i]) {
            return $hand1_eval['values'][$i] - $hand2_eval['values'][$i];
        }
    }

    return 0; // Hands are identical
}

/**
 * Checks if a 13-card hand is a "Dragon" (a 13-card straight).
 *
 * @param array $hand A 13-card hand.
 * @return bool True if the hand is a Dragon, false otherwise.
 */
function check_for_dragon(array $hand): bool {
    if (count($hand) !== 13) {
        return false;
    }
    $values = array_column($hand, 'value');
    $unique_values = array_unique($values);
    // A-K straight are values 0 through 12.
    return count($unique_values) === 13;
}
?>
