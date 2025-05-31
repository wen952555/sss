<?php
// backend/app/core/Database.php
namespace App\Core;

use PDO;
use PDOException;

class Database {
    private static $instance = null;
    private $conn;

    // ⭐ Adjust path to be relative to your serv00 root or an absolute path
    // Ensure the 'db' directory is writable by the web server.
    private $dbPath = __DIR__ . '/../../db/thirteen_water.sqlite';

    private function __construct() {
        try {
            $this->conn = new PDO("sqlite:" . $this->dbPath);
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
            $this->initializeTables();
        } catch (PDOException $e) {
            // In a real app, log this error properly
            error_log("Database Connection Error: " . $e->getMessage());
            throw new \Exception("Could not connect to the database. Path: " . $this->dbPath . " Error: " . $e->getMessage());
        }
    }

    public static function getInstance() {
        if (!self::$instance) {
            self::$instance = new Database();
        }
        return self::$instance;
    }

    public function getConnection() {
        return $this->conn;
    }

    private function initializeTables() {
        $commands = [
            // Users Table
            "CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                phone_number TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                points INTEGER DEFAULT 1000,
                auth_token TEXT,
                token_expires_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )",
            // Rooms Table
            "CREATE TABLE IF NOT EXISTS rooms (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                room_code TEXT UNIQUE NOT NULL, -- e.g., 6-digit code
                status TEXT NOT NULL DEFAULT 'waiting', -- waiting, playing, finished
                max_players INTEGER DEFAULT 2, -- For simplicity, start with 2 players
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                current_round_id INTEGER -- Link to current game round if needed
            )",
            // Room Players Table (Junction table for users in rooms)
            "CREATE TABLE IF NOT EXISTS room_players (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                room_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                player_order INTEGER, -- 0, 1, 2, 3
                hand TEXT, -- JSON array of 13 cards dealt
                arranged_hand TEXT, -- JSON of {front, middle, back} submitted by player
                score_for_round INTEGER DEFAULT 0,
                is_ready BOOLEAN DEFAULT 0, -- Player submitted their hand for the round
                is_托管 BOOLEAN DEFAULT 0, -- Is AI playing for this user
                joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (room_id) REFERENCES rooms(id),
                FOREIGN KEY (user_id) REFERENCES users(id),
                UNIQUE (room_id, user_id),
                UNIQUE (room_id, player_order)
            )",
            // Game Rounds (optional, for history or more complex state)
            // For now, we'll manage round state mostly within room_players or in-memory for an active game
            // Transactions for points gifting
            "CREATE TABLE IF NOT EXISTS point_transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                from_user_id INTEGER NOT NULL,
                to_user_id INTEGER NOT NULL,
                amount INTEGER NOT NULL,
                transaction_type TEXT DEFAULT 'gift', -- gift, game_win, admin_adjust
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (from_user_id) REFERENCES users(id),
                FOREIGN KEY (to_user_id) REFERENCES users(id)
            )"
        ];

        foreach ($commands as $command) {
            $this->conn->exec($command);
        }
    }
}
?>
