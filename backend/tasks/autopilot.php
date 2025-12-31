<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../lib/SmartSorter.php';
require_once __DIR__ . '/../lib/Deck.php'; // Need this for player position mapping

const AUTOPILOT_TIMEOUT_MINUTES = 5; // The grace period before autopilot takes over

echo "Running Autopilot Check at " . date('Y-m-d H:i:s') . "...\n";

$pdo->beginTransaction();

try {
    $timeout_threshold = date('Y-m-d H:i:s', strtotime("-" . AUTOPILOT_TIMEOUT_MINUTES . " minutes"));

    // 1. Find all games that haven't had any action in the last X minutes.
    $stalled_games_sql = "SELECT id, stadium_id, current_round, player_1_id, player_2_id, player_3_id, player_4_id 
                          FROM active_games 
                          WHERE status = 'active' AND last_action_at < ?";
    $stalled_games_stmt = $pdo->prepare($stalled_games_sql);
    $stalled_games_stmt->execute([$timeout_threshold]);
    $stalled_games = $stalled_games_stmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($stalled_games)) {
        echo "No stalled games found.\n";
        $pdo->commit();
        exit;
    }

    $sorter = new SmartSorter();

    foreach ($stalled_games as $game) {
        echo "Processing stalled game ID: {$game['id']}\n";
        $game_id = $game['id'];
        $round = $game['current_round'];
        $player_ids_in_game = [$game['player_1_id'], $game['player_2_id'], $game['player_3_id'], $game['player_4_id']];

        // 2. Find which players have NOT submitted their hand for the current round.
        $submitted_players_stmt = $pdo->prepare("SELECT user_id FROM game_plays WHERE active_game_id = ? AND round_number = ?");
        $submitted_players_stmt->execute([$game_id, $round]);
        $submitted_player_ids = $submitted_players_stmt->fetchAll(PDO::FETCH_COLUMN);

        $delinquent_player_ids = array_diff($player_ids_in_game, $submitted_player_ids);

        if (empty($delinquent_player_ids)) {
            // This can happen if the game is stalled for other reasons, or if a round just completed.
            // We can advance the round if all players have submitted.
            if(count($submitted_player_ids) === 4){
                 $pdo->prepare("UPDATE active_games SET current_round = current_round + 1, last_action_at = NOW() WHERE id = ?")->execute([$game_id]);
                 echo "All players submitted for round $round. Advancing to next round for game $game_id.\n";
            }
            continue;
        }

        // 3. Get the correct deal for the current round.
        $deal_stmt = $pdo->prepare("SELECT id, hands FROM stadium_deals WHERE stadium_id = ? AND deal_index = ?");
        $deal_stmt->execute([$game['stadium_id'], $round]);
        $deal = $deal_stmt->fetch(PDO::FETCH_ASSOC);

        if (!$deal) {
            error_log("CRITICAL: Could not find deal for stadium {$game['stadium_id']} and round {$round}. Skipping autopilot for this game.");
            continue;
        }
        $all_hands = json_decode($deal['hands'], true);

        foreach ($delinquent_player_ids as $player_id) {
            echo "Player ID $player_id in game $game_id has timed out. Activating autopilot.\n";

            // 4. Determine player's position to get their hand.
            $player_index = array_search($player_id, $player_ids_in_game);
            $player_position = ['north', 'east', 'south', 'west'][$player_index];
            $player_hand = $all_hands[$player_position];

            // 5. Use SmartSorter to sort the hand.
            $sorted_hand = $sorter->sortHand($player_hand);
            
            // Calculate score for this specific hand, but don't apply penalties here.
            $head_score = SmartSorter::getHandScore(array_slice($sorted_hand, 0, 3))['score'];
            $mid_score = SmartSorter::getHandScore(array_slice($sorted_hand, 3, 5))['score'];
            $back_score = SmartSorter::getHandScore(array_slice($sorted_hand, 8, 5))['score'];
            $total_score = $head_score + $mid_score + $back_score;

            // 6. Submit the sorted hand on behalf of the player.
            $submit_stmt = $pdo->prepare(
                "INSERT INTO game_plays (active_game_id, user_id, round_number, deal_id, sorted_hand, score, is_autopilot) VALUES (?, ?, ?, ?, ?, ?, TRUE)"
            );
            $submit_stmt->execute([
                $game_id,
                $player_id,
                $round,
                $deal['id'],
                json_encode($sorted_hand),
                $total_score
            ]);

            echo "Autopilot submitted hand for player $player_id in round $round with a score of $total_score.\n";
        }
        
        // After submitting for all delinquent players, update the game's last_action_at timestamp.
        $pdo->prepare("UPDATE active_games SET last_action_at = NOW() WHERE id = ?")->execute([$game_id]);
    }

    $pdo->commit();
    echo "Autopilot check completed successfully.\n";

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log("Autopilot script failed: " . $e->getMessage());
    die("An unexpected error occurred during the autopilot process.\n");
}
?>