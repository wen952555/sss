<?php
// api.php

// 设置错误处理 - 确保所有错误都返回JSON
function handleError($errno, $errstr, $errfile, $errline) {
    throw new ErrorException($errstr, 0, $errno, $errfile, $errline);
}
set_error_handler("handleError");

// 设置异常处理
function handleException($e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => '服务器内部错误: ' . $e->getMessage()
    ]);
    exit;
}
set_exception_handler("handleException");

// 设置响应头
header("Content-Type: application/json; charset=utf-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

// 处理 OPTIONS 预检请求
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

try {
    require_once __DIR__ . '/db.php';
    require_once __DIR__ . '/handlers/user_handler.php';
    require_once __DIR__ . '/handlers/game_handler.php';

    // 获取查询参数中的action
    $action = $_GET['action'] ?? '';

    // 获取请求数据
    $input = file_get_contents('php://input');
    $data = [];
    if (!empty($input)) {
        $data = json_decode($input, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception('Invalid JSON in request body');
        }
    }

    // 记录请求日志
    error_log("API Request: action=$action, method=" . $_SERVER['REQUEST_METHOD']);

    $pdo = getDBConnection();

    // 无需认证的路由
    switch ($action) {
        case 'register':
            handleRegister($pdo, $data);
            exit;
        case 'login':
            handleLogin($pdo, $data);
            exit;
        case '':
            echo json_encode([
                'success' => true, 
                'message' => 'API is running', 
                'timestamp' => date('Y-m-d H:i:s')
            ]);
            exit;
    }

    // ---- 需要认证的路由 ----
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? ($headers['authorization'] ?? '');
    $token = str_replace('Bearer ', '', $authHeader);

    if (empty($token)) {
        throw new Exception('Missing authorization token');
    }

    $user = getUserByToken($pdo, $token);
    if (!$user) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Unauthorized: Invalid token']);
        exit;
    }

    // 已认证的路由
    switch ($action) {
        case 'get-user':
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
        'message' => '服务器错误: ' . $e->getMessage()
    ]);
    error_log("API Error: " . $e->getMessage() . " in " . $e->getFile() . ":" . $e->getLine());
}
?>