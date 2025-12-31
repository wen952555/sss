<?php
header("Content-Type: application/json");
require_once __DIR__ . '/../db.php';

$game_id = $_GET['game_id'] ?? null;

if (!$game_id) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'game_id is required.']);
    exit;
}

try {
    // 1. Verify the game is completed
    $game_sql = "SELECT id, stadium_id FROM active_games WHERE id = ? AND status = 'completed'";
    $game_stmt = $pdo->prepare($game_sql);
    $game_stmt->execute([$game_id]);
    $game = $game_stmt->fetch(PDO::FETCH_ASSOC);

    if (!$game) {
        http_response_code(404);
        echo json_encode(['status' => 'error', 'message' => 'Completed game not found, or the game is not yet finished.']);
        exit;
    }

    // 2. Fetch all plays for this game
    $plays_sql = "SELECT p.deal_id, p.player_id, p.sorted_hand, p.score, p.is_autopilot, d.deal_index, d.hands 
                FROM game_plays p
                JOIN stadium_deals d ON p.deal_id = d.id
                WHERE p.active_game_id = ?
                ORDER BY d.deal_index, p.player_id";
    $plays_stmt = $pdo->prepare($plays_sql);
    $plays_stmt->execute([$game_id]);
    $all_plays = $plays_stmt->fetchAll(PDO::FETCH_ASSOC | PDO::FETCH_GROUP);

    // The query groups by deal_id. Let's restructure it for the frontend.
    $final_results = [];
    foreach ($all_plays as $deal_id => $plays) {
        $deal_info = [
            'deal_id' => $deal_id,
            'deal_index' => $plays[0]['deal_index'],
            'original_hands' => json_decode($plays[0]['hands'], true),
            'player_results' => []
        ];
        foreach ($plays as $play) {
            $deal_info['player_results'][] = [
                'player_id' => $play['player_id'],
                'sorted_hand' => json_decode($play['sorted_hand'], true),
                'score' => $play['score'],
                'is_autopilot' => (bool)$play['is_autopilot']
            ];
        }
        $final_results[] = $deal_info;
    }

    // Sort final results by deal_index
    usort($final_results, function($a, $b) {
        return $a['deal_index'] <=> $b['deal_index'];
    });

    echo json_encode([
        'status' => 'success',
        'game_id' => $game_id,
        'results' => $final_results
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
?>