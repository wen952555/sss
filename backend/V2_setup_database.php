<?php
require __DIR__ . '/db.php';

echo "开始同步数据库结构...\n";

// 建议在生产环境手动执行 ALTER TABLE，此处为初始化逻辑
$sql = "
-- 用户表 (移除了 points，使用 phone 作为主要标识)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    short_id VARCHAR(4) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 场次表
CREATE TABLE IF NOT EXISTS stadiums (
    id INT AUTO_INCREMENT PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 牌局表
CREATE TABLE IF NOT EXISTS stadium_deals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    stadium_id INT NOT NULL,
    deal_index INT NOT NULL,
    hands JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (stadium_id) REFERENCES stadiums(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 预约表 (支持分场次和牌型记录)
CREATE TABLE IF NOT EXISTS reservations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    reservation_date DATE NOT NULL,
    session_type VARCHAR(20) NOT NULL DEFAULT 'today' COMMENT 'today 或 tomorrow',
    hand_description VARCHAR(255) NULL,
    hand_rank INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uq_user_res (user_id, reservation_date, session_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 游戏对局表
CREATE TABLE IF NOT EXISTS active_games (
    id INT AUTO_INCREMENT PRIMARY KEY,
    stadium_id INT UNIQUE NOT NULL,
    status ENUM('active', 'completed') DEFAULT 'active',
    current_round INT DEFAULT 1,
    player_1_id INT,
    player_2_id INT,
    player_3_id INT,
    player_4_id INT,
    last_action_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (stadium_id) REFERENCES stadiums(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 玩家出牌记录
CREATE TABLE IF NOT EXISTS game_plays (
    id INT AUTO_INCREMENT PRIMARY KEY,
    active_game_id INT NOT NULL,
    user_id INT NOT NULL,
    round_number INT NOT NULL,
    deal_id INT NOT NULL,
    sorted_hand JSON NOT NULL,
    score INT DEFAULT 0,
    is_autopilot BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (active_game_id) REFERENCES active_games(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
";

try {
    $pdo->exec($sql);
    echo "数据库结构同步成功！\n";
} catch (PDOException $e) {
    die("数据库同步失败: " . $e->getMessage() . "\n");
}
?>