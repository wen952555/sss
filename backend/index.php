<?php
/* backend/index.php */
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit;
}

header("Content-Type: application/json");

// 解析 URL 路径，忽略查询参数
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$path = trim($uri, '/');
$segments = explode('/', $path);

// 路由逻辑：/api/{module} -> api/{module}.php
if (isset($segments[0]) && $segments[0] === 'api' && isset($segments[1])) {
    $module = $segments[1];
    $apiFile = __DIR__ . '/api/' . $module . '.php';

    if (file_exists($apiFile)) {
        require_once $apiFile;
    } else {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => "API 模块 '$module' 未找到"]);
    }
} else {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => '无效的 API 请求路径']);
}
