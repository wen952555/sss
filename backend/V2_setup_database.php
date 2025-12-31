<?php
require __DIR__ . '/db.php';

echo "Starting database setup...\n";

// Drop old tables if they exist to ensure a clean slate
$pdo->exec("DROP TABLE IF EXISTS game_plays, active_games, reservations, stadium_deals, stadiums, transfers, users;");
echo "Dropped all old tables.\n";

$sql = "
-- Users and Points System
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    short_id VARCHAR(4) UNIQUE NOT NULL COMMENT 'Short, user-facing ID for friending and transfers',
    phone VARCHAR(20) UNIQUE NOT NULL COMMENT 'Phone number for login',
    password VARCHAR(255) NOT NULL,
    points INT DEFAULT 1000 NOT NULL COMMENT 'User's points balance',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Point transfer history
CREATE TABLE transfers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    from_user_id INT NOT NULL,
    to_user_id INT NOT NULL,
    amount INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (from_user_id) REFERENCES users(id),
    FOREIGN KEY (to_user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Stadiums to hold pre-generated deals
CREATE TABLE stadiums (
    id INT AUTO_INCREMENT PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Pre-generated deals for each stadium
CREATE TABLE stadium_deals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    stadium_id INT NOT NULL,
    deal_index INT NOT NULL COMMENT '1-10, for the 10 rounds in a game',
    hands JSON NOT NULL COMMENT '{"north":[...],"east":[...],"south":[...],"west":[...]}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY (stadium_id, deal_index),
    FOREIGN KEY (stadium_id) REFERENCES stadiums(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Nightly reservations queue
CREATE TABLE reservations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNIQUE NOT NULL COMMENT 'A user can only have one reservation at a time',
    reservation_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Active games that are currently being played
CREATE TABLE active_games (
    id INT AUTO_INCREMENT PRIMARY KEY,
    stadium_id INT UNIQUE NOT NULL COMMENT 'Each game uses one unique stadium',
    status ENUM('active', 'completed', 'aborted') DEFAULT 'active',
    current_round INT DEFAULT 1 NOT NULL,
    player_1_id INT NOT NULL,
    player_2_id INT NOT NULL,
    player_3_id INT NOT NULL,
    player_4_id INT NOT NULL,
    -- Scores for each player
    player_1_score INT DEFAULT 0, 
    player_2_score INT DEFAULT 0,
    player_3_score INT DEFAULT 0,
    player_4_score INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_action_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (stadium_id) REFERENCES stadiums(id),
    FOREIGN KEY (player_1_id) REFERENCES users(id),
    FOREIGN KEY (player_2_id) REFERENCES users(id),
    FOREIGN KEY (player_3_id) REFERENCES users(id),
    FOREIGN KEY (player_4_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Individual plays within each game round
CREATE TABLE game_plays (
    id INT AUTO_INCREMENT PRIMARY KEY,
    active_game_id INT NOT NULL,
    user_id INT NOT NULL,
    round_number INT NOT NULL,
    deal_id INT NOT NULL,
    sorted_hand JSON NOT NULL,
    score INT NOT NULL COMMENT 'Score for this specific round/hand',
    is_autopilot BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (active_game_id) REFERENCES active_games(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (deal_id) REFERENCES stadium_deals(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

";

try {
    $pdo->exec($sql);
    echo "All V2 tables created successfully!\n";
} catch (PDOException $e) {
    die("Database setup failed: " . $e->getMessage() . "\n");
}

echo "Database setup finished.\n";
?>