<?php
// 通过SSH运行: php /path/to/your/project/backend/import_db.php

// --- 配置区域 ---
// 直接在此处填写您的数据库信息，因为此脚本独立运行，不加载.env
$db_host = 'localhost';
$db_name = 'your_db_name';
$db_user = 'your_db_user';
$db_pass = 'your_db_password';
// --- 配置区域结束 ---

try {
    $pdo = new PDO("mysql:host=$db_host;dbname=$db_name;charset=utf8mb4", $db_user, $db_pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo "数据库连接成功!\n";
} catch (PDOException $e) {
    die("数据库连接失败: " . $e->getMessage() . "\n");
}

$sql = "
-- 删除已存在的表 (方便重新导入)
DROP TABLE IF EXISTS `settlement_results`, `user_game_submissions`, `player_batch_assignments`, `batch_player_status`, `pre_generated_games`, `point_transfers`, `users`;

-- 用户表
CREATE TABLE `users` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id_4d` VARCHAR(4) NOT NULL UNIQUE,
  `phone` VARCHAR(20) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `nickname` VARCHAR(50),
  `points` BIGINT NOT NULL DEFAULT 1000,
  `is_bot` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 积分转移记录表
CREATE TABLE `point_transfers` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `from_user_id` INT UNSIGNED NOT NULL,
  `to_user_id` INT UNSIGNED NOT NULL,
  `amount` BIGINT NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`from_user_id`) REFERENCES `users`(`id`),
  FOREIGN KEY (`to_user_id`) REFERENCES `users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 预生成牌局表
CREATE TABLE `pre_generated_games` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `table_id` TINYINT UNSIGNED NOT NULL,
  `game_index_in_table` SMALLINT UNSIGNED NOT NULL,
  `dealt_cards_json` JSON NOT NULL,
  UNIQUE KEY `table_game_index` (`table_id`, `game_index_in_table`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 玩家场次状态表
CREATE TABLE `batch_player_status` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NOT NULL,
  `table_id` TINYINT UNSIGNED NOT NULL,
  `batch_number` INT UNSIGNED NOT NULL,
  `status` ENUM('in_progress', 'completed', 'settled', 'abandoned') NOT NULL DEFAULT 'in_progress',
  `games_played_count` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `pending_ai_assistance` BOOLEAN NOT NULL DEFAULT FALSE,
  `assistance_from_game_index` SMALLINT UNSIGNED DEFAULT NULL,
  `started_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at` TIMESTAMP NULL DEFAULT NULL,
  `settlement_group_id` INT UNSIGNED DEFAULT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`),
  UNIQUE KEY `player_batch` (`user_id`, `table_id`, `batch_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 玩家场次任务分配表 (用于乱序反作弊)
CREATE TABLE `player_batch_assignments` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NOT NULL,
  `table_id` TINYINT UNSIGNED NOT NULL,
  `batch_number` INT UNSIGNED NOT NULL,
  `game_order_json` JSON NOT NULL,
  `current_step` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`),
  UNIQUE KEY `player_batch_assignment` (`user_id`, `table_id`, `batch_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 玩家单局提交记录表
CREATE TABLE `user_game_submissions` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NOT NULL,
  `pre_gen_game_id` INT UNSIGNED NOT NULL,
  `submitted_cards_json` JSON NOT NULL,
  `is_ai_submitted` BOOLEAN NOT NULL DEFAULT FALSE,
  `submitted_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`),
  FOREIGN KEY (`pre_gen_game_id`) REFERENCES `pre_generated_games`(`id`),
  UNIQUE KEY `player_submission` (`user_id`, `pre_gen_game_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 结算结果详情表
CREATE TABLE `settlement_results` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `settlement_group_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `pre_gen_game_id` INT UNSIGNED NOT NULL,
  `score` INT NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`),
  FOREIGN KEY (`pre_gen_game_id`) REFERENCES `pre_generated_games`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
";

try {
    $pdo->exec($sql);
    echo "所有数据表创建成功!\n";
} catch (PDOException $e) {
    die("数据表创建失败: " . $e->getMessage() . "\n");
}

?>