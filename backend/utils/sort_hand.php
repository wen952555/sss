<?php
// backend/utils/sort_hand.php

if (!function_exists('check_for_dragon')) {
    function check_for_dragon($hand) {
        $ranks = array_map('get_card_rank', $hand);
        $unique_ranks = array_unique($ranks);
        sort($unique_ranks);

        if (count($unique_ranks) === 13 && $unique_ranks[12] - $unique_ranks[0] === 12) {
            usort($hand, fn($a, $b) => get_card_rank($a) - get_card_rank($b));
            return ['front' => array_slice($hand, 0, 3), 'middle' => array_slice($hand, 3, 5), 'back' => array_slice($hand, 8, 5)];
        }
        return null;
    }
}

if (!function_exists('check_for_three_flushes')) {
    function check_for_three_flushes($hand) {
        $suits = array_map(fn($c) => substr($c, 0, 1), $hand);
        $suit_counts = array_count_values($suits);

        if (in_array(3, $suit_counts) && in_array(5, $suit_counts)) {
            $flush3_suit = array_search(3, $suit_counts);
            $flush5_suit = array_search(5, $suit_counts);

            if ($flush3_suit && $flush5_suit) {
                $front = array_filter($hand, fn($c) => substr($c, 0, 1) === $flush3_suit);
                $middle = array_filter($hand, fn($c) => substr($c, 0, 1) === $flush5_suit);
                $back = array_values(array_diff($hand, $front, $middle));

                usort($front, fn($a, $b) => get_card_rank($a) - get_card_rank($b));
                usort($middle, fn($a, $b) => get_card_rank($a) - get_card_rank($b));
                usort($back, fn($a, $b) => get_card_rank($a) - get_card_rank($b));

                return ['front' => $front, 'middle' => $middle, 'back' => $back];
            }
        }
        return null;
    }
}

if (!function_exists('check_for_six_and_a_half_pairs')) {
    function check_for_six_and_a_half_pairs($hand) {
        $ranks = array_map('get_card_rank', $hand);
        $counts = array_count_values($ranks);
        $pairs = 0;
        foreach ($counts as $count) {
            if ($count === 2) {
                $pairs++;
            }
        }

        if ($pairs === 6) {
            $single_rank = array_search(1, $counts);
            $single = null;
            $pairs = [];
            foreach ($hand as $card) {
                if (get_card_rank($card) === $single_rank) {
                    $single = $card;
                } else {
                    $pairs[] = $card;
                }
            }
            usort($pairs, fn($a, $b) => get_card_rank($a) - get_card_rank($b));
            return ['front' => [$single, $pairs[0], $pairs[1]], 'middle' => array_slice($pairs, 2, 5), 'back' => array_slice($pairs, 7, 5)];
        }
        return null;
    }
}

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
        if (strpos($card, '_of_') !== false) {
            $parts = explode('_of_', $card);
            return $card_ranks[strtoupper(substr($parts[0], 0, 1))];
        }
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
    if ($dragon = check_for_dragon($hand)) {
        return $dragon;
    }
    if ($six_and_a_half_pairs = check_for_six_and_a_half_pairs($hand)) {
        return $six_and_a_half_pairs;
    }
    if ($three_flushes = check_for_three_flushes($hand)) {
        return $three_flushes;
    }

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
