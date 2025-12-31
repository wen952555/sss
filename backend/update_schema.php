<?php
// 一次性数据库架构更新脚本
echo "数据库架构更新脚本...\n";

// 1. 加载配置
require_once __DIR__ . '/config.php';

echo "- 配置已加载\n";

// 2. 连接数据库
echo "- 正在连接数据库... ";
try {
    $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME;
    $conn = new PDO($dsn, DB_USER, DB_PASS);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $conn->exec("SET NAMES utf8mb4");
    echo "✅ 成功\n";
} catch (PDOException $e) {
    echo "❌ 失败: " . $e->getMessage() . "\n";
    exit(1);
}

// 3. 修改 users 表结构
echo "- 正在修正 'users' 表的 'password' 字段... ";
try {
    $sql = "ALTER TABLE users MODIFY password VARCHAR(255) NOT NULL";
    $conn->exec($sql);
    echo "✅ 成功! 'password' 字段长度已更新为 255。\n";
} catch (PDOException $e) {
    echo "❌ 失败: " . $e->getMessage() . "\n";
    echo "(如果错误信息是 'column already exists' 或类似提示，说明字段已是正确长度，可以忽略此错误。)\n";
}

echo "\n架构更新完成！\n";

// 关闭连接
$conn = null;
?>