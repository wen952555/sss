<?php
// backend/api/game.php
require_once '../config/database.php';
require_once '../models/GameModel.php';
require_once '../models/SubmissionModel.php';
require_once '../utils/Auth.php';

header('Content-Type: application/json');
Auth::check(); // Ensure user is logged in

$action = $_GET['action'] ?? '';
$data = json_decode(file_get_contents('php://input'), true);
$userId = $_SESSION['user_id'];

$database = new Database();
$db = $database->getConnection();
$gameModel = new GameModel($db);
$submissionModel = new SubmissionModel($db);

switch ($action) {
    case 'get_game':
        $game = $gameModel->findAvailableGame();
        if ($game) {
            echo json_encode([
                'game_id' => $game['id'],
                'player_hand' => json_decode($game['player1_original']),
                'opponents' => [
                    ['id' => 2, 'name' => 'Opponent 2'],
                    ['id' => 3, 'name' => 'Opponent 3'],
                    ['id' => 4, 'name' => 'Opponent 4'],
                ]
            ]);
        } else {
            http_response_code(404);
            echo json_encode(['message' => 'No available games']);
        }
        break;

    case 'get_arrangement':
        $gameId = $_GET['game_id'] ?? null;
        if (!$gameId) {
            http_response_code(400);
            echo json_encode(['message' => 'Game ID is required']);
            exit;
        }
        $game = $gameModel->findById($gameId);
        if ($game) {
            echo json_encode(json_decode($game['player1_arranged']));
        } else {
            http_response_code(404);
            echo json_encode(['message' => 'Game not found']);
        }
        break;

    case 'submit':
        if (empty($data['game_id']) || empty($data['arrangement'])) {
            http_response_code(400);
            echo json_encode(['message' => 'Missing required fields']);
            exit;
        }

        $submissionId = $submissionModel->create($data['game_id'], $userId, $data['arrangement']);
        if ($submissionId) {
            echo json_encode(['message' => 'Submission successful', 'submission_id' => $submissionId]);
        } else {
            http_response_code(500);
            echo json_encode(['message' => 'Failed to save submission']);
        }
        break;

    default:
        http_response_code(404);
        echo json_encode(['message' => 'Action not found']);
        break;
}
