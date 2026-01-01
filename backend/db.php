<?php
/**
 * 路径: backend/db.php
 * 描述: 数据库连接配置文件，读取 .env 并建立 PDO 连接
 */

// 1. 指定 .env 文件的绝对路径（假设在同级目录）
$envFile = __DIR__ . '/.env';

if (!file_exists($envFile)) {
    header('Content-Type: application/json');
    die(json_encode(['error' => '服务器配置错误：.env 文件不存在']));
}

// 2. 解析 .env 文件 (Serv00 推荐格式: KEY=VALUE)
$env = parse_ini_file($envFile);

$db_host = $env['DB_HOST'] ?? '';
$db_name = $env['DB_NAME'] ?? '';
$db_user = $env['DB_USER'] ?? '';
$db_pass = $env['DB_PASS'] ?? '';

// 3. 建立连接
try {
    // 设置 DSN，强制使用 utf8mb4 字符集以支持特殊字符
    $dsn = "mysql:host=$db_host;dbname=$db_name;charset=utf8mb4";
    
    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION, // 开启异常模式
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,       // 默认返回关联数组
        PDO::ATTR_EMULATE_PREPARES   => false,                  // 禁用模拟预处理，提高安全性
    ];

    $pdo = new PDO($dsn, $db_user, $db_pass, $options);

} catch (PDOException $e) {
    // 如果连接失败，向前端返回 JSON 错误
    header('Content-Type: application/json');
    echo json_encode(['error' => '数据库连接失败: ' . $e->getMessage()]);
    exit;
}
