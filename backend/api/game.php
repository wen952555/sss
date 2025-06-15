<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// 创建一副牌
function createDeck() {
    $suits = ['hearts', 'diamonds', 'clubs', 'spades'];
    $values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
    $deck = [];
    
    foreach ($suits as $suit) {
        foreach ($values as $value) {
            $deck[] = [
                'suit' => $suit,
                'value' => $value
            ];
        }
    }
    
    return $deck;
}

// 洗牌
function shuffleDeck($deck) {
    shuffle($deck);
    return $deck;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_GET['action'] ?? '';
    
    if ($action === 'start') {
        $deck = createDeck();
        $shuffledDeck = shuffleDeck($deck);
        
        http_response_code(200);
        echo json_encode([
            'status' => 'success',
            'deck' => $shuffledDeck
        ]);
        exit;
    }
    
    if ($action === 'save') {
        $data = json_decode(file_get_contents("php://input"), true);
        
        // 这里可以保存游戏结果到数据库
        // 简化版本只返回成功消息
        
        http_response_code(200);
        echo json_encode([
            'status' => 'success',
            'message' => 'Result saved successfully'
        ]);
        exit;
    }
    
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'Invalid action'
    ]);
    exit;
}

http_response_code(405);
echo json_encode([
    'status' => 'error',
    'message' => 'Method not allowed'
]);
