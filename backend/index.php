<?php
require_once __DIR__ . '/includes/config.php';

$request = $_SERVER['REQUEST_URI'];
$apiPath = str_replace('/api/', '', parse_url($request, PHP_URL_PATH));

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

switch ($apiPath) {
    case 'user':
        require __DIR__ . '/api/user.php';
        break;
    case 'game':
        require __DIR__ . '/api/game.php';
        break;
    case 'points':
        require __DIR__ . '/api/points.php';
        break;
    default:
        http_response_code(404);
        echo json_encode(['error' => 'Endpoint not found']);
}
?>
