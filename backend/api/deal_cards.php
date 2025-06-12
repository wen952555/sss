<?php
// 旧的CORS设置:
// header("Access-Control-Allow-Origin: https://mm.9525.ip-ddns.com");

// 新的CORS设置 (将 'sss' 替换为你的实际前端子域名):
header("Access-Control-Allow-Origin: https://sss.9525.ip-ddns.com"); // <--- 修改这里
header("Access-Control-Allow-Methods: GET, POST, OPTIONS"); // 保持或根据需要调整
header("Access-Control-Allow-Headers: Content-Type, Authorization"); // 保持或根据需要调整
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(204); // No Content for preflight
    exit(0);
}

// ... (你的API原有逻辑)
// 例如，对于 deal_cards.php:
require_once '../includes/Deck.php';
require_once '../includes/Card.php';

$response = ['success' => false, 'message' => '', 'hand' => null];

if ($_SERVER['REQUEST_METHOD'] == 'GET') {
    try {
        $deck = new Deck();
        $deck->shuffle();
        $playerHandCards = $deck->deal(13);

        $response['success'] = true;
        $response['hand'] = array_map(fn(Card $card) => $card->toArray(), $playerHandCards);
    } catch (Exception $e) {
        $response['message'] = 'Error dealing cards: ' . $e->getMessage();
        http_response_code(500);
    }
} else {
    $response['message'] = 'Invalid request method. Use GET.';
    http_response_code(405); // Method Not Allowed
}

echo json_encode($response);
