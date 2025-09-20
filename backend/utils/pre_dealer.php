<?php
// backend/utils/pre_dealer.php

require_once __DIR__ . '/../api/db_connect.php';

/**
 * Deals a single game for a given number of players with custom suit rules.
 *
 * @param int $playerCount The number of players in the game (4-8).
 * @return array The hands for all players.
 */
function deal_new_game($playerCount) {
    $ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king', 'ace'];
    $standard_suits = ['spades', 'hearts', 'clubs', 'diamonds'];
    $extra_suits = ['stars', 'moons', 'suns'];

    $deck = [];
    $suits_to_use = $standard_suits;

    if ($playerCount >= 5 && $playerCount <= 7) {
        for ($i = 0; $i < $playerCount - 4; $i++) {
            $suits_to_use[] = $extra_suits[$i];
        }
    }

    if ($playerCount === 8) {
        // For 8 players, use two standard decks
        foreach ($standard_suits as $suit) {
            foreach ($ranks as $rank) {
                $deck[] = ['rank' => $rank, 'suit' => $suit];
                $deck[] = ['rank' => $rank, 'suit' => $suit];
            }
        }
    } else {
        foreach ($suits_to_use as $suit) {
            foreach ($ranks as $rank) {
                $deck[] = ['rank' => $rank, 'suit' => $suit];
            }
        }
    }

    shuffle($deck);

    $hands = [];
    $card_offset = 0;
    $cards_per_player = 13;
    for ($i = 0; $i < $playerCount; $i++) {
        $hands[] = array_slice($deck, $card_offset, $cards_per_player);
        $card_offset += $cards_per_player;
    }

    return $hands;
}

/**
 * Replenishes the stock of pre-dealt hands in the database.
 */
function replenish_pre_dealt_hands() {
    $conn = db_connect();

    for ($playerCount = 4; $playerCount <= 8; $playerCount++) {
        $stmt = $conn->prepare("SELECT COUNT(*) as count FROM pre_dealt_hands WHERE player_count = ? AND is_used = 0");
        $stmt->bind_param("i", $playerCount);
        $stmt->execute();
        $result = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        $needed = 3 - $result['count'];

        for ($i = 0; $i < $needed; $i++) {
            $hands = deal_new_game($playerCount);
            $handsJson = json_encode($hands);

            $insertStmt = $conn->prepare("INSERT INTO pre_dealt_hands (player_count, hands) VALUES (?, ?)");
            $insertStmt->bind_param("is", $playerCount, $handsJson);
            $insertStmt->execute();
            $insertStmt->close();
        }
    }

    $conn->close();
}

// This script can be run from the command line to replenish the hands.
if (php_sapi_name() === 'cli') {
    replenish_pre_dealt_hands();
}
