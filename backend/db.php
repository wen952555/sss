<?php
/**
 * 文件路径: backend/db.php
 * 描述: 数据库连接与通用授权函数
 */

// 1. 设置通用的 JSON 响应头和跨域头
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

// 处理预检请求 (CORS)
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(204);
    exit;
}

// 2. 加载配置并连接数据库
try {
    // 假设 .env 文件与 db.php 在同一目录或上级目录
    // .env 格式应为: DB_HOST=xxx \n DB_NAME=xxx ...
    $env = parse_ini_file('.env');

    if (!$env) {
        throw new Exception("无法读取 .env 配置文件");
    }

    $host = $env['DB_HOST'] ?? 'localhost';
    $db   = $env['DB_NAME'];
    $user = $env['DB_USER'];
    $pass = $env['DB_PASS'];
    $charset = 'utf8mb4';

    $dsn = "mysql:host=$host;dbname=$db;charset=$charset";
    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION, // 开启异常模式
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,       // 默认返回关联数组
        PDO::ATTR_EMULATE_PREPARES   => false,                  // 禁用模拟预处理，提高安全性
    ];

    $pdo = new PDO($dsn, $user, $pass, $options);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['msg' => '数据库连接失败: ' . $e->getMessage()]);
    exit;
}

/**
 * 通用验证函数：检查 Token 并返回用户 ID
 * 前端会在请求中带上 token (可能是登录时返回的 password hash)
 */
function authCheck() {
    global $pdo;

    // 尝试从 POST, GET 或 Header 中获取 Token
    $token = $_REQUEST['token'] ?? '';
    
    if (empty($token)) {
        // 也可以检查 Authorization Header
        $headers = getallheaders();
        if (isset($headers['Authorization'])) {
            $token = str_replace('Bearer ', '', $headers['Authorization']);
        }
    }

    if (empty($token)) {
        http_response_code(401);
        echo json_encode(['msg' => '未登录 (Token Missing)']);
        exit;
    }

    // 在本项目的简化逻辑中，我们使用 users 表中的 password 字段作为简单的 Token
    // 实际生产环境建议单独建立 tokens 表
    $stmt = $pdo->prepare("SELECT id FROM users WHERE password = ?");
    $stmt->execute([$token]);
    $user = $stmt->fetch();

    if (!$user) {
        http_response_code(401);
        echo json_encode(['msg' => '登录已失效，请重新登录']);
        exit;
    }

    return $user['id'];
}

/**
 * 辅助函数：快速返回 JSON
 */
function sendResponse($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data);
    exit;
}