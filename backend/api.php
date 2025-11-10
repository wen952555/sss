<?php
// api.php
header("Content-Type: application/json");
// CORS headers - 在Cloudflare Worker代理模式下，这些可以宽松设置
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

// 获取请求路径
$request_uri = $_SERVER['REQUEST_URI'];
$path = parse_url($request_uri, PHP_URL_PATH);

// 从路径中提取action
$path_parts = explode('/', $path);
$action = end($path_parts);

// 获取请求数据
$input = file_get_contents('php://input');
$data = [];
if (!empty($input)) {
    $data = json_decode($input, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        $data = [];
    }
}

// 如果没有从路径获取到action，尝试从查询参数获取
if (empty($action) || $action === 'api.php') {
    $action = $_GET['action'] ?? '';
}

$pdo = getDBConnection();

// 无需认证的路由
switch ($action) {
    case 'register':
        handleRegister($pdo, $data);
        exit;
    case 'login':
        handleLogin($pdo, $data);
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
    // ... 其他游戏相关的路由
    default:
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Action not found: ' . $action]);
        break;
}
?>