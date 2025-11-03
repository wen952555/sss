<?php
// backend/utils/pre_dealer.php

require_once __DIR__ . '/../api/db_connect.php';
require_once __DIR__ . '/auto_sorter.php'; // Include the auto-sorter

// --- Constants for Hand Replenishment ---
define('TARGET_STOCK', 20);
define('REPLENISH_THRESHOLD', 10);

/**
 * Returns the appropriate deck of cards based on the number of players.
 */
function get_deck_for_players($playerCount) {
    if ($playerCount !== 4) {
        error_log("Invalid player count requested: " . $playerCount . ". Only 4-player games are supported.");
        return [];
    }
    $ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king', 'ace'];
    $standard_suits = ['spades', 'hearts', 'clubs', 'diamonds'];
    $deck = [];
    foreach ($standard_suits as $suit) {
        foreach ($ranks as $rank) {
            $deck[] = ['rank' => $rank, 'suit' => $suit];
        }
    }
    return $deck;
}

/**
 * Deals a single game for a given number of players.
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
 * Replenishes the stock of pre-dealt and pre-sorted hands in the database.
 */
function replenish_pre_dealt_hands() {
    $conn = db_connect();
    if (!$conn) {
        error_log("Failed to connect to DB for replenishment.");
        return;
    }

    $playerCount = 4;
    $stmt = $conn->prepare("SELECT COUNT(*) as count FROM pre_dealt_hands WHERE player_count = ? AND is_used = 0");
    $stmt->bind_param("i", $playerCount);
    $stmt->execute();
    $result = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if ($result && $result['count'] <= REPLENISH_THRESHOLD) {
        $needed = TARGET_STOCK - $result['count'];
        for ($i = 0; $i < $needed; $i++) {
            $hands_for_all_players = deal_new_game($playerCount);
            $handsJson = json_encode($hands_for_all_players);

            // Insert the new set of hands and get its ID
            $insertStmt = $conn->prepare("INSERT INTO pre_dealt_hands (player_count, hands) VALUES (?, ?)");
            $insertStmt->bind_param("is", $playerCount, $handsJson);
            $insertStmt->execute();
            $hand_id = $insertStmt->insert_id;
            $insertStmt->close();

            if ($hand_id > 0) {
                // Now, pre-sort each hand and store the top 5 arrangements
                foreach ($hands_for_all_players as $player_hand) {
                    $top_5_arrangements = auto_sort_hand_get_top_5($player_hand);

                    foreach ($top_5_arrangements as $index => $arrangement) {
                        $sorted_hand_json = json_encode($arrangement['hand']);
                        $score = $arrangement['score'];

                        $sortInsertStmt = $conn->prepare("INSERT INTO pre_sorted_hands (hand_id, arrangement_index, sorted_hand, score) VALUES (?, ?, ?, ?)");
                        $sortInsertStmt->bind_param("iisi", $hand_id, $index, $sorted_hand_json, $score);
                        $sortInsertStmt->execute();
                        $sortInsertStmt->close();
                    }
                }
            }
        }
    }

    $conn->close();
}

// This script can be run from the command line to replenish the hands.
if (php_sapi_name() === 'cli') {
    echo "Replenishing hands...\n";
    replenish_pre_dealt_hands();
    echo "Done.\n";
}
?>
