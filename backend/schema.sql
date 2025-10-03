-- backend/schema.sql

-- Table to store each game session
CREATE TABLE games (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table to store player scores and hands for each game
CREATE TABLE player_scores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    game_id INT NOT NULL,
    player_id VARCHAR(255) NOT NULL,
    player_name VARCHAR(255) NOT NULL,
    hand_front JSON,
    hand_middle JSON,
    hand_back JSON,
    score INT NOT NULL,
    special_hand_type VARCHAR(255),
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);

-- Table to store user information for authentication
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);