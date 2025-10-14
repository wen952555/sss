<?php
// backend/config.php

// --- 数据库配置 ---
$DB_HOST = '127.0.0.1';
$DB_USER = 'wcn_user';
$DB_PASS = 'wcn_password';
$DB_NAME = 'wcn_game';

// --- Telegram Bot 配置 ---
$TELEGRAM_BOT_TOKEN = 'YOUR_BOT_TOKEN'; // 请替换为你的 Telegram Bot Token
$TELEGRAM_BOT_ID = 'YOUR_BOT_ID';       // 通常是bot的username，没有@，如 MyBot 或者 bot的 user id
$GAME_URL = 'https://your-game-url.com'; // 游戏URL，用于TG机器人中的'开始游戏'按钮

// --- 其它可扩展配置 ---
// $ADMIN_USER_IDS = [123456789, ...]; // 可选: 管理员TG chat_id数组

// --- END OF FILE backend/config.php ---
?>
