<?php
// ======================
// 十三水游戏 - 数据库表创建脚本 (命令行专用)
// 用法: php create_tables.php
// 要求: 确保 .env 文件与此脚本在同一目录
// ======================

echo "=============================\n";
echo "十三水游戏数据库初始化脚本\n";
echo "=============================\n\n";

// 1. 加载环境变量 (优先从当前目录加载)
$current_dir = __DIR__; // 获取当前脚本所在目录
$env_path_local = $current_dir . '/.env'; // 当前目录下的 .env
$env_path_upper = dirname($current_dir) . '/.env'; // 上层目录的 .env

echo "正在查找环境配置文件...\n";

$env = null;
$env_file_used = '';

// 尝试从当前目录加载
if (file_exists($env_path_local)) {
    echo "- 找到: 当前目录 ({$env_path_local})\n";
    $env = parse_ini_file($env_path_local);
    $env_file_used = $env_path_local;
}
// 如果当前目录没有，尝试上层目录
else if (file_exists($env_path_upper)) {
    echo "- 找到: 上层目录 ({$env_path_upper})\n";
    $env = parse_ini_file($env_path_upper);
    $env_file_used = $env_path_upper;
}
// 两个地方都找不到
else {
    echo "❌ 错误：在以下位置均未找到 .env 文件：\n";
    echo "   1. {$env_path_local}\n";
    echo "   2. {$env_path_upper}\n";
    echo "\n请将 .env 文件放置在上述任一目录中。\n";
    exit(1);
}

if (!$env) {
    echo "❌ 错误：无法解析 .env 文件，请检查文件格式！\n";
    exit(1);
}

echo "✅ 环境配置文件加载成功: " . basename($env_file_used) . "\n\n";

// 提取配置
$db_host = $env['DB_HOST'] ?? 'localhost';
$db_name = $env['DB_NAME'] ?? 'thirteen_water';
$db_user = $env['DB_USER'] ?? '';
$db_pass = $env['DB_PASS'] ?? '';

// 检查必要的配置是否已设置
if (empty($db_user)) {
    echo "⚠️  警告：数据库用户 (DB_USER) 未在 .env 中设置。\n";
}
if (empty($db_pass)) {
    echo "⚠️  警告：数据库密码 (DB_PASS) 未在 .env 中设置。\n";
}

echo "数据库配置摘要：\n";
echo str_repeat("-", 40) . "\n";
printf("%-15s: %s\n", "主机", $db_host);
printf("%-15s: %s\n", "数据库名", $db_name);
printf("%-15s: %s\n", "用户名", $db_user ?: '(未设置)');
printf("%-15s: %s\n", "密码", $db_pass ? "********" : '(未设置)');
echo str_repeat("-", 40) . "\n\n";

// 2. 连接数据库
echo "正在连接数据库... ";
try {
    $dsn = "mysql:host={$db_host};dbname={$db_name}";
    $conn = new PDO($dsn, $db_user, $db_pass);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $conn->exec("SET NAMES utf8mb4");
    echo "✅ 成功\n\n";
} catch (PDOException $e) {
    echo "❌ 失败\n\n";
    echo "错误详情：\n";
    echo str_repeat("-", 40) . "\n";
    echo "错误信息: " . $e->getMessage() . "\n";
    echo "连接字符串: {$dsn}\n";
    echo str_repeat("-", 40) . "\n\n";
    echo "可能的解决方案：\n";
    echo "1. 检查 .env 中的数据库用户名和密码是否正确\n";
    echo "2. 确认数据库 '{$db_name}' 已存在\n";
    echo "3. 确认用户 '{$db_user}' 有访问该数据库的权限\n";
    exit(1);
}

