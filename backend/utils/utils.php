<?php
// require scorer functions for auto-sorter
require_once __DIR__ . '/scorer.php';

// --- Auto-sorter helper functions (NEW FAST VERSION) ---

/**
 * Generates all combinations of a specific size from an array.
 * @param array $array The source array.
 * @param int $k The size of each combination.
 * @return array An array of combinations.
 */
function combinations($array, $k) {
    if ($k == 0) {
        return [[]];
    }
    if (count($array) == $k) {
        return [$array];
    }
    $first = array_shift($array);
    $combos1 = combinations($array, $k - 1);
    foreach ($combos1 as &$combo) {
        array_unshift($combo, $first);
    }
    $combos2 = combinations($array, $k);
    return array_merge($combos1, $combos2);
}

/**
 * Converts card objects to the string format used by the scorer.
 * @param array $cards Array of card objects [['rank' => ..., 'suit' => ...]].
 * @return array Array of card strings ['rank_of_suit'].
 */
function format_cards_to_strings($cards) {
    if (empty($cards)) return [];
    $strings = [];
    foreach ($cards as $card) {
        $strings[] = $card['rank'] . '_of_' . $card['suit'];
    }
    return $strings;
}

/**
 * Converts a whole hand (top, middle, bottom) to strings.
 */
function format_hand_to_strings($hand) {
    return [
        'top' => format_cards_to_strings($hand['top']),
        'middle' => format_cards_to_strings($hand['middle']),
        'bottom' => format_cards_to_strings($hand['bottom']),
    ];
}

/**
 * Finds the best possible hand of a given size from a set of cards.
 * @param array $cards An array of card objects.
 * @param int $num The number of cards in the hand.
 * @return array The best hand found (array of card objects).
 */
function findBestHand($cards, $num) {
    $bestHand = null;
    $bestRank = -1;

    if (count($cards) < $num) return null;

    $card_combinations = combinations($cards, $num);

    foreach ($card_combinations as $combo) {
        $combo_strings = format_cards_to_strings($combo);
        // Use 'tail' as the area for rank calculation, as it has the most diverse hand types
        $type = getSssAreaType($combo_strings, 'tail');
        $rank = sssAreaTypeRank($type, 'tail');

        if ($rank > $bestRank) {
            $bestRank = $rank;
            $bestHand = $combo;
        } elseif ($rank === $bestRank) {
            if ($bestHand === null) {
                 $bestHand = $combo;
            } else {
                 $cmp = compareSssArea(format_cards_to_strings($combo), format_cards_to_strings($bestHand), 'tail');
                 if ($cmp > 0) {
                     $bestHand = $combo;
                 }
            }
        }
    }
    return $bestHand;
}


/**
 * A fast, greedy algorithm to find a valid, non-foul hand arrangement.
 */
function getSmartSortedHand_php($allCards, $strategy = 'bottom') {
    if (!$allCards || count($allCards) !== 13) return null;

    // --- Greedy Strategy ---
    // 1. Find the best possible 5-card hand for the bottom.
    $bottom = findBestHand($allCards, 5);
    $remaining = array_udiff($allCards, $bottom, function ($a, $b) {
        return strcmp($a['rank'].$a['suit'], $b['rank'].$b['suit']);
    });
    $remaining = array_values($remaining);

    // 2. From the rest, find the best 5-card hand for the middle.
    $middle = findBestHand($remaining, 5);
    $top = array_udiff($remaining, $middle, function ($a, $b) {
        return strcmp($a['rank'].$a['suit'], $b['rank'].$b['suit']);
    });
    $top = array_values($top);

    $hand = ['top' => $top, 'middle' => $middle, 'bottom' => $bottom];

    // 3. Check if the arrangement is a foul. If so, try a safer arrangement.
    if (isSssFoul(format_hand_to_strings($hand))) {
        // Fallback: Find best 3-card hand for top, which is less likely to cause a foul.
        $top_alt = findBestHand($remaining, 3);
        $middle_alt = array_udiff($remaining, $top_alt, function ($a, $b) {
             return strcmp($a['rank'].$a['suit'], $b['rank'].$b['suit']);
        });
        $middle_alt = array_values($middle_alt);
        $hand = ['top' => $top_alt, 'middle' => $middle_alt, 'bottom' => $bottom];
    }

    // Final check: if still a foul, resort to the simplest possible sort.
    if (isSssFoul(format_hand_to_strings($hand))) {
        $ranks_map = VALUE_ORDER;
        usort($allCards, function ($a, $b) use ($ranks_map) {
            return $ranks_map[$b['rank']] - $ranks_map[$a['rank']];
        });
        $hand = [
            'bottom' => array_slice($allCards, 0, 5),
            'middle' => array_slice($allCards, 5, 5),
            'top' => array_slice($allCards, 10, 3),
        ];
    }

    // Sort cards within lanes for consistent display
    $ranks_map = VALUE_ORDER;
    $sort_fn = function($a, $b) use ($ranks_map) {
        return $ranks_map[$b['rank']] - $ranks_map[$a['rank']];
    };
    usort($hand['top'], $sort_fn);
    usort($hand['middle'], $sort_fn);
    usort($hand['bottom'], $sort_fn);

    return $hand;
}


