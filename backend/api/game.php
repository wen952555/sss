<?php
// backend/api/game.php

header("Content-Type: application/json");

// 允许来自你的 Cloudflare Pages 前端的请求
header("Access-Control-Allow-Origin: https://sss-8e3.pages.dev");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization"); // 保持，以备将来使用
// 如果你计划在请求中发送 cookies 或使用 HTTP认证，你可能还需要：
// header("Access-Control-Allow-Credentials: true");


// 处理 OPTIONS 预检请求
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// 确保 ThirteenWaters.php 的路径正确，相对于 game.php
require_once '../core/ThirteenWaters.php'; // 如果 game.php 在 backend/api/ 内，core 在 backend/core/ 内，这是对的

session_start();

$action = $_GET['action'] ?? ($_POST['action'] ?? null); // 允许 POST 请求获取 action
$response = ['status' => 'error', 'message' => 'Invalid action'];

if (!isset($_SESSION['game_sss_8e3'])) { // 使用一个更特定的 session key 防止冲突
    $_SESSION['game_sss_8e3'] = new ThirteenWaters();
}
/** @var ThirteenWaters $game */
$game = $_SESSION['game_sss_8e3'];

switch ($action) {
    case 'new_game':
        $numPlayers = isset($_REQUEST['players']) ? (int)$_REQUEST['players'] : 2;
        if ($numPlayers < 2 || $numPlayers > 4) $numPlayers = 2;
        $game->dealCards($numPlayers);
        $_SESSION['game_sss_8e3'] = $game;
        $response = ['status' => 'success', 'message' => 'New game started.', 'gameState' => $game->getGameState()];
        break;

    case 'get_state':
        $response = ['status' => 'success', 'gameState' => $game->getGameState()];
        break;

    // 在这里添加 'submit_hand' 等新功能
    case 'submit_hand':
        // 从 POST 请求体中获取数据 (通常前端会发送 JSON)
        $input = json_decode(file_get_contents('php://input'), true);

        $playerId = $input['playerId'] ?? null;
        $front = $input['front'] ?? null;   // 期望是卡牌字符串数组 e.g., ["spades_ace", "hearts_2", "clubs_3"]
        $middle = $input['middle'] ?? null;
        $back = $input['back'] ?? null;

        if (!$playerId || !$front || !$middle || !$back) {
            $response = ['status' => 'error', 'message' => 'Missing player ID or hand data.'];
            break;
        }

        // TODO: 在 ThirteenWaters 类中实现 submitHand 方法
        // $result = $game->submitHand($playerId, $front, $middle, $back);
        // if ($result['status'] === 'success') {
        //     $_SESSION['game_sss_8e3'] = $game; // 保存更新后的游戏状态
        //     $response = ['status' => 'success', 'message' => $result['message'], 'gameState' => $game->getGameState()];
        // } else {
        //     $response = ['status' => 'error', 'message' => $result['message']];
        // }
        // 暂时先返回一个模拟成功
        $response = ['status' => 'success', 'message' => "Hand submitted for {$playerId} (not yet implemented).", 'gameState' => $game->getGameState()];
        break;


    default:
        $response = ['status' => 'error', 'message' => 'Unknown action: ' . htmlspecialchars($action ?? 'NULL')];
        break;
}

echo json_encode($response);
?>
