<?php
// 解析 .env 获取配置
function getEnvConfig($key) {
    $env = parse_ini_file('.env');
    return $env[$key] ?? null;
}

$host = getEnvConfig('DB_HOST');
$dbname = getEnvConfig('DB_NAME');
$user = getEnvConfig('DB_USER');
$pass = getEnvConfig('DB_PASS');

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    die("Connection failed: " . $e->getMessage());
}
?>