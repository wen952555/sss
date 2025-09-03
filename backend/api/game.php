<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// 创建一副牌
function createDeck() {
    $suits = ['hearts', 'diamonds',
        foreach ($values as $va
    shuffle($deck);
    return $deck;
}

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
