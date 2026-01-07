<?php
require_once 'config.php';
// 任何人访问后端根域名，直接跳转到前端游戏首页
header("Location: " . $_ENV['FRONTEND_URL']);
exit;