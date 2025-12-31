<?php
require __DIR__ . '/../db.php';
require __DIR__ . '/../utils.php';
require __DIR__ . '/../lib/SmartSorter.php';

$game_id = $_GET['game_id'] ?? null;
if (!$game_id) {
    sendJSON(['error' => 'game_id is required'], 400);
    exit;
}

$pdo->beginTransaction();

try {
    // 1. Get Game and Player Info
    $stmt = $pdo->prepare("SELECT * FROM active_games WHERE id = ?");
    $stmt->execute([$game_id]);
    $game = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$game) {
        sendJSON(['error' => 'Game not found'], 404);
        exit;
    }
    
    // Prevent re-calculation for completed games
    if ($game['status'] === 'completed') {
        sendJSON(['error' => 'Game has already been completed and scored.'], 409);
        exit;
    }

    $player_ids = [
        $game['player_1_id'], $game['player_2_id'],
        $game['player_3_id'], $game['player_4_id']
    ];

    // 2. Get all plays for this game
    $stmt = $pdo->prepare("SELECT user_id, round_number, sorted_hand FROM game_plays WHERE active_game_id = ? ORDER BY round_number");
    $stmt->execute([$game_id]);
    $plays = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 3. Calculate scores for each player
    $player_scores = array_fill_keys($player_ids, 0);

    foreach ($plays as $play) {
        $hand = json_decode($play['sorted_hand'], true);
        // The hand is sorted into head, mid, back. We score them individually.
        $head_score = SmartSorter::getHandScore(array_slice($hand, 0, 3))['score'];
        $mid_score = SmartSorter::getHandScore(array_slice($hand, 3, 5))['score'];
        $back_score = SmartSorter::getHandScore(array_slice($hand, 8, 5))['score'];
        
        $total_round_score = $head_score + $mid_score + $back_score;
        
        $player_scores[$play['user_id']] += $total_round_score;
    }

    // 4. Sort players by final score
    arsort($player_scores); // Sort scores descending, maintaining user_id keys
    
    $rankings = array_keys($player_scores);

    // 5. Define Point Distribution (Winner takes most, losers pay)
    $point_distribution = [30, 10, -10, -30]; // Winner gets 30, 2nd gets 10, etc.
    $point_changes = [];

    foreach ($rankings as $index => $user_id) {
        $points_to_change = $point_distribution[$index];
        $point_changes[$user_id] = $points_to_change;
        
        // Update user's points in the database
        $update_stmt = $pdo->prepare("UPDATE users SET points = points + ? WHERE id = ?");
        $update_stmt->execute([$points_to_change, $user_id]);
    }

    // 6. Update Game Status and Scores
    $update_game_sql = "UPDATE active_games SET status = 'completed', player_1_score = ?, player_2_score = ?, player_3_score = ?, player_4_score = ? WHERE id = ?";
    $pdo->prepare($update_game_sql)->execute([
        $player_scores[$game['player_1_id']],
        $player_scores[$game['player_2_id']],
        $player_scores[$game['player_3_id']],
        $player_scores[$game['player_4_id']],
        $game_id
    ]);
    
    // 7. Commit transaction
    $pdo->commit();

    // 8. Prepare final results
    $final_results = [];
    foreach($player_scores as $user_id => $score) {
        $final_results[] = [
            'user_id' => $user_id,
            'final_score' => $score,
            'rank' => array_search($user_id, $rankings) + 1,
            'points_change' => $point_changes[$user_id]
        ];
    }

    sendJSON([
        'success' => true,
        'game_id' => $game_id,
        'results' => $final_results
    ], 200);

} catch (Exception $e) {
    $pdo->rollBack();
    error_log('Game Results Error: ' . $e->getMessage());
    sendJSON(['error' => 'Server error while calculating results.'], 500);
}
?>