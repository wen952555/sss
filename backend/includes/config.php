<?php
// 数据库配置
define('DB_HOST', 'localhost');
define('DB_NAME', 'thirteen_water');
define('DB_USER', 'root');
define('DB_PASS', '');

// JWT 密钥
define('JWT_SECRET', 'your_secret_key_here');

// Telegram Bot 配置
define('TELEGRAM_BOT_TOKEN', 'your_telegram_bot_token');
define('ADMIN_CHAT_IDS', ['admin_chat_id_1', 'admin_chat_id_2']);

// 允许的前端域名
header('Access-Control-Allow-Origin: https://xxx.9525.ip-ddns.com');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
?>
