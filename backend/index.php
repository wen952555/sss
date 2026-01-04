<?php
/* backend/index.php */
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
  exit;
}

header("Content-Type: application/json");

$path = trim($_SERVER['REQUEST_URI'], '/');
$segments = explode('/', $path);

// 简单的路由：期望的格式是 /api/auth?action=... 或 /api/game?action=...
if (isset($segments[0]) && $segments[0] === 'api' && isset($segments[1])) {
    $apiFile = __DIR__ . '/api/' . $segments[1] . '.php';

    if (file_exists($apiFile)) {
        require_once $apiFile;
    } else {
        http_response_code(404);
        echo json_encode(['error' => 'API endpoint not found']);
    }
} else {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid API request']);
}