// 3. 创建用户表
echo "1. 创建用户表 (users)... ";
try {
    $sql_users = "CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(4) NOT NULL UNIQUE,
        phone VARCHAR(20) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        points INT DEFAULT 0,
        is_admin BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_phone (phone),
        INDEX idx_user_id (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
    
    $conn->exec($sql_users);
    echo "✅ 完成\n";
} catch (PDOException $e) {
    echo "❌ 失败: " . $e->getMessage() . "\n";
}

// 4. 创建交易记录表
echo "2. 创建交易记录表 (transactions)... ";
try {
    $sql_transactions = "CREATE TABLE IF NOT EXISTS transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        from_user_id VARCHAR(4) NOT NULL,
        to_user_id VARCHAR(4) NOT NULL,
        points INT NOT NULL,
        type ENUM('transfer', 'game', 'admin_adjust') NOT NULL,
        description VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_from_user (from_user_id),
        INDEX idx_to_user (to_user_id),
        FOREIGN KEY (from_user_id) REFERENCES users(user_id) ON DELETE CASCADE,
        FOREIGN KEY (to_user_id) REFERENCES users(user_id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
    
    $conn->exec($sql_transactions);
    echo "✅ 完成\n";
} catch (PDOException $e) {
    echo "❌ 失败: " . $e->getMessage() . "\n";
}

// 5. 创建游戏记录表
echo "3. 创建游戏记录表 (games)... ";
try {
    $sql_games = "CREATE TABLE IF NOT EXISTS games (
        id INT AUTO_INCREMENT PRIMARY KEY,
        room_id VARCHAR(10) NOT NULL,
        players JSON NOT NULL,
        cards JSON,
        results JSON,
        winner_id VARCHAR(4),
        points_transferred JSON,
        bet_points INT DEFAULT 10,
        status ENUM('waiting', 'playing', 'finished', 'cancelled') DEFAULT 'waiting',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        started_at TIMESTAMP NULL,
        finished_at TIMESTAMP NULL,
        INDEX idx_room_id (room_id),
        INDEX idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
    
    $conn->exec($sql_games);
    echo "✅ 完成\n";
} catch (PDOException $e) {
    echo "❌ 失败: " . $e->getMessage() . "\n";
}

// 6. 创建默认管理员账户
echo "\n4. 创建默认管理员账户... ";
try {
    $sql_admin = "INSERT IGNORE INTO users (user_id, phone, password, points, is_admin) 
                  VALUES ('ADMN', '13800138000', :password, 10000, TRUE)";
    $stmt = $conn->prepare($sql_admin);
    $admin_password = password_hash('admin123', PASSWORD_BCRYPT);
    $stmt->bindParam(':password', $admin_password);
    
    $stmt->execute();
    $affected_rows = $stmt->rowCount();
    
    if ($affected_rows > 0) {
        echo "✅ 已创建新账户\n";
    } else {
        echo "ℹ️  账户已存在 (跳过)\n";
    }
} catch (PDOException $e) {
    echo "❌ 失败: " . $e->getMessage() . "\n";
}

// 7. 验证与总结
echo "\n" . str_repeat("=", 50) . "\n";
echo "数据库初始化完成！\n";
echo str_repeat("=", 50) . "\n\n";

echo "表状态概览：\n";
echo str_repeat("-", 50) . "\n";

$tables = ['users', 'transactions', 'games'];
$total_tables = 0;
$total_records = 0;

foreach ($tables as $table) {
    try {
        // 检查表是否存在
        $stmt = $conn->query("SHOW TABLES LIKE '{$table}'");
        $table_exists = ($stmt->rowCount() > 0);
        
        if ($table_exists) {
            $total_tables++;
            // 获取记录数
            $count_stmt = $conn->query("SELECT COUNT(*) as count FROM {$table}");
            $count = $count_stmt->fetch(PDO::FETCH_ASSOC)['count'];
            $total_records += $count;
            printf("  ✅ %-12s 存在 (有 %4d 条记录)\n", $table, $count);
        } else {
            printf("  ❌ %-12s 不存在\n", $table);
        }
    } catch (Exception $e) {
        printf("  ❌ %-12s 检查失败\n", $table);
    }
}

echo str_repeat("-", 50) . "\n";
printf("总计: %d 张表， %d 条记录\n", $total_tables, $total_records);

// 8. 重要提示
echo "\n" . str_repeat("*", 60) . "\n";
echo "重要提示\n";
echo str_repeat("*", 60) . "\n";
echo "1. 默认管理员账户:\n";
echo "   - 用户ID: ADMN\n";
echo "   - 手机号: 13800138000\n";
echo "   - 密码: admin123\n";
echo "   - 请首次登录后立即修改密码！\n\n";
echo "2. 前端地址: https://xxx.9525.ip-ddns.com\n";
echo "3. 后端API地址: https://wen76674.serv00.net/api/\n";
echo str_repeat("*", 60) . "\n";

// 关闭数据库连接
$conn = null;
?>