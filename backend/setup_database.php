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
  `game_mode` varchar(50) NOT NULL,
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
  PRIMARY KEY (`id`),
  UNIQUE KEY `room_id_user_id` (`room_id`,`user_id`)
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

$stmt = $conn->prepare("INSERT INTO users (phone, password, points) VALUES (?, ?, 1000) ON DUPLICATE KEY UPDATE password = VALUES(password)");
foreach ($users as $user) {
    $phone = $user[0];
    $passwordHash = password_hash($user[1], PASSWORD_DEFAULT);
    $stmt->bind_param("ss", $phone, $passwordHash);
    $stmt->execute();
}
$stmt->close();
echo "Test users inserted or updated successfully.\n";


$conn->close();
?>
