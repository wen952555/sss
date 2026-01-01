'''<?php
// V2 版数据库设置脚本
// 包含数据库连接
require_once 'db_connect.php';

// 定义表结构
// 使用 TEXT 作为主键类型以支持更长的 ID
// short_id 用于外部展示和操作
$sql = "
-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    short_id VARCHAR(10) UNIQUE NOT NULL,
    session_token VARCHAR(255) DEFAULT NULL,
    session_expires_at DATETIME DEFAULT NULL,
    points INT DEFAULT 100 -- 新增积分字段，默认为 100
);

-- 预约场次表
CREATE TABLE IF NOT EXISTS reservation_slots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type VARCHAR(50) NOT NULL, -- 'morning' 或 'afternoon'
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    total_slots INT NOT NULL,
    UNIQUE (type)
);

-- 用户预约记录表
CREATE TABLE IF NOT EXISTS reservations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    slot_id INTEGER NOT NULL,
    reservation_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'active', -- active, cancelled
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (slot_id) REFERENCES reservation_slots (id),
    UNIQUE (user_id, slot_id, reservation_date)
);
";

try {
    // 检查 users 表是否存在 points 字段
    $stmt = $pdo->query("PRAGMA table_info(users);");
    $columns = $stmt->fetchAll(PDO::FETCH_COLUMN, 1);
    
    if (!in_array('points', $columns)) {
        // 如果不存在，则添加
        $pdo->exec("ALTER TABLE users ADD COLUMN points INT DEFAULT 100;");
        echo "字段 'points' 已成功添加到 'users' 表。
";
    }

    // 执行其他表结构同步
    $pdo->exec($sql);
    echo "数据库结构同步成功！
";

} catch (PDOException $e) {
    die("数据库同步失败: " . $e->getMessage() . "
");
}
?>
''