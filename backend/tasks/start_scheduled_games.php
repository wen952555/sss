<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../lib/Deck.php';

// This script should be run by a cron job, e.g., once every evening.

echo "Scheduler running for date: " . date('Y-m-d') . "\n";

$pdo->beginTransaction();

try {
    // 1. Fetch all unique users who made a reservation for today
    $stmt = $pdo->prepare("SELECT DISTINCT user_id FROM reservations WHERE reservation_date = CURDATE()");
    $stmt->execute();
    $player_ids = $stmt->fetchAll(PDO::FETCH_COLUMN);

    if (count($player_ids) < 4) {
        echo "Not enough players to start a game. Requires 4, found " . count($player_ids) . ".\n";
        $pdo->rollBack(); // Nothing to do, so we can end the transaction.
        exit;
    }

    echo "Found " . count($player_ids) . " players. Shuffling and forming games.\n";
    shuffle($player_ids);

    $num_games = floor(count($player_ids) / 4);

    for ($i = 0; $i < $num_games; $i++) {
        $game_players_ids = array_slice($player_ids, $i * 4, 4);

        // 2. Create a new stadium for this game.
        $pdo->exec("INSERT INTO stadiums (created_at) VALUES (NOW())");
        $stadium_id = $pdo->lastInsertId();

        // 3. Generate and insert the 10 deals for this new stadium.
        $deal_stmt = $pdo->prepare(
            "INSERT INTO stadium_deals (stadium_id, deal_index, hands) VALUES (?, ?, ?)"
        );
        for ($deal_index = 1; $deal_index <= 10; $deal_index++) {
            $deck = Deck::create();
            $hands = Deck::deal($deck);
            $deal_stmt->execute([$stadium_id, $deal_index, json_encode($hands)]);
        }

        // 4. Create the active game record, linking the players and the stadium.
        $game_stmt = $pdo->prepare(
            "INSERT INTO active_games (stadium_id, player_1_id, player_2_id, player_3_id, player_4_id) VALUES (?, ?, ?, ?, ?)"
        );
        $game_stmt->execute([
            $stadium_id,
            $game_players_ids[0],
            $game_players_ids[1],
            $game_players_ids[2],
            $game_players_ids[3]
        ]);
        $game_id = $pdo->lastInsertId();

        echo "Created Active Game ID: $game_id with players: " . implode(', ', $game_players_ids) . " using new Stadium ID: $stadium_id\n";
        
        // Here you might trigger push notifications to the players.
    }

    $pdo->commit();

    $remaining_players = count($player_ids) % 4;
    if ($remaining_players > 0) {
        echo "$remaining_players players were left out and will have their reservation fee refunded.\n";
        // You could add logic here to refund the 10 points to the leftover players.
    }

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log("Scheduler Error: " . $e->getMessage());
    die("Failed to start scheduled games: " . $e->getMessage() . "\n");
}
?>