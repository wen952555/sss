<?php
// backend/api/verify_email.php

require_once 'config.php'; // Provides $pdo

// Set headers for CORS and content type
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

// Handle pre-flight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Process POST request
if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    $email = $data['email'] ?? '';

    if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode(["verified" => false, "message" => "Invalid or missing email."]);
        exit();
    }

    try {
        if (!isset($pdo) || $pdo === null) {
            // Gracefully handle the case where the database is not available
            http_response_code(503); // Service Unavailable
            echo json_encode(["verified" => false, "message" => "Database connection is not available."]);
            exit();
        }

        $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user_exists = $stmt->fetch() !== false;

        echo json_encode(["verified" => $user_exists]);

    } catch (PDOException $e) {
        // Log error and return a generic server error
        error_log("Database error in verify_email.php: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(["verified" => false, "message" => "An internal database error occurred."]);
    }
} else {
    http_response_code(405); // Method Not Allowed
    echo json_encode(["verified" => false, "message" => "This endpoint only accepts POST requests."]);
}
?>