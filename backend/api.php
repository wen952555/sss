<?php
// api.php - 简化版本

// 基础设置
header("Content-Type: application/json; charset=utf-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

// 处理 OPTIONS 预检请求
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

try {
    // 引入必要文件
    require_once __DIR__ . '/db.php';
    require_once __DIR__ . '/handlers/user_handler.php';
    
    // 获取查询参数中的action
    $action = $_GET['action'] ?? '';
    
    // 获取请求数据
    $input = file_get_contents('php://input');
    $data = [];
    if (!empty($input)) {
        $data = json_decode($input, true);
    }
    
    $pdo = getDBConnection();
    
    // 路由处理
    switch ($action) {
        case 'register':
            handleRegister($pdo, $data);
            break;
            
        case 'login':
            handleLogin($pdo, $data);
            break;
            
        case 'get-user':
            // 需要认证的路由
            $headers = getallheaders();
            $authHeader = $headers['Authorization'] ?? ($headers['authorization'] ?? '');
            $token = str_replace('Bearer ', '', $authHeader);
            
            $user = getUserByToken($pdo, $token);
            if (!$user) {
                http_response_code(401);
                echo json_encode(['success' => false, 'message' => 'Unauthorized']);
                break;
            }
            
            echo json_encode([
                'success' => true, 
                'user' => [
                    'id' => $user['id'], 
                    'user_id_4d' => $user['user_id_4d'], 
                    'phone' => $user['phone'], 
                    'points' => $user['points']
                ]
            ]);
            break;
            
        case 'tables-status':
            // 需要认证的路由
            require_once __DIR__ . '/handlers/game_handler.php';
            $headers = getallheaders();
            $authHeader = $headers['Authorization'] ?? ($headers['authorization'] ?? '');
            $token = str_replace('Bearer ', '', $authHeader);
            
            $user = getUserByToken($pdo, $token);
            if (!$user) {
                http_response_code(401);
                echo json_encode(['success' => false, 'message' => 'Unauthorized']);
                break;
            }
            
            handleGetTablesStatus($pdo, $user['id']);
            break;
            
        default:
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Action not found: ' . $action]);
            break;
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Server error: ' . $e->getMessage()
    ]);
    error_log("API Error: " . $e->getMessage());
}
?>