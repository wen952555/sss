<?php
// backend/utils/sort_hand.php

if (!function_exists('get_combinations')) {
    function get_combinations($array, $k) {
        $results = [];
        $n = count($array);
        if ($k < 0 || $k > $n) {
            return [];
        }
        if ($k == 0) {
            return [[]];
        }
        $first = $array[0];
        $rest = array_slice($array, 1);
        $combinations_without_first = get_combinations($rest, $k);
        $combinations_with_first = [];
        $sub_combinations = get_combinations($rest, $k - 1);
        foreach ($sub_combinations as $sub_combination) {
            $combinations_with_first[] = array_merge([$first], $sub_combination);
        }
        return array_merge($combinations_with_first, $combinations_without_first);
    }
}

$card_ranks = ['2'=>2, '3'=>3, '4'=>4, '5'=>5, '6'=>6, '7'=>7, '8'=>8, '9'=>9, 'T'=>10, 'J'=>11, 'Q'=>12, 'K'=>13, 'A'=>14];

if (!function_exists('get_card_rank')) {
    function get_card_rank($card) {
        global $card_ranks;
        return $card_ranks[substr($card, 1)];
    }
}

if (!function_exists('evaluate_hand')) {
    function evaluate_hand($hand) {
        static $memo = [];
        sort($hand);
        $key = implode(',', $hand);
        if (isset($memo[$key])) return $memo[$key];

        $ranks = array_map('get_card_rank', $hand);
        sort($ranks);
        $suits = array_map(fn($c) => substr($c, 0, 1), $hand);
        $is_flush = count(array_unique($suits)) === 1;

        $is_straight = false;
        $unique_ranks = array_unique($ranks);
        if (count($unique_ranks) === 5) {
            if ($ranks[4] - $ranks[0] === 4) {
                $is_straight = true;
            } elseif ($ranks === [2, 3, 4, 5, 14]) { // Ace-low straight
                $is_straight = true;
                $ranks = [1, 2, 3, 4, 5]; // Treat Ace as low
            }
        }

        $counts = array_count_values($ranks);
        arsort($counts);
        $counts_values = array_values($counts);

        if ($is_straight && $is_flush) return $memo[$key] = [8, $ranks]; // Straight Flush
        if ($counts_values[0] == 4) return $memo[$key] = [7, $ranks]; // Four of a Kind
        if ($counts_values[0] == 3 && $counts_values[1] == 2) return $memo[$key] = [6, $ranks]; // Full House
        if ($is_flush) return $memo[$key] = [5, $ranks]; // Flush
        if ($is_straight) return $memo[$key] = [4, $ranks]; // Straight
        if ($counts_values[0] == 3) return $memo[$key] = [3, $ranks]; // Three of a Kind
        if (count($counts_values) > 1 && $counts_values[0] == 2 && $counts_values[1] == 2) return $memo[$key] = [2, $ranks]; // Two Pair
        if ($counts_values[0] == 2) return $memo[$key] = [1, $ranks]; // One Pair
        return $memo[$key] = [0, $ranks]; // High Card
    }
}

if (!function_exists('evaluate_3_cards')) {
    function evaluate_3_cards($hand) {
        static $memo = [];
        sort($hand);
        $key = implode(',', $hand);
        if (isset($memo[$key])) return $memo[$key];

        $ranks = array_map('get_card_rank', $hand);
        sort($ranks);
        $counts = array_count_values($ranks);
        if (in_array(3, $counts)) return $memo[$key] = [3, $ranks]; // Three of a Kind
        if (in_array(2, $counts)) return $memo[$key] = [1, $ranks]; // One Pair
        return $memo[$key] = [0, $ranks]; // High Card
    }
}

if (!function_exists('compare_hands')) {
    function compare_hands($eval1, $eval2) {
        if ($eval1[0] !== $eval2[0]) {
            return $eval1[0] - $eval2[0];
        }
        $ranks1 = array_reverse($eval1[1]);
        $ranks2 = array_reverse($eval2[1]);
        for ($i = 0; $i < count($ranks1); $i++) {
            if ($ranks1[$i] !== $ranks2[$i]) {
                return $ranks1[$i] - $ranks2[$i];
            }
        }
        return 0;
    }
}

function find_best_arrangement($hand) {
    $all_5_card_combos_back = get_combinations($hand, 5);
    $best_arrangement = null;
    $best_score = -1;

    foreach ($all_5_card_combos_back as $back) {
        $remaining_8 = array_values(array_diff($hand, $back));
        $all_5_card_combos_middle = get_combinations($remaining_8, 5);

        foreach ($all_5_card_combos_middle as $middle) {
            $front = array_values(array_diff($remaining_8, $middle));

            $back_eval = evaluate_hand($back);
            $middle_eval = evaluate_hand($middle);
            $front_eval = evaluate_3_cards($front);

            if (compare_hands($middle_eval, $back_eval) <= 0 && compare_hands($front_eval, $middle_eval) <= 0) {
                $total_score = $back_eval[0] * 10000 + $middle_eval[0] * 100 + $front_eval[0];
                if ($total_score > $best_score) {
                    $best_score = $total_score;
                    $best_arrangement = ['front' => $front, 'middle' => $middle, 'back' => $back];
                }
            }
        }
    }

    return $best_arrangement;
}
