<?php
require_once 'config.php';

// 简单的路由
$request = $_SERVER['REQUEST_URI'];
$apiBase = '/api/';

if (strpos($request, $apiBase) === 0) {
    $apiEndpoint = substr($request, strlen($apiBase));
    
    if ($apiEndpoint === 'game') {
        require 'api/game.php';
    } elseif ($apiEndpoint === 'auth') {
        require 'api/auth.php';
    } else {
        http_response_code(404);
        echo json_encode(['error' => 'Endpoint not found']);
    }
} else {
    // 处理前端路由
    header('Content-Type: text/html');
    echo '<!DOCTYPE html><html><head><title>十三水游戏服务器</title></head><body>';
    echo '<h1>十三水游戏服务器</h1>';
    echo '<p>API服务已运行，请从前端应用访问游戏功能。</p>';
    echo '<p>当前时间: ' . date('Y-m-d H:i:s') . '</p>';
    echo '</body></html>';
}
