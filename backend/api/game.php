<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// Handle pre-flight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Wrap the main logic in a try-catch to handle DB connection errors from config.php
try {
    require_once 'config.php';

    // --- API Logic ---
    $action = '';
    $userId = '';

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        if (isset($_GET['action'])) {
            $action = $_GET['action'];
        }
        if (isset($_GET['user_id'])) {
            $userId = $_GET['user_id'];
        }

        if ($action === 'get_score' && !empty($userId)) {
            try {
                $stmt = $pdo->prepare("SELECT score FROM players WHERE id = ?");
                $stmt->execute([$userId]);
                $player = $stmt->fetch();

                if ($player) {
                    echo json_encode(['success' => true, 'score' => $player['score']]);
                } else {
                    // If player not found, return a default score of 0
                    echo json_encode(['success' => true, 'score' => 0]);
                }
            } catch (PDOException $e) {
                http_response_code(500);
                echo json_encode(['success' => false, 'message' => 'Error fetching score: ' . $e->getMessage()]);
            }
        } elseif ($action === 'get_results') {
            try {
                $stmt = $pdo->prepare("SELECT id, winning_numbers, created_at FROM game_rounds ORDER BY created_at DESC");
                $stmt->execute();
                $results = $stmt->fetchAll();
                echo json_encode(['success' => true, 'data' => $results]);
            } catch (PDOException $e) {
                http_response_code(500);
                echo json_encode(['success' => false, 'message' => 'Error fetching results: ' . $e->getMessage()]);
            }
        } else {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Invalid GET request. Available actions: get_score, get_results.']);
        }

    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);

        if (isset($data['action'])) {
            $action = $data['action'];
        }

        if ($action === 'save_score') {
            if (isset($data['user_id']) && isset($data['score'])) {
                $userId = $data['user_id'];
                $score = $data['score'];

                try {
                    // Use INSERT ... ON DUPLICATE KEY UPDATE to handle both new and existing players
                    $stmt = $pdo->prepare("
                        INSERT INTO players (id, score) VALUES (?, ?)
                        ON DUPLICATE KEY UPDATE score = VALUES(score)
                    ");
                    $stmt->execute([$userId, $score]);

                    echo json_encode(['success' => true, 'message' => 'Score saved successfully.']);

                } catch (PDOException $e) {
                    http_response_code(500);
                    echo json_encode(['message' => 'Error saving score: ' . $e->getMessage()]);
                }
            } else {
                http_response_code(400);
                echo json_encode(['message' => 'Invalid POST request. Required action=save_score, user_id, and score.']);
            }
        } else {
            http_response_code(400);
            echo json_encode(['message' => 'Invalid action in POST request.']);
        }

    } else {
        http_response_code(405);
        echo json_encode(['message' => 'Method Not Allowed']);
    }
} catch (PDOException $e) {
    // This catches the exception thrown by config.php if the database connection fails
    http_response_code(500);
    echo json_encode(['message' => 'Database connection failed: ' . $e->getMessage()]);
    exit;
}

?>
