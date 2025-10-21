<?php
// backend/utils/auto_sorter.php

require_once __DIR__ . '/scorer.php';

// Helper function to generate combinations
function combinations($array, $k) {
    if ($k === 0) {
        return [[]];
    }
    if (count($array) < $k) {
        return [];
    }
    $first = array_shift($array);
    $combs_with_first = combinations($array, $k - 1);
    $result = [];
    foreach ($combs_with_first as $comb) {
        $result[] = array_merge([$first], $comb);
    }
    $result = array_merge($result, combinations($array, $k));
    return $result;
}

// Calculates a score for a given hand arrangement to rank it
function get_hand_score($hand) {
    $score = 0;
    $score += sssAreaTypeRankPhp(getSssAreaTypePhp($hand['top'], 'head'), 'head');
    $score += sssAreaTypeRankPhp(getSssAreaTypePhp($hand['middle'], 'middle'), 'middle') * 10;
    $score += sssAreaTypeRankPhp(getSssAreaTypePhp($hand['bottom'], 'tail'), 'tail') * 100;
    return $score;
}

// Creates a unique signature for a hand arrangement based on ranks only
function get_hand_signature($hand) {
    $get_ranks = function ($cards) {
        global $VALUE_ORDER_PHP;
        $ranks = array_map(function ($c) use ($VALUE_ORDER_PHP) {
            return $VALUE_ORDER_PHP[parseCardPhp($c)['rank']];
        }, $cards);
        sort($ranks);
        return implode(',', $ranks);
    };
    return $get_ranks($hand['top']) . '|' . $get_ranks($hand['middle']) . '|' . $get_ranks($hand['bottom']);
}

// Main function to sort a 13-card hand and get the top 5 arrangements
function auto_sort_hand_get_top_5($hand) {
    if (count($hand) !== 13) {
        return []; // Return empty if not a valid 13-card hand
    }

    $valid_hands = [];
    $seen_signatures = [];

    $top_combinations = combinations($hand, 3);

    foreach ($top_combinations as $top) {
        $remaining_for_middle_bottom = array_values(array_diff($hand, $top));
        $middle_combinations = combinations($remaining_for_middle_bottom, 5);

        foreach ($middle_combinations as $middle) {
            $bottom = array_values(array_diff($remaining_for_middle_bottom, $middle));

            $current_hand = [
                'top' => $top,
                'middle' => $middle,
                'bottom' => $bottom,
            ];

            if (!isSssFoulPhp($current_hand)) {
                $current_score = get_hand_score($current_hand);
                $signature = get_hand_signature($current_hand);

                // Ensure we only store unique arrangements based on ranks
                if (!isset($seen_signatures[$signature])) {
                    $valid_hands[] = [
                        'hand' => $current_hand,
                        'score' => $current_score,
                    ];
                    $seen_signatures[$signature] = true;
                }
            }
        }
    }

    // Sort the valid hands by score in descending order
    usort($valid_hands, function ($a, $b) {
        return $b['score'] - $a['score'];
    });

    // Return the top 5
    return array_slice($valid_hands, 0, 5);
}

// Keep the old function signature for compatibility if needed, but adapt it.
function auto_sort_hand($hand) {
    $top_5 = auto_sort_hand_get_top_5($hand);
    if (empty($top_5)) {
        return [
            'top' => array_slice($hand, 0, 3),
            'middle' => array_slice($hand, 3, 5),
            'bottom' => array_slice($hand, 8, 5)
        ];
    }
    return $top_5[0]['hand']; // Return the best hand
}
?>
