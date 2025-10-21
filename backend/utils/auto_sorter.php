<?php
// backend/utils/auto_sorter.php

require_once __DIR__ . '/scorer.php';

// Helper function to generate combinations
function combinations($array, $k) {
    $result = [];
    if ($k === 0) {
        $result[] = [];
        return $result;
    }
    if (count($array) < $k) {
        return $result;
    }

    $first = array_shift($array);

    $combinations_with_first = combinations($array, $k - 1);
    foreach ($combinations_with_first as $combination) {
        $result[] = array_merge([$first], $combination);
    }

    $combinations_without_first = combinations($array, $k);
    foreach ($combinations_without_first as $combination) {
        $result[] = $combination;
    }

    return $result;
}

function get_hand_score($hand) {
    // This function provides a rough score for a hand arrangement.
    // A higher score is better.
    $score = 0;
    $score += sssAreaTypeRankPhp(getSssAreaTypePhp($hand['top'], 'head'), 'head');
    $score += sssAreaTypeRankPhp(getSssAreaTypePhp($hand['middle'], 'middle'), 'middle') * 10;
    $score += sssAreaTypeRankPhp(getSssAreaTypePhp($hand['bottom'], 'tail'), 'tail') * 100;
    return $score;
}

function auto_sort_hand($hand) {
    if (count($hand) !== 13) {
        // Not a valid 13-card hand, return a default arrangement
        return [
            'top' => array_slice($hand, 0, 3),
            'middle' => array_slice($hand, 3, 5),
            'bottom' => array_slice($hand, 8, 5)
        ];
    }

    $best_hand = null;
    $best_score = -1;

    // 1. Generate all possible top hands (3 cards)
    $top_combinations = combinations($hand, 3);

    foreach ($top_combinations as $top) {
        $remaining_for_middle_bottom = array_diff($hand, $top);

        // 2. Generate all possible middle hands (5 cards) from the remaining 10
        $middle_combinations = combinations($remaining_for_middle_bottom, 5);

        foreach ($middle_combinations as $middle) {
            // 3. The rest form the bottom hand
            $bottom = array_values(array_diff($remaining_for_middle_bottom, $middle));

            $current_hand = [
                'top' => $top,
                'middle' => $middle,
                'bottom' => $bottom,
            ];

            // 4. Check if the hand is valid (not foul)
            if (!isSssFoulPhp($current_hand)) {
                // 5. Score the hand
                $current_score = get_hand_score($current_hand);

                // 6. If it's the best hand so far, save it
                if ($current_score > $best_score) {
                    $best_score = $current_score;
                    $best_hand = $current_hand;
                }
            }
        }
    }

    // If no valid hand was found (which is highly unlikely), return a default arrangement
    if ($best_hand === null) {
        return [
            'top' => array_slice($hand, 0, 3),
            'middle' => array_slice($hand, 3, 5),
            'bottom' => array_slice($hand, 8, 5)
        ];
    }

    return $best_hand;
}
?>