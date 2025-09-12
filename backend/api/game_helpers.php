<?php
// backend/api/game_helpers.php

/**
 * Analyzes a set of cards to determine the combination type.
 * (This function is from the previous step)
 */
function analyzeCombination(array $cards) {
    $count = count($cards);
    if ($count === 0) return ['type' => 'invalid', 'reason' => 'No cards played.'];
    usort($cards, fn($a, $b) => ($a['value'] === $b['value']) ? $a['suit_value'] <=> $b['suit_value'] : $a['value'] <=> $b['value']);
    $high_card = end($cards);

    if ($count === 1) return ['type' => 'single', 'rank' => $high_card['value'], 'high_card' => $high_card];
    if ($count === 2 && $cards[0]['value'] === $cards[1]['value']) return ['type' => 'pair', 'rank' => $high_card['value'], 'high_card' => $high_card];
    if ($count === 3 && $cards[0]['value'] === $cards[1]['value'] && $cards[1]['value'] === $cards[2]['value']) return ['type' => 'triple', 'rank' => $high_card['value'], 'high_card' => $high_card];
    if ($count === 4 && $cards[0]['value'] === $cards[1]['value'] && $cards[1]['value'] === $cards[2]['value'] && $cards[2]['value'] === $cards[3]['value']) return ['type' => 'four_of_a_kind', 'rank' => $high_card['value'], 'high_card' => $high_card];

    if ($count >= 5 && $high_card['rank'] !== '2') { // Straights must be 5+ cards in this version of rules
        $is_straight = true;
        for ($i = 0; $i < $count - 1; $i++) {
            if ($cards[$i+1]['value'] !== $cards[$i]['value'] + 1) { $is_straight = false; break; }
        }
        if ($is_straight) return ['type' => 'straight', 'rank' => $high_card['value'], 'high_card' => $high_card, 'length' => $count];
    }
    return ['type' => 'invalid', 'reason' => 'The selected cards do not form a valid combination.'];
}

/**
 * Finds all possible plays of a certain type from a hand.
 */
function findPlays($hand, $type, $length = 0) {
    $plays = [];
    $counts = array_count_values(array_column($hand, 'rank'));

    if ($type === 'single') {
        return array_map(fn($c) => [$c], $hand);
    }
    if ($type === 'pair') {
        foreach ($counts as $rank => $count) {
            if ($count >= 2) {
                $cards_of_rank = array_filter($hand, fn($c) => $c['rank'] === $rank);
                $plays[] = array_slice($cards_of_rank, 0, 2);
            }
        }
    }
    // Simplified: For now, AI will only play singles and pairs to keep it simple.
    // Straights and other combos can be added later.
    return $plays;
}

/**
 * A simple AI to find a valid move.
 *
 * @param array $ai_hand The AI player's hand.
 * @param array|null $last_play The last play made on the table.
 * @return array An array describing the move, e.g., ['action' => 'play', 'cards' => [...]].
 */
function findBestAiMove($ai_hand, $last_play) {
    // Sort AI hand to make decisions easier (lowest to highest)
    usort($ai_hand, fn($a, $b) => ($a['value'] === $b['value']) ? $a['suit_value'] <=> $b['suit_value'] : $a['value'] <=> $b['value']);

    // If AI is leading the trick, play the lowest single card.
    if (!$last_play) {
        return ['action' => 'play', 'cards' => [$ai_hand[0]]];
    }

    $last_combo = analyzeCombination($last_play['cards']);

    // --- Simple AI: Only considers playing singles or pairs ---

    // 1. Try to find a play of the same type
    $possible_plays = findPlays($ai_hand, $last_combo['type']);

    foreach ($possible_plays as $play) {
        $play_combo = analyzeCombination($play);
        // Check if this play beats the last one
        if ($play_combo['rank'] > $last_combo['rank'] || ($play_combo['rank'] === $last_combo['rank'] && $play_combo['high_card']['suit_value'] > $last_combo['high_card']['suit_value'])) {
             // Found the first (and lowest) possible move, play it.
            return ['action' => 'play', 'cards' => $play];
        }
    }

    // 2. TODO: Add logic to check for bombs (4-of-a-kind) if the last play was a 2.

    // 3. If no valid move is found, pass.
    return ['action' => 'pass'];
}
?>
