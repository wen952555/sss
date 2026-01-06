<?php
// 加载 .env 逻辑 (Serv00 专用)
$env = parse_ini_file('.env');

$host = $env['DB_HOST'] ?? 'localhost';
$db   = $env['DB_NAME'];
$user = $env['DB_USER'];
$pass = $env['DB_PASS'];
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
     $pdo = new PDO($dsn, $user, $pass, $options);
} catch (\PDOException $e) {
     // 如果数据库连接失败，输出 JSON 错误而不是 HTML 错误
     header('Content-Type: application/json');
     http_response_code(500);
     echo json_encode(['msg' => 'Database connection failed']);
     exit;
}

// 简单的认证中间件
function authCheck() {
    global $pdo;
    $token = $_REQUEST['token'] ?? '';
    if (!$token) {
        http_response_code(401);
        echo json_encode(['msg' => 'Unauthorized']);
        exit;
    }
    
    $stmt = $pdo->prepare("SELECT * FROM users WHERE password = ?"); // 实际应使用单独的 token 表，此处简化
    $stmt->execute([$token]);
    $user = $stmt->fetch();
    
    if (!$user) {
        http_response_code(401);
        echo json_encode(['msg' => 'Invalid Token']);
        exit;
    }
    return $user['id'];
}