<?php
// backend/api/mahjong_helpers.php

function createMahjongTiles() {
    $tiles = [];
    $suits = ['dots', 'bamboo', 'characters'];
    $honors = ['east', 'south', 'west', 'north', 'red', 'green', 'white'];

    // Create suit tiles (4 of each)
    foreach ($suits as $suit) {
        for ($i = 1; $i <= 9; $i++) {
            for ($j = 0; $j < 4; $j++) {
                // Add a unique ID to each tile for easier handling on the frontend
                $tiles[] = ['id' => "{$suit}_{$i}_{$j}", 'type' => 'suit', 'suit' => $suit, 'rank' => $i, 'name' => "{$suit}_{$i}"];
            }
        }
    }

    // Create honor tiles (4 of each)
    foreach ($honors as $honor) {
        for ($j = 0; $j < 4; $j++) {
            $tiles[] = ['id' => "{$honor}_{$j}", 'type' => 'honor', 'honor' => $honor, 'name' => $honor];
        }
    }

    return $tiles;
}

// More helper functions for Mahjong logic will be added here later.
// For example: checkWin, checkPung, checkChow, etc.

function canPung(array $hand, array $discarded_tile): bool {
    $count = 0;
    foreach ($hand as $tile) {
        if ($tile['name'] === $discarded_tile['name']) {
            $count++;
        }
    }
    return $count >= 2;
}

function findChow(array $hand, array $discarded_tile): ?array {
    if ($discarded_tile['type'] !== 'suit') {
        return null;
    }

    $suit = $discarded_tile['suit'];
    $rank = $discarded_tile['rank'];

    $suit_hand = array_filter($hand, fn($t) => $t['type'] === 'suit' && $t['suit'] === $suit);

    $chows = [];

    $find_tile = function($r) use ($suit_hand) {
        foreach($suit_hand as $tile) {
            if ($tile['rank'] === $r) return $tile;
        }
        return null;
    };

    // Check for [rank-2, rank-1, discard]
    if (($t1 = $find_tile($rank - 2)) && ($t2 = $find_tile($rank - 1))) {
        $chows[] = [$t1, $t2, $discarded_tile];
    }

    // Check for [rank-1, discard, rank+1]
    if (($t1 = $find_tile($rank - 1)) && ($t2 = $find_tile($rank + 1))) {
        $chows[] = [$t1, $discarded_tile, $t2];
    }

    // Check for [discard, rank+1, rank+2]
    if (($t1 = $find_tile($rank + 1)) && ($t2 = $find_tile($rank + 2))) {
        $chows[] = [$discarded_tile, $t1, $t2];
    }

    return !empty($chows) ? $chows : null;
}

function canKong(array $hand, array $discarded_tile): bool {
    $count = 0;
    foreach ($hand as $tile) {
        if ($tile['name'] === $discarded_tile['name']) {
            $count++;
        }
    }
    return $count >= 3;
}

function findConcealedKong(array $hand): ?array {
    $counts = array_count_values(array_column($hand, 'name'));
    foreach ($counts as $name => $count) {
        if ($count === 4) {
            return array_values(array_filter($hand, fn($t) => $t['name'] === $name));
        }
    }
    return null;
}

/**
 * Checks if a hand is a winning hand (basic implementation).
 * A winning hand is 4 sets (pungs/chows) and a pair.
 */
function checkWin(array $hand): bool {
    // A winning hand needs to have a number of tiles that is 2 mod 3 (e.g., 2, 5, 8, 11, 14).
    if (count($hand) % 3 !== 2) {
        return false;
    }

    // Sort by name to make comparisons easier
    usort($hand, fn($a, $b) => $a['name'] <=> $b['name']);

    // Try removing each possible pair and see if the rest can form sets
    $counts = array_count_values(array_column($hand, 'name'));
    $pairs = array_keys(array_filter($counts, fn($c) => $c >= 2));

    foreach ($pairs as $pair_name) {
        $temp_hand = $hand;

        // Create a temporary hand with the pair removed
        $removed_count = 0;
        $hand_without_pair = [];
        foreach ($temp_hand as $tile) {
            if ($tile['name'] === $pair_name && $removed_count < 2) {
                $removed_count++;
            } else {
                $hand_without_pair[] = $tile;
            }
        }

        // Check if the remaining tiles can form sets
        if (canFormAllSets($hand_without_pair)) {
            return true;
        }
    }

    return false;
}

/**
 * A recursive helper function to check if a hand can be entirely formed into sets.
 */
function canFormAllSets(array $hand): bool {
    if (empty($hand)) {
        return true;
    }

    // Important: The hand must be sorted for this to work correctly
    $first_tile = $hand[0];

    // Option 1: Try to form a pung (3 identical tiles)
    if (count($hand) >= 3 && $first_tile['name'] === $hand[1]['name'] && $first_tile['name'] === $hand[2]['name']) {
        if (canFormAllSets(array_slice($hand, 3))) {
            return true;
        }
    }

    // Option 2: Try to form a chow (3 sequential tiles)
    if ($first_tile['type'] === 'suit') {
        $chow_partner1 = null;
        $chow_partner2 = null;
        $remaining_hand = [];
        $found1 = false;
        $found2 = false;

        foreach (array_slice($hand, 1) as $tile) {
            if (!$found1 && $tile['name'] === $first_tile['suit'] . '_' . ($first_tile['rank'] + 1)) {
                $chow_partner1 = $tile;
                $found1 = true;
            } else if (!$found2 && $tile['name'] === $first_tile['suit'] . '_' . ($first_tile['rank'] + 2)) {
                $chow_partner2 = $tile;
                $found2 = true;
            } else {
                $remaining_hand[] = $tile;
            }
        }

        if ($chow_partner1 && $chow_partner2) {
             // Re-assemble the remaining hand without the chosen partners
             $temp_hand = $hand;
             // Remove first tile
             array_shift($temp_hand);
             // Remove partners
             $temp_hand = array_udiff($temp_hand, [$chow_partner1, $chow_partner2], fn($a, $b) => $a['id'] <=> $b['id']);

            if (canFormAllSets($temp_hand)) {
                return true;
            }
        }
    }

    return false;
}
?>
