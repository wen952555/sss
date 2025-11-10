<?php
// api.php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

// 处理 OPTIONS 预检请求
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

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
        $data = [];
    }
}

// 记录请求日志（调试用）
error_log("API Request: action=$action, method=" . $_SERVER['REQUEST_METHOD'] . ", data=" . json_encode($data));

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
        // 默认响应
        echo json_encode(['success' => true, 'message' => 'API is running', 'timestamp' => date('Y-m-d H:i:s')]);
        exit;
}

// ---- 需要认证的路由 ----
$headers = getallheaders();
$authHeader = $headers['Authorization'] ?? ($headers['authorization'] ?? '');
$token = str_replace('Bearer ', '', $authHeader);

$user = getUserByToken($pdo, $token);
if (!$user) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized: Invalid or missing token']);
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
?>