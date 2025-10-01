<?php
// backend/api/email_receiver.php

// --- Pre-flight and Headers ---
header("Access-Control-Allow-Origin: https://xxx.9525.ip-ddns.com");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, X-Worker-Secret");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// --- Dependencies and Config ---
require_once 'config.php'; // Provides $pdo and WORKER_SECRET

// --- Security Check ---
// Verify that the request is coming from our Cloudflare Worker
$request_secret = $_SERVER['HTTP_X_WORKER_SECRET'] ?? '';

if (empty($request_secret) || !hash_equals($WORKER_SECRET, $request_secret)) {
    http_response_code(403);
    echo json_encode(["success" => false, "message" => "Forbidden: Invalid or missing secret."]);
    exit();
}

// --- Request Processing ---
if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $json_data = file_get_contents('php://input');
    $data = json_decode($json_data, true);

    if (is_null($data) || !isset($data['raw_email'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid request: Missing "raw_email" in payload.']);
        exit;
    }

    // --- Database Interaction ---
    try {
        if (!$pdo) {
            throw new PDOException("Database connection is not available. Please check the server configuration.");
        }

        $stmt = $pdo->prepare(
            "INSERT INTO incoming_emails (from_address, to_address, raw_content, status) VALUES (?, ?, ?, 'new')"
        );

        $from = $data['from'] ?? 'unknown@example.com';
        $to = $data['to'] ?? 'unknown@example.com';

        if ($stmt->execute([$from, $to, $data['raw_email']])) {
            http_response_code(201); // 201 Created
            echo json_encode(["success" => true, "message" => "Email successfully received and stored."]);
        } else {
            http_response_code(500);
            echo json_encode(["success" => false, "message" => "Failed to store email in the database."]);
        }
    } catch (PDOException $e) {
        // Log the detailed error to a server log file for debugging, not to the user.
        error_log("Database error in email_receiver.php: " . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            "success" => false,
            "message" => "An internal database error occurred."
        ]);
    }
} else {
    http_response_code(405); // Method Not Allowed
    echo json_encode(['status' => 'error', 'message' => 'This endpoint only accepts POST requests.']);
}
?>