// --- Main Helper Functions ---
function dealCards($conn, $roomId, $playerCount) {
    $ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king', 'ace'];
    $suits = ['spades', 'hearts', 'clubs', 'diamonds'];
    $deck = [];
    foreach ($suits as $suit) {
        foreach ($ranks as $rank) {
            $deck[] = ['rank' => $rank, 'suit' => $suit];
        }
    }
    shuffle($deck);
    $cards_per_player = 13;
    $all_hands = [];
    for ($i = 0; $i < $playerCount; $i++) {
        $hand = array_slice($deck, $i * $cards_per_player, $cards_per_player);
        // Use the new smart sorter to get a valid, pre-arranged hand
        $all_hands[$i] = getSmartSortedHand_php($hand, 'bottom');
    }

    // Deal hands to players
    $stmt = $conn->prepare("SELECT user_id FROM room_players WHERE room_id=? ORDER BY id ASC");
    $stmt->bind_param("i", $roomId);
    $stmt->execute();
    $playerIdsResult = $stmt->get_result();
    $i = 0;
    while ($row = $playerIdsResult->fetch_assoc()) {
        $handJson = json_encode($all_hands[$i++]);
        $updateStmt = $conn->prepare("UPDATE room_players SET initial_hand=? WHERE room_id=? AND user_id=?");
        $updateStmt->bind_param("sii", $handJson, $roomId, $row['user_id']);
        $updateStmt->execute();
        $updateStmt->close();
    }
    $stmt->close();

    // Update room status
    $stmt = $conn->prepare("UPDATE game_rooms SET status='arranging' WHERE id=?");
    $stmt->bind_param("i", $roomId);
    $stmt->execute();
    $stmt->close();
}

function fillWithAI($conn, $roomId, $gameType, $playersNeeded) {
    $stmt = $conn->prepare("SELECT COUNT(*) as current_players FROM room_players WHERE room_id=?");
    $stmt->bind_param("i", $roomId);
    $stmt->execute();
    $currentPlayers = $stmt->get_result()->fetch_assoc()['current_players'];
    $stmt->close();

    $aiToCreate = $playersNeeded - $currentPlayers;
    if ($aiToCreate <= 0) return;

    for ($i = 1; $i <= $aiToCreate; $i++) {
        $aiPhone = "ai_player_" . $i;
        $aiId = null;

        $stmt = $conn->prepare("SELECT id FROM users WHERE phone = ?");
        $stmt->bind_param("s", $aiPhone);
        $stmt->execute();
        $result = $stmt->get_result();
        if ($row = $result->fetch_assoc()) {
            $aiId = $row['id'];
        }
        $stmt->close();

        if (!$aiId) {
            $insertStmt = $conn->prepare("INSERT INTO users (phone, password, points) VALUES (?, '', 1000)");
            $insertStmt->bind_param("s", $aiPhone);
            $insertStmt->execute();
            $aiId = $insertStmt->insert_id;
            $insertStmt->close();
        }

        if ($aiId) {
            $stmt = $conn->prepare("INSERT INTO room_players (room_id, user_id, is_ready, is_auto_managed) VALUES (?, ?, 1, 1)");
            $stmt->bind_param("ii", $roomId, $aiId);
            $stmt->execute();
            $stmt->close();
        }
    }
}
?>
