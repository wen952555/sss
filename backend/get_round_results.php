<?php
header("Content-Type: application/json");
require_once __DIR__ . '/../db.php';

$game_id = $_GET['game_id'] ?? null;
$user_id = $_GET['user_id'] ?? null;

if (!$game_id || !$user_id) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'game_id and user_id are required.']);
    exit;
}

try {
    $pdo->beginTransaction();

    // 1. Get game info
    $game_sql = "SELECT * FROM active_games WHERE id = ?";
    $game_stmt = $pdo->prepare($game_sql);
    $game_stmt->execute([$game_id]);
    $game = $game_stmt->fetch(PDO::FETCH_ASSOC);

    if (!$game) { throw new Exception("Game not found."); }

    $current_round = $game['current_round'];
    
    // 2. Check how many players have submitted for the current round
    $plays_sql = "SELECT player_id, sorted_hand, score, is_autopilot FROM game_plays WHERE active_game_id = ? AND round_number = ?";
    $plays_stmt = $pdo->prepare($plays_sql);
    $plays_stmt->execute([$game_id, $current_round]);
    $plays = $plays_stmt->fetchAll(PDO::FETCH_ASSOC);

    // If not all 4 players have submitted, return a waiting status
    if (count($plays) < 4) {
        $pdo->commit();
        echo json_encode([
            'status' => 'waiting',
            'message' => 'Waiting for other players to submit.',
            'submitted_players_count' => count($plays)
        ]);
        exit;
    }

    // --- All players have submitted, proceed to next round logic ---

    // Placeholder for scoring logic. This should calculate scores for the round based on `sorted_hand` for all 4 plays.
    // For now, we'll just leave the scores as they are (or as autopilot set them).

    $is_game_over = ($current_round == 10);
    $next_hand = null;

    if (!$is_game_over) {
        $next_round = $current_round + 1;
        
        // Update game state to the next round
        $update_sql = "UPDATE active_games SET current_round = ?, last_action_at = NOW() WHERE id = ?";
        $update_stmt = $pdo->prepare($update_sql);
        $update_stmt->execute([$next_round, $game_id]);

        // Fetch the hand for the NEXT round for the current user
        $players = [$game['player_1_id'], $game['player_2_id'], $game['player_3_id'], $game['player_4_id']];
        $player_index = array_search($user_id, $players);
        $hand_key = ['north', 'east', 'south', 'west'][$player_index];
        $deal_to_fetch_index = ($next_round + $player_index - 1) % 10 + 1;

        $deal_sql = "SELECT hands FROM stadium_deals WHERE stadium_id = ? AND deal_index = ?";
        $deal_stmt = $pdo->prepare($deal_sql);
        $deal_stmt->execute([$game['stadium_id'], $deal_to_fetch_index]);
        $deal = $deal_stmt->fetch(PDO::FETCH_ASSOC);
        $all_hands = json_decode($deal['hands'], true);
        $next_hand = $all_hands[$hand_key];
    } else {
        // If game is over, mark it as completed
        $update_sql = "UPDATE active_games SET status = 'completed' WHERE id = ?";
        $update_stmt = $pdo->prepare($update_sql);
        $update_stmt->execute([$game_id]);
    }

    $pdo->commit();

    echo json_encode([
        'status' => 'round_complete',
        'round_results' => $plays, // Results of the just-finished round
        'is_game_over' => $is_game_over,
        'next_round' => $is_game_over ? null : $next_round,
        'next_hand' => $next_hand
    ]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
?>