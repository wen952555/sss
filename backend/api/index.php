<?php
// backend/api/index.php

// --- Pre-flight and Headers ---
header("Access-Control-Allow-Origin: https://xxx.9525.ip-ddns.com");
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
// The router now recognizes 'user' and 'email_receiver' endpoints.
if (preg_match('/\/api\/(user|email_receiver)/', $path, $matches)) {
    $resource = $matches[1];
}

try {
    switch ($resource) {
        case 'user':
            require_once 'User.php';
            $user_handler = new User($pdo);
            $user_handler->execute();
            break;
        case 'email_receiver':
            // This script handles its own logic and output
            require_once 'email_receiver.php';
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