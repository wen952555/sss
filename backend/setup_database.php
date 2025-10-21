<?php
// backend/setup_database.php

require_once 'database.php';

$db = getDbConnection();

$commands = [
    'CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL
    )',
    'CREATE TABLE IF NOT EXISTS games (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_id TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )',
    'CREATE TABLE IF NOT EXISTS dealt_hands (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_id INTEGER NOT NULL,
        player_id INTEGER NOT NULL,
        hand TEXT NOT NULL,
        FOREIGN KEY (game_id) REFERENCES games(id),
        FOREIGN KEY (player_id) REFERENCES users(id)
    )',
    'CREATE TABLE IF NOT EXISTS player_hands (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_id INTEGER NOT NULL,
        player_id INTEGER NOT NULL,
        hand_front TEXT NOT NULL,
        hand_middle TEXT NOT NULL,
        hand_back TEXT NOT NULL,
        FOREIGN KEY (game_id) REFERENCES games(id),
        FOREIGN KEY (player_id) REFERENCES users(id)
    )',
    'CREATE TABLE IF NOT EXISTS player_scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_id INTEGER NOT NULL,
        player_id INTEGER NOT NULL,
        player_name TEXT NOT NULL,
        hand_front TEXT NOT NULL,
        hand_middle TEXT NOT NULL,
        hand_back TEXT NOT NULL,
        score INTEGER NOT NULL,
        special_hand_type TEXT,
        FOREIGN KEY (game_id) REFERENCES games(id),
        FOREIGN KEY (player_id) REFERENCES users(id)
    )'
];

foreach ($commands as $command) {
    if ($db->exec($command) === false) {
        die("Error executing command: " . $db->lastErrorMsg());
    }
}

echo "Database setup complete.";
