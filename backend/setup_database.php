<?php
require_once __DIR__ . '/api/config.php';

// 1. Connect to MySQL server without selecting a database
$conn = new mysqli($DB_HOST, $DB_USER, $DB_PASS);
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error . "\n");
}

// 2. Create the database if it doesn't exist
$dbName = $DB_NAME;
$sqlCreateDb = "CREATE DATABASE IF NOT EXISTS `$dbName` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;";
if ($conn->query($sqlCreateDb) === TRUE) {
    echo "Database '$dbName' created successfully or already exists.\n";
} else {
    die("Error creating database: " . $conn->error . "\n");
}
$conn->close();

// 3. Now connect to the specific database
require_once __DIR__ . '/api/db_connect.php';
$conn = db_connect();

// 4. SQL to create tables
$sql = "
CREATE TABLE IF NOT EXISTS `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `phone` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `points` int(11) NOT NULL DEFAULT 1000,
  `last_active` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `phone` (`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `game_rooms` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `game_type` varchar(50) NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'waiting',
  `player_count` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `room_players` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `room_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `is_ready` tinyint(1) NOT NULL DEFAULT '0',
  `is_auto_managed` tinyint(1) NOT NULL DEFAULT '0',
  `initial_hand` text,
  `score` INT NOT NULL DEFAULT 0,
  `submitted_hand` TEXT,
  PRIMARY KEY (`id`),
  UNIQUE KEY `room_id_user_id` (`room_id`,`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `pre_dealt_hands` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `player_count` int(11) NOT NULL,
  `hands` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`hands`)),
  `is_used` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `game_hand_comparisons` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `room_id` int(11) NOT NULL,
  `player1_id` int(11) NOT NULL,
  `player2_id` int(11) NOT NULL,
  `lane` enum('top','middle','bottom') NOT NULL,
  `result` enum('win','loss','draw') NOT NULL,
  `score_change` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `tg_admins` (
  `chat_id` bigint(20) NOT NULL,
  PRIMARY KEY (`chat_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `tg_admin_states` (
  `chat_id` bigint(20) NOT NULL,
  `state` varchar(255) DEFAULT NULL,
  `state_data` text DEFAULT NULL,
  PRIMARY KEY (`chat_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
";

if ($conn->multi_query($sql)) {
    // To prevent "Commands out of sync" error, we need to handle all results.
    do {
        if ($result = $conn->store_result()) {
            $result->free();
        }
    } while ($conn->more_results() && $conn->next_result());
    echo "Tables created successfully.\n";
} else {
    echo "Error creating tables: " . $conn->error . "\n";
}

// 5. Insert test users with hashed passwords
$users = [
    ['user1', 'password'],
    ['user2', 'password'],
    ['user3', 'password'],
    ['user4', 'password'],
    ['user5', 'password'],
];

$stmt_delete = $conn->prepare("DELETE FROM users WHERE phone = ?");
foreach ($users as $user) {
    $phone = $user[0];
    $stmt_delete->bind_param("s", $phone);
    $stmt_delete->execute();
}
$stmt_delete->close();

$stmt = $conn->prepare("INSERT INTO users (phone, password, points) VALUES (?, ?, 1000)");
foreach ($users as $user) {
    $phone = $user[0];
    $passwordHash = password_hash($user[1], PASSWORD_DEFAULT);
    $stmt->bind_param("ss", $phone, $passwordHash);
    $stmt->execute();
}
$stmt->close();
echo "Test users inserted or updated successfully.\n";

// 6. Insert Super Admin for Telegram Bot
if (isset($TELEGRAM_SUPER_ADMIN_ID) && !empty($TELEGRAM_SUPER_ADMIN_ID)) {
    $superAdminId = $TELEGRAM_SUPER_ADMIN_ID;
    $stmt_admin = $conn->prepare("INSERT INTO tg_admins (chat_id) VALUES (?) ON DUPLICATE KEY UPDATE chat_id = ?");
    $stmt_admin->bind_param("ii", $superAdminId, $superAdminId);
$stmt_admin->execute();
$stmt_admin->close();
echo "Super admin for Telegram bot inserted successfully.\n";

// --- Add Indexes for Performance ---
$room_code_exists = $conn->query("SHOW COLUMNS FROM `game_rooms` LIKE 'room_code'")->num_rows > 0;
if (!$room_code_exists) {
    $conn->query("ALTER TABLE `game_rooms` ADD `room_code` VARCHAR(6) NULL, ADD UNIQUE (`room_code`);");
}

$index1_exists = $conn->query("SHOW INDEX FROM game_rooms WHERE Key_name = 'idx_room_code'")->num_rows > 0;
if (!$index1_exists) {
    $conn->query("CREATE INDEX idx_room_code ON game_rooms(room_code);");
}

$index2_exists = $conn->query("SHOW INDEX FROM pre_dealt_hands WHERE Key_name = 'idx_pre_dealt_hands'")->num_rows > 0;
if (!$index2_exists) {
    $conn->query("CREATE INDEX idx_pre_dealt_hands ON pre_dealt_hands(player_count, is_used);");
}
echo "Indexes created or already exist.\n";

$conn->close();
?>
