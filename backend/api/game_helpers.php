<?php
// backend/api/game_helpers.php

/**
 * Analyzes a set of cards to determine the combination type.
 *
 * @param array $cards The cards to analyze.
 * @return array An object describing the combination (e.g., {type: 'pair', rank: 10, high_card: {...}}) or {type: 'invalid'}.
 */
function analyzeCombination(array $cards) {
    $count = count($cards);
    if ($count === 0) {
        return ['type' => 'invalid', 'reason' => 'No cards played.'];
    }

    // Sort cards by value then suit to make analysis easier.
    // This is crucial for consistently identifying the high card and checking sequences.
    usort($cards, function($a, $b) {
        if ($a['value'] === $b['value']) {
            return $a['suit_value'] <=> $b['suit_value'];
        }
        return $a['value'] <=> $b['value'];
    });

    $high_card = end($cards); // The highest card is the last one after sorting.

    // --- Check for basic combinations ---

    // Single
    if ($count === 1) {
        return ['type' => 'single', 'rank' => $high_card['value'], 'high_card' => $high_card];
    }

    // Pair
    if ($count === 2) {
        if ($cards[0]['value'] === $cards[1]['value']) {
            return ['type' => 'pair', 'rank' => $high_card['value'], 'high_card' => $high_card];
        }
    }

    // Triple
    if ($count === 3) {
        if ($cards[0]['value'] === $cards[1]['value'] && $cards[1]['value'] === $cards[2]['value']) {
            return ['type' => 'triple', 'rank' => $high_card['value'], 'high_card' => $high_card];
        }
    }

    // Four of a Kind (Bomb)
    if ($count === 4) {
        if ($cards[0]['value'] === $cards[1]['value'] && $cards[1]['value'] === $cards[2]['value'] && $cards[2]['value'] === $cards[3]['value']) {
            return ['type' => 'four_of_a_kind', 'rank' => $high_card['value'], 'high_card' => $high_card];
        }
    }

    // --- Check for sequences (straights) ---
    // Note: 2s cannot be part of a straight.
    if ($count >= 3 && $high_card['rank'] !== '2') {
        $is_straight = true;
        for ($i = 0; $i < $count - 1; $i++) {
            // Check if the next card's value is one greater than the current one.
            if ($cards[$i+1]['value'] !== $cards[$i]['value'] + 1) {
                $is_straight = false;
                break;
            }
        }
        if ($is_straight) {
            return ['type' => 'straight', 'rank' => $high_card['value'], 'high_card' => $high_card, 'length' => $count];
        }
    }

    // --- Check for double sequences (double straights) ---
    // Must be at least 3 pairs (6 cards)
    if ($count >= 6 && $count % 2 === 0 && $high_card['rank'] !== '2') {
        $is_double_straight = true;
        // Check if all cards form pairs
        for ($i = 0; $i < $count; $i += 2) {
            if ($cards[$i]['value'] !== $cards[$i+1]['value']) {
                $is_double_straight = false;
                break;
            }
        }
        // Check if the pairs are sequential
        if ($is_double_straight) {
            for ($i = 0; $i < $count - 2; $i += 2) {
                if ($cards[$i+2]['value'] !== $cards[$i]['value'] + 1) {
                    $is_double_straight = false;
                    break;
                }
            }
        }

        if ($is_double_straight) {
            return ['type' => 'double_straight', 'rank' => $high_card['value'], 'high_card' => $high_card, 'length' => $count / 2];
        }
    }

    return ['type' => 'invalid', 'reason' => 'The selected cards do not form a valid combination.'];
}

?>
