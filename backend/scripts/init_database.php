<?php
// 数据库初始化脚本
require_once '../config/database.php';

$database = new Database();

// 尝试连接数据库
try {
    $conn = $database->getConnection();
    
    if (!$conn) {
        throw new Exception('无法连接到数据库，请检查配置');
    }
    
    echo "数据库连接成功！\n";
    
    // 创建用户表
    $sql = "CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        phone VARCHAR(20) UNIQUE NOT NULL,
        user_id VARCHAR(10) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        email VARCHAR(100),
        balance INT DEFAULT 1000,
        level INT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP NULL,
        INDEX idx_phone (phone),
        INDEX idx_user_id (user_id)
    )";
    
    $conn->exec($sql);
    echo "用户表创建成功！\n";
    
    // 创建预生成牌局表
    $sql = "CREATE TABLE IF NOT EXISTS pre_generated_games (
        id INT AUTO_INCREMENT PRIMARY KEY,
        session_type ENUM('2', '5', '10') NOT NULL COMMENT '场次类型',
        session_id INT NOT NULL COMMENT '场次ID (1-48)',
        round_number INT NOT NULL COMMENT '局数 (1-20)',
        player1_original JSON NOT NULL COMMENT '玩家1原始手牌',
        player1_arranged JSON NOT NULL COMMENT '玩家1智能理牌结果',
        player2_original JSON NOT NULL COMMENT '玩家2原始手牌',
        player2_arranged JSON NOT NULL COMMENT '玩家2智能理牌结果', 
        player3_original JSON NOT NULL COMMENT '玩家3原始手牌',
        player3_arranged JSON NOT NULL COMMENT '玩家3智能理牌结果',
        player4_original JSON NOT NULL COMMENT '玩家4原始手牌',
        player4_arranged JSON NOT NULL COMMENT '玩家4智能理牌结果',
        status ENUM('available', 'used') DEFAULT 'available' COMMENT '牌局状态',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_session_type (session_type),
        INDEX idx_status (status),
        UNIQUE KEY uk_session_round (session_type, session_id, round_number)
    )";
    
    $conn->exec($sql);
    echo "预生成牌局表创建成功！\n";
    
    // 创建玩家提交表
    $sql = "CREATE TABLE IF NOT EXISTS player_submissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        game_id INT NOT NULL COMMENT '关联牌局ID',
        user_id INT NOT NULL COMMENT '玩家ID',
        arranged_cards JSON NOT NULL COMMENT '玩家提交的分牌结果',
        total_score INT DEFAULT 0 COMMENT '总得分',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (game_id) REFERENCES pre_generated_games(id),
        INDEX idx_user_id (user_id),
        INDEX idx_game_id (game_id)
    )";
    
    $conn->exec($sql);
    echo "玩家提交表创建成功！\n";
    
    // 创建积分转账记录表
    $sql = "CREATE TABLE IF NOT EXISTS balance_transfers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        from_user_id INT NOT NULL,
        to_user_id INT NOT NULL,
        amount INT NOT NULL,
        note VARCHAR(255) DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (from_user_id) REFERENCES users(id),
        FOREIGN KEY (to_user_id) REFERENCES users(id),
        INDEX idx_from_user (from_user_id),
        INDEX idx_to_user (to_user_id)
    )";
    
    $conn->exec($sql);
    echo "积分转账记录表创建成功！\n";
    
    // 创建库存监控表
    $sql = "CREATE TABLE IF NOT EXISTS inventory_monitor (
        id INT AUTO_INCREMENT PRIMARY KEY,
        session_type ENUM('2', '5', '10') NOT NULL,
        total_games INT DEFAULT 0 COMMENT '总牌局数',
        available_games INT DEFAULT 0 COMMENT '可用牌局数',
        last_replenish TIMESTAMP NULL COMMENT '最后补货时间',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_session_type (session_type)
    )";
    
    $conn->exec($sql);
    echo "库存监控表创建成功！\n";
    
    echo "\n所有数据库表初始化完成！\n";
    
} catch (Exception $e) {
    echo "错误: " . $e->getMessage() . "\n";
    echo "请检查数据库配置是否正确。\n";
}
?>