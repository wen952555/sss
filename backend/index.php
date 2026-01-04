<?php
/* backend/index.php */

// 错误处理：记录到文件
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/error.log');
ini_set('display_errors', 0); // 不在浏览器中显示错误
error_reporting(E_ALL);

// 允许跨域
if (isset($_SERVER['HTTP_ORIGIN'])) {
    header("Access-Control-Allow-Origin: {$_SERVER['HTTP_ORIGIN']}");
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Max-Age: 86400');    // cache for 1 day
}

// 处理 OPTIONS 请求（预检请求）
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_METHOD']))
        header("Access-Control-Allow-Methods: GET, POST, OPTIONS");         
    if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS']))
        header("Access-Control-Allow-Headers: {$_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS']}");
    exit(0);
}

header("Content-Type: application/json; charset=UTF-8");

// 路由逻辑
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
// 去掉基础路径（假设 index.php 在根目录，如果不是请调整）
$path = trim($uri, '/');
$segments = explode('/', $path);

if (count($segments) >= 2 && $segments[0] === 'api') {
    $module = $segments[1];
    $apiFile = __DIR__ . '/api/' . $module . '.php';

    if (file_exists($apiFile)) {
        require_once $apiFile;
    } else {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => "Module '$module' not found."]);
    }
} else {
    // 默认欢迎信息或错误提示
    echo json_encode(['success' => false, 'error' => 'Invalid endpoint.', 'path' => $path]);
}
