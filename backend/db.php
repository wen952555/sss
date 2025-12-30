<?php
// backend/db.php

ini_set('display_errors', 1);
error_reporting(E_ALL);
echo "Debug: Starting db.php\n";

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

function loadEnv($path) {
    echo "Debug: Inside loadEnv function.\n";
    if (!file_exists($path)) {
        echo "Debug: .env file not found at $path\n";
        return;
    }
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        if (!strpos($line, '=')) continue;
        list($name, $value) = explode('=', $line, 2);
        $name = trim($name);
        $value = trim($value, "\"' ");
        putenv("$name=$value");
        echo "Debug: Set ENV var $name\n";
    }
    echo "Debug: Finished loadEnv function.\n";
}

echo "Debug: About to call loadEnv.\n";
loadEnv(__DIR__ . '/.env');
echo "Debug: Finished calling loadEnv.\n";

try {
    echo "Debug: Entering try block.\n";
    $host = getenv('DB_HOST');
    $db   = getenv('DB_DATABASE');
    $user = getenv('DB_USERNAME');
    $pass = getenv('DB_PASSWORD');

    echo "Debug: DB_HOST = [$host]\n";
    echo "Debug: DB_DATABASE = [$db]\n";
    echo "Debug: DB_USERNAME = [$user]\n";

    if (!$host || !$db || !$user) {
        throw new Exception("数据库配置信息(ENV)加载失败，请检查 backend/.env 文件");
    }

    echo "Debug: About to create new PDO object.\n";
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8mb4", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo "Debug: PDO object created successfully.\n";
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error', 
        'message' => 'DB Error: ' . $e->getMessage()
    ]);
    exit;
}

function authenticate($pdo) {
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    if (preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
        $token = $matches[1];
        $stmt = $pdo->prepare("SELECT * FROM users WHERE api_token = ?");
        $stmt->execute([$token]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($user) return $user;
    }
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
    exit;
}
?>