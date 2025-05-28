<?php
// backend/includes/cors_config.php

// 允许的来源列表
$allowed_origins = [
    "http://localhost",         // 本地开发前端 (如果用 live-server 等)
    "http://127.0.0.1",       // 本地开发前端
    "null",                     // 对于本地 file:/// 协议 (一些浏览器发送 "null")
    // 在这里添加你的 Cloudflare Pages 域名，例如:
    // "https://yourproject.pages.dev"
];

// 如果你的 config.js 中的 API_BASE_URL 带有端口号，这里也要匹配
// 例如，如果前端在 http://localhost:5500 运行
// $allowed_origins[] = "http://localhost:5500";


if (isset($_SERVER['HTTP_ORIGIN']) && in_array($_SERVER['HTTP_ORIGIN'], $allowed_origins)) {
    header("Access-Control-Allow-Origin: {$_SERVER['HTTP_ORIGIN']}");
} else {
    // 如果请求的源不在允许列表中，可以选择不发送CORS头或发送一个默认的
    // header("Access-Control-Allow-Origin: https://your-default-allowed-origin.com");
    // 对于开发，如果遇到问题，可以临时设置为 "*" 但生产环境不推荐
    // header("Access-Control-Allow-Origin: *");
}

header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With, X-Auth-Token"); // 增加X-Auth-Token示例
header("Access-Control-Max-Age: 86400"); // 预检请求缓存1天

// 处理 OPTIONS 预检请求
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200); // OK
    exit();
}
