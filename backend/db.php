<?php
// backend/db.php

ini_set('display_errors', 1);
error_reporting(E_ALL);

/**
 * 从 .env 文件加载配置到 PHP 数组中。
 * @param string $path .env 文件的路径。
 * @return array 加载的配置项。
 */
function loadEnvToArray($path): array
{
    $env = [];
    if (!file_exists($path) || !is_readable($path)) {
        return $env;
    }

    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        // 跳过注释
        if (strpos(trim($line), '#') === 0) {
            continue;
        }

        // 分割键和值
        if (strpos($line, '=') !== false) {
            list($name, $value) = explode('=', $line, 2);
            $name = trim($name);
            // 移除值两边的引号（单引号或双引号）
            $value = trim($value, "\"' ");
            $env[$name] = $value;
        }
    }
    return $env;
}

// 加载配置
$config = loadEnvToArray(__DIR__ . '/.env');

// 数据库连接
try {
    $host = $config['DB_HOST'] ?? null;
    $db   = $config['DB_DATABASE'] ?? null;
    $user = $config['DB_USERNAME'] ?? null;
    $pass = $config['DB_PASSWORD'] ?? null;

    if (!$host || !$db || !$user) {
        die("FATAL ERROR: 数据库配置 (DB_HOST, DB_DATABASE, DB_USERNAME) 未在 .env 文件中正确设置。");
    }

    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8mb4", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

} catch (PDOException $e) {
    // 在发生错误时提供清晰的退出信息
    die('数据库连接失败: ' . $e->getMessage());
}

/**
 * API 认证函数 (为未来 API 使用保留)
 */
function authenticate($pdo)
{
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';

    if (preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
        $token = $matches[1];
        $stmt = $pdo->prepare("SELECT * FROM users WHERE api_token = ?");
        $stmt->execute([$token]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($user) {
            return $user;
        }
    }

    http_response_code(401);
    header('Content-Type: application/json');
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
    exit;
}

// 注意：原 db.php 中的 header() 调用已被移除，因为对于 CLI bot 脚本，它们是不必要的，
// 并且会引起警告。 authenticate() 函数保留了 header 输出，因为它只用于 API 请求。
