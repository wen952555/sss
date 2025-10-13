<?php
// backend/utils/pre_dealer.php

require_once __DIR__ . '/../api/db_connect.php';

// --- Constants for Hand Replenishment ---
define('TARGET_STOCK', 10);
define('REPLENISH_THRESHOLD', 3);

/**
 * Returns the appropriate deck of cards based on the number of players.
 *
 * @param int $playerCount The number of players.
 * @return array The deck of cards.
 */
function get_deck_for_players($playerCount) {
    $ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king', 'ace'];
    $standard_suits = ['spades', 'hearts', 'clubs', 'diamonds'];
    $extra_suits = ['stars', 'moons', 'suns'];

    $deck = [];

    if ($playerCount === 8) {
        // For 8 players, use two standard decks.
        foreach ($standard_suits as $suit) {
            foreach ($ranks as $rank) {
                $deck[] = ['rank' => $rank, 'suit' => $suit];
                $deck[] = ['rank' => $rank, 'suit' => $suit];
            }
        }
    } else {
        // For 4-7 players, use a single deck with extra suits as needed.
        $suits_to_use = $standard_suits;
        if ($playerCount >= 5 && $playerCount <= 7) {
            $suits_to_use = array_merge($suits_to_use, array_slice($extra_suits, 0, $playerCount - 4));
        }

        foreach ($suits_to_use as $suit) {
            foreach ($ranks as $rank) {
                $deck[] = ['rank' => $rank, 'suit' => $suit];
            }
        }
    }

    return $deck;
}

/**
 * Deals a single game for a given number of players with custom suit rules.
 *
 * @param int $playerCount The number of players in the game (4-8).
 * @return array The hands for all players.
 */
function deal_new_game($playerCount) {
    $deck = get_deck_for_players($playerCount);
    shuffle($deck);

    $hands = [];
    $cards_per_player = 13;
    for ($i = 0; $i < $playerCount; $i++) {
        $hands[] = array_slice($deck, $i * $cards_per_player, $cards_per_player);
    }

    return $hands;
}

/**
 * Replenishes the stock of pre-dealt hands in the database.
 */
function replenish_pre_dealt_hands() {
    $conn = db_connect();
    if (!$conn) {
        error_log("Failed to connect to DB for replenishment.");
        return;
    }

    for ($playerCount = 4; $playerCount <= 8; $playerCount++) {
        $stmt = $conn->prepare("SELECT COUNT(*) as count FROM pre_dealt_hands WHERE player_count = ? AND is_used = 0");
        $stmt->bind_param("i", $playerCount);
        $stmt->execute();
        $result = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        if ($result['count'] <= REPLENISH_THRESHOLD) {
            $needed = TARGET_STOCK - $result['count'];
            for ($i = 0; $i < $needed; $i++) {
                $hands = deal_new_game($playerCount);
                $handsJson = json_encode($hands);

                $insertStmt = $conn->prepare("INSERT INTO pre_dealt_hands (player_count, hands) VALUES (?, ?)");
                $insertStmt->bind_param("is", $playerCount, $handsJson);
                $insertStmt->execute();
                $insertStmt->close();
            }
        }
    }

    $conn->close();
}

// This script can be run from the command line to replenish the hands.
if (php_sapi_name() === 'cli') {
    replenish_pre_dealt_hands();
}
?>