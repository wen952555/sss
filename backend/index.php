<?php
// 设置CORS头
header("Access-Control-Allow-Origin: https://xxx.9525.ip-ddns.com");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Credentials: true");
header('Content-Type: application/json');

// 处理预检请求
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/includes/db.php';
require_once __DIR__ . '/includes/auth.php';

// 获取请求路径
$requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$apiPath = str_replace('/api/', '', $requestUri);

// 路由配置
$routes = [
    'GET /game/rooms' => 'handleGetRooms',
    'POST /game/create' => 'handleCreateRoom',
    // 添加其他路由...
];

// 处理当前请求
$method = $_SERVER['REQUEST_METHOD'];
$routeKey = "$method $apiPath";

if (isset($routes[$routeKey])) {
    call_user_func($routes[$routeKey]);
} else {
    http_response_code(404);
    echo json_encode(['error' => 'Endpoint not found']);
}

// 路由处理函数
function handleGetRooms() {
    $db = new Database();
    $rooms = $db->query("
        SELECT g.id, g.status, COUNT(gp.user_id) as player_count
        FROM games g
        LEFT JOIN game_players gp ON g.id = gp.game_id
        WHERE g.status = 'waiting'
        GROUP BY g.id
    ")->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode(['data' => $rooms]);
}

function handleCreateRoom() {
    $input = json_decode(file_get_contents('php://input'), true);
    $db = new Database();
    
    $roomId = uniqid();
    $db->query("INSERT INTO games (id, status) VALUES (?, 'waiting')", [$roomId]);
    
    echo json_encode(['roomId' => $roomId]);
}

// 其他路由处理函数...
?>
