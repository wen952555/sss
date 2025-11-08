<?php
// import_db.php
// 在 SSH 中运行: php /path/to/your/project/backend/import_db.php

// 增加错误报告，便于调试
error_reporting(E_ALL);
ini_set('display_errors', 1);

// 确保当前目录正确
chdir(__DIR__);

require_once './db.php';

try {
    echo "Attempting to connect to the database...\n";
    $pdo = getDBConnection();
    echo "Successfully connected to the database.\n\n";

    $sql = "
    -- 删除已存在的表，用于重新初始化
    DROP TABLE IF EXISTS `settlement_results`, `user_game_submissions`, `batch_player_status`, `game_batches`, `pre_generated_games`, `users`;
    
    -- 用户表
    CREATE TABLE `users` (
      `id` INT AUTO_INCREMENT PRIMARY KEY,
      `user_id_4d` VARCHAR(4) NOT NULL UNIQUE,
      `phone` VARCHAR(20) NOT NULL UNIQUE,
      `password_hash` VARCHAR(255) NOT NULL,
      `points` BIGINT NOT NULL DEFAULT 1000,
      `auth_token` VARCHAR(64) NULL UNIQUE,
      `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    -- 预生成牌局表
    CREATE TABLE `pre_generated_games` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `table_id` INT NOT NULL,
        `game_index_in_table` INT NOT NULL,
        `dealt_cards_json` JSON NOT NULL,
        INDEX (`table_id`, `game_index_in_table`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    -- 场次管理表 (已简化，只作标识)
    CREATE TABLE `game_batches` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `table_id` INT NOT NULL,
        `batch_number` INT NOT NULL,
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY (`table_id`, `batch_number`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    -- 玩家场次状态表
    CREATE TABLE `batch_player_status` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `user_id` INT NOT NULL,
        `batch_id` INT NOT NULL,
        `status` ENUM('in_progress', 'completed', 'settled', 'abandoned') NOT NULL DEFAULT 'in_progress',
        `games_played_count` INT NOT NULL DEFAULT 0,
        `assignment_order_json` JSON NOT NULL, -- 存储乱序后的牌局索引
        `completed_at` TIMESTAMP NULL,
        `settlement_group_id` INT NULL,
        FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
        FOREIGN KEY (`batch_id`) REFERENCES `game_batches`(`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    -- 玩家单局提交记录表
    CREATE TABLE `user_game_submissions` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `user_id` INT NOT NULL,
        `pre_gen_game_id` INT NOT NULL,
        `submitted_cards_json` JSON NOT NULL,
        `is_ai_generated` BOOLEAN NOT NULL DEFAULT FALSE,
        `submitted_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
        FOREIGN KEY (`pre_gen_game_id`) REFERENCES `pre_generated_games`(`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    
    -- 结算结果详情表
    CREATE TABLE `settlement_results` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `settlement_group_id` INT NOT NULL,
        `user_id` INT NOT NULL,
        `pre_gen_game_id` INT NOT NULL,
        `score` INT NOT NULL,
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX (`settlement_group_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ";

    echo "Executing SQL statements...\n";
    $pdo->exec($sql);
    echo "All tables created successfully.\n";

} catch (PDOException $e) {
    die("Database error: " . $e->getMessage() . "\n");
} catch (Throwable $e) {
    die("An unexpected error occurred: " . $e->getMessage() . "\n");
}

?>