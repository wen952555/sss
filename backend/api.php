<?php
// backend/api.php

require_once 'game.php';
require_once 'database.php';

header('Content-Type: application/json');
session_start();

function send_json_error($message) {
    echo json_encode(['error' => $message]);
    exit;
}

function is_authenticated() {
    return isset($_SESSION['user_id']);
}

function handle_register() {
    $username = $_POST['username'] ?? null;
    $password = $_POST['password'] ?? null;
    if ($username && $password) {
        $db = getDbConnection();
        $hash = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $db->prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)');
        $stmt->bindValue(1, $username, SQLITE3_TEXT);
        $stmt->bindValue(2, $hash, SQLITE3_TEXT);
        if ($stmt->execute()) {
            echo json_encode(['success' => true]);
        } else {
            send_json_error('Username already exists.');
        }
    } else {
        send_json_error('Username and password are required.');
    }
}

function handle_login() {
    $username = $_POST['username'] ?? null;
    $password = $_POST['password'] ?? null;
    if ($username && $password) {
        $db = getDbConnection();
        $stmt = $db->prepare('SELECT * FROM users WHERE username = ?');
        $stmt->bindValue(1, $username, SQLITE3_TEXT);
        $result = $stmt->execute()->fetchArray(SQLITE3_ASSOC);
        if ($result && password_verify($password, $result['password_hash'])) {
            $_SESSION['user_id'] = $result['id'];
            echo json_encode(['success' => true, 'user_id' => $result['id']]);
        } else {
            send_json_error('Invalid credentials.');
        }
    } else {
        send_json_error('Username and password are required.');
    }
}

function handle_create_game() {
    if (!is_authenticated()) {
        send_json_error('Authentication required.');
    }
    $db = getDbConnection();
    $stmt = $db->prepare('INSERT INTO games (room_id) VALUES (?)');
    $stmt->bindValue(1, uniqid(), SQLITE3_TEXT);
    $stmt->execute();
    $gameId = $db->lastInsertRowID();
    echo json_encode(['game_id' => $gameId]);
}

function handle_deal_cards() {
    if (!is_authenticated()) {
        send_json_error('Authentication required.');
    }
    $gameId = $_POST['game_id'] ?? null;
    if ($gameId) {
        $hands = dealCards(4); // Assuming 4 players
        $db = getDbConnection();
        $stmt = $db->prepare('INSERT INTO dealt_hands (game_id, player_id, hand) VALUES (?, ?, ?)');
        foreach ($hands as $player => $hand) {
            $playerId = (int) filter_var($player, FILTER_SANITIZE_NUMBER_INT);
            $stmt->bindValue(1, $gameId, SQLITE3_INTEGER);
            $stmt->bindValue(2, $playerId, SQLITE3_INTEGER);
            $stmt->bindValue(3, json_encode($hand), SQLITE3_TEXT);
            $stmt->execute();
        }
        echo json_encode(['success' => true]);
    } else {
        send_json_error('Game ID is required.');
    }
}

function handle_submit_hand() {
    if (!is_authenticated()) {
        send_json_error('Authentication required.');
    }
    $gameId = $_POST['game_id'] ?? null;
    $userId = $_SESSION['user_id'];
    $front = json_decode($_POST['front'] ?? '[]', true);
    $middle = json_decode($_POST['middle'] ?? '[]', true);
    $back = json_decode($_POST['back'] ?? '[]', true);

    if ($gameId && isValidHand($front, $middle, $back)) {
        $db = getDbConnection();

        $stmt = $db->prepare('SELECT hand FROM dealt_hands WHERE game_id = ? AND player_id = ?');
        $stmt->bindValue(1, $gameId, SQLITE3_INTEGER);
        $stmt->bindValue(2, $userId, SQLITE3_INTEGER);
        $result = $stmt->execute()->fetchArray(SQLITE3_ASSOC);

        if (!$result) {
            send_json_error('No dealt hand found for this player.');
        }

        $dealtHand = json_decode($result['hand'], true);
        $submittedHand = array_merge($front, $middle, $back);

        $dealtHandStripped = array_map(function($c) { unset($c['value']); return $c; }, $dealtHand);
        $submittedHandStripped = array_map(function($c) { unset($c['value']); return $c; }, $submittedHand);

        $dealtHandCounts = array_count_values(array_map('json_encode', $dealtHandStripped));
        $submittedHandCounts = array_count_values(array_map('json_encode', $submittedHandStripped));

        if ($dealtHandCounts !== $submittedHandCounts) {
            send_json_error('Submitted hand does not match dealt hand.');
        }

        $stmt = $db->prepare('INSERT INTO player_hands (game_id, player_id, hand_front, hand_middle, hand_back) VALUES (?, ?, ?, ?, ?)');
        $stmt->bindValue(1, $gameId, SQLITE3_INTEGER);
        $stmt->bindValue(2, $userId, SQLITE3_INTEGER);
        $stmt->bindValue(3, json_encode($front), SQLITE3_TEXT);
        $stmt->bindValue(4, json_encode($middle), SQLITE3_TEXT);
        $stmt->bindValue(5, json_encode($back), SQLITE3_TEXT);
        if ($stmt->execute()) {
            echo json_encode(['success' => true]);
        } else {
            send_json_error('Failed to submit hand.');
        }
    } else {
        send_json_error('Invalid hand or missing parameters.');
    }
}

function handle_get_results() {
    $gameId = $_GET['game_id'] ?? null;
    if ($gameId) {
        $scores = calculateResults($gameId);
        echo json_encode($scores);
    } else {
        send_json_error('Game ID is required.');
    }
}

function handle_poll() {
    require 'poll.php';
}

$routes = [
    'register' => 'handle_register',
    'login' => 'handle_login',
    'create_game' => 'handle_create_game',
    'deal_cards' => 'handle_deal_cards',
    'submit_hand' => 'handle_submit_hand',
    'get_results' => 'handle_get_results',
    'poll' => 'handle_poll',
];

try {
    $action = $_GET['action'] ?? null;
    if (isset($routes[$action])) {
        $routes[$action]();
    } else {
        send_json_error('Invalid action.');
    }
} catch (Exception $e) {
    send_json_error('An unexpected error occurred: ' . $e->getMessage());
}
