<?php
// set_webhook.php

// 浏览器访问此文件以设置 webhook
// 例如: https://9525.ip-ddns.com/set_webhook.php

// 加载数据库和配置
require __DIR__ . '/db.php';

global $config; // 从 db.php 获取 $config 数组

$botToken = $config['TG_BOT_TOKEN'] ?? null;

if (!$botToken) {
    die('错误: TG_BOT_TOKEN 未在 .env 文件中配置。');
}

// --- 自动构建 Webhook URL ---

// 1. 获取协议 (http 或 https)
$protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? "https" : "http";

// 2. 获取域名
$host = $_SERVER['HTTP_HOST'];

// 3. 组合成指向 bot.php 的最终 URL
// 因为所有文件都在根目录，所以直接在域名后加上 bot.php
$webhookUrl = $protocol . "://" . $host . "/bot.php";

// --- 调用 Telegram API ---

$apiUrl = "https://api.telegram.org/bot$botToken/setWebhook?url=" . urlencode($webhookUrl);

// 发送请求
$response = @file_get_contents($apiUrl);

// --- 显示结果 ---

header('Content-Type: text/html; charset=utf-8');

echo "<html><head><title>Webhook 设置</title></head><body>";
echo "<h1>Telegram Webhook 设置结果</h1>";

if ($response === false) {
    echo "<p style='color:red;'><b>请求失败！</b>无法连接到 Telegram API。请检查服务器网络或 Bot Token 是否正确。</p>";
} else {
    echo "<p>已尝试将 Webhook 设置为:</p>";
    echo "<pre>" . htmlspecialchars($webhookUrl) . "</pre>";
    echo "<p>Telegram 服务器返回的结果:</p>
    <pre>" . htmlspecialchars($response) . "</pre>";

    $responseData = json_decode($response, true);
    if ($responseData && $responseData['ok']) {
        echo "<p style='color:green;'><b>成功！</b>你的机器人现在应该可以接收消息了。</p>";
    } else {
        echo "<p style='color:red;'><b>失败！</b>请检查上面的错误信息。</p>";
    }
}

echo "</body></html>";
