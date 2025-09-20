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
 * A very simplified placeholder for evaluating a 5-card hand.
 * A real implementation would be much more complex.
 */
function evaluate_5_card_hand(array $hand) {
    // This is not a real evaluation, just a placeholder.
    // It will be improved later.
    $values = array_column($hand, 'value');
    $counts = array_count_values($values);

    if (in_array(4, $counts)) return ['rank' => TW_HAND_RANK_FOUR_OF_A_KIND, 'values' => $values];
    if (in_array(3, $counts) && in_array(2, $counts)) return ['rank' => TW_HAND_RANK_FULL_HOUSE, 'values' => $values];
    if (in_array(3, $counts)) return ['rank' => TW_HAND_RANK_THREE_OF_A_KIND, 'values' => $values];
    if (count(array_filter($counts, fn($c) => $c === 2)) === 2) return ['rank' => TW_HAND_RANK_TWO_PAIR, 'values' => $values];
    if (in_array(2, $counts)) return ['rank' => TW_HAND_RANK_PAIR, 'values' => $values];

    return ['rank' => TW_HAND_RANK_HIGH_CARD, 'values' => $values];
}

/**
 * A placeholder for evaluating the 3-card front hand.
 */
function evaluate_3_card_hand(array $hand) {
    $values = array_column($hand, 'value');
    $counts = array_count_values($values);

    if (in_array(3, $counts)) return ['rank' => TW_FRONT_HAND_RANK_THREE_OF_A_KIND, 'values' => $values];
    if (in_array(2, $counts)) return ['rank' => TW_FRONT_HAND_RANK_PAIR, 'values' => $values];

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

    // Tie-breaking logic would go here. For now, we'll call it a draw.
    // A real implementation would compare the ranks of the pairs, trios, etc.
    return 0;
}
?>
