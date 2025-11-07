<?php
require_once __DIR__ . '/../core/bootstrap.php';

// 简单的原生PHP路由
$request_uri = $_SERVER['REQUEST_URI'];
$endpoint = trim(parse_url($request_uri, PHP_URL_PATH), '/');

// Cloudflare Worker会将 /api/... 代理到后端根目录
// 所以 endpoint 可能是 'api/user/register'
// 我们移除 'api/' 前缀
if (substr($endpoint, 0, 4) === 'api/') {
    $endpoint = substr($endpoint, 4);
}

$parts = explode('/', $endpoint);
$resource = $parts[0] ?? null;
$action = $parts[1] ?? null;

switch ($resource) {
    case 'user':
        require_once __DIR__ . '/user_handler.php';
        handle_user_request($action, $parts);
        break;

    case 'game':
        require_once __DIR__ . '/game_handler.php';
        handle_game_request($action, $parts);
        break;
    
    case 'tables':
        if ($action === 'status') {
             require_once __DIR__ . '/game_handler.php';
             get_tables_status();
        } else {
             json_response(['error' => 'Invalid action for tables'], 404);
        }
        break;

    default:
        json_response(['error' => 'Endpoint not found'], 404);
        break;
}
?>