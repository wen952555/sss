<?php
// backend/set_webhook.php
// 浏览器访问: https://9525.ip-ddns.com/set_webhook.php
require 'db.php';

$botToken = getenv('TG_BOT_TOKEN');
// 自动获取当前脚本所在的域名路径，并指向 bot.php
$protocol = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') ? "https" : "http";
$host = $_SERVER['HTTP_HOST'];
// 假设 bot.php 在根目录
$webhookUrl = "$protocol://$host/bot.php";

$apiUrl = "https://api.telegram.org/bot$botToken/setWebhook?url=" . urlencode($webhookUrl);

$response = file_get_contents($apiUrl);
echo "设置 Webhook 结果: <br>";
echo $response;
echo "<br><br>目标地址: $webhookUrl";
?>