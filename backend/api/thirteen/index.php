<?php
header("Access-Control-Allow-Origin: https://xxx.9525.ip-ddns.com"); // 你的前端域名
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once 'GameManager.php';

$gameManager = new GameManager();
$response = ['success' => false, 'message' => '无效请求'];

// 简单的路由逻辑
$action = $_GET['action'] ?? null;
$input = json_decode(file_get_contents('php://input'), true);

$playerId = $input['player_id'] ?? ($_GET['player_id'] ?? 'guest'); // 从 POST 或 GET 获取 player_id

try {
    switch ($action) {
        case 'create_game':
            // playerId1 应该是从小程序获取的真实用户ID
            $response = $gameManager->createGame($playerId);
            break;
        case 'get_state':
            $gameId = $input['game_id'] ?? $_GET['game_id'] ?? null;
            if ($gameId) {
                $response = $gameManager->getGameState($gameId, $playerId);
            } else {
                $response = ['success' => false, 'message' => '需要 game_id'];
            }
            break;
        case 'submit_arrangement':
            $gameId = $input['game_id'] ?? null;
            $front = $input['front'] ?? null; // 应该是 simple card array
            $middle = $input['middle'] ?? null;
            $back = $input['back'] ?? null;

            if ($gameId && $playerId && $front && $middle && $back) {
                $response = $gameManager->submitArrangement($gameId, $playerId, $front, $middle, $back);
            } else {
                $response = ['success' => false, 'message' => '缺少参数 (game_id, player_id, front, middle, back)'];
            }
            break;
        default:
            $response = ['success' => false, 'message' => '未知操作'];
            http_response_code(400);
    }
} catch (Exception $e) {
    $response = ['success' => false, 'message' => '服务器内部错误: ' . $e->getMessage()];
    http_response_code(500);
    // Log error: error_log($e->getMessage());
}

echo json_encode($response);
?>
