<?php
// backend/api/get_unprocessed_emails.php

require_once 'config.php'; // Provides $pdo

header("Access-Control-Allow-Origin: https://xxx.9525.ip-ddns.com");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

// Handle pre-flight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Method Not Allowed"]);
    exit();
}

// Optional: Add authentication check here if only logged-in users should see emails.
// session_start();
// if (!isset($_SESSION['user_id'])) {
//     http_response_code(401);
//     echo json_encode(["success" => false, "message" => "Unauthorized"]);
//     exit();
// }

try {
    $stmt = $pdo->prepare("SELECT id, from_address, to_address, raw_content, created_at FROM incoming_emails WHERE status = 'new' ORDER BY created_at DESC");
    $stmt->execute();
    $emails = $stmt->fetchAll();

    http_response_code(200);
    echo json_encode(["success" => true, "data" => $emails]);

} catch (PDOException $e) {
    error_log("Database error in get_unprocessed_emails.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "An internal database error occurred."
    ]);
}
?>