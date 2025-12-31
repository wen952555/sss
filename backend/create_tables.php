<?php
require_once 'config.php';
require_once 'lib/db.php';

$database = new Database();
$conn = $database->getConnection();

// 创建用户表
$query = "CREATE TABLE IF NOT EXISTS users (
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

if($conn->exec($query)) {
    echo "Table 'users' created successfully.\n";
} else {
    print_r($conn->errorInfo());
}

// 创建交易记录表
$query = "CREATE TABLE IF NOT EXISTS transactions (
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

if($conn->exec($query)) {
    echo "Table 'transactions' created successfully.\n";
} else {
    print_r($conn->errorInfo());
}

// 创建游戏记录表
$query = "CREATE TABLE IF NOT EXISTS games (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_id VARCHAR(10) NOT NULL,
    players JSON NOT NULL,
    cards JSON NOT NULL,
    results JSON,
    winner_id VARCHAR(4),
    points_transferred JSON,
    status ENUM('waiting', 'playing', 'finished', 'cancelled') DEFAULT 'waiting',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    finished_at TIMESTAMP NULL,
    INDEX idx_room_id (room_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

if($conn->exec($query)) {
    echo "Table 'games' created successfully.\n";
} else {
    print_r($conn->errorInfo());
}

// 创建管理员用户（如果需要）
$query = "INSERT IGNORE INTO users (user_id, phone, password, points, is_admin) 
          VALUES ('admin', '13800138000', :password, 10000, TRUE)";
$stmt = $conn->prepare($query);
$admin_password = password_hash('admin123', PASSWORD_BCRYPT);
$stmt->bindParam(':password', $admin_password);

if($stmt->execute()) {
    echo "Admin user created (if not existed).\n";
}

echo "Database tables created successfully!\n";
?>