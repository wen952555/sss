<?php
// backend/api/index.php

// --- Pre-flight and Headers ---
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// --- Session and Dependencies ---
session_start();
require_once 'config.php'; // Provides $pdo

// --- Router ---
$request_uri = $_SERVER['REQUEST_URI'];
$path = parse_url($request_uri, PHP_URL_PATH);

$resource = null;
if (preg_match('/\/api\/(user|thirteen-cards|doudizhu|mahjong)/', $path, $matches)) {
    $resource = $matches[1];
}

try {
    switch ($resource) {
        case 'user':
            require_once 'User.php';
            $user_handler = new User($pdo);
            $user_handler->execute();
            break;
        case 'thirteen-cards':
            require_once 'ThirteenCards.php';
            $game = new ThirteenCards($pdo);
            $game->execute();
            break;
        case 'doudizhu':
            require_once 'Doudizhu.php';
            $game = new Doudizhu($pdo);
            $game->execute();
            break;
        case 'mahjong':
            require_once 'Mahjong.php';
            $game = new Mahjong($pdo);
            $game->execute();
            break;
        default:
            http_response_code(404);
            echo json_encode([
                "success" => false,
                "message" => "API endpoint not found.",
                "requested_path" => $path
            ]);
            break;
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Database connection error: " . $e->getMessage()
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "An unexpected error occurred: " . $e->getMessage()
    ]);
}
