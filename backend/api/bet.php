<?php
// backend/api/bet.php

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// Handle pre-flight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// --- DEPENDENCIES ---
try {
    require_once 'config.php';
    require_once 'telegram_helpers.php';
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database connection failed: ' . $e->getMessage()]);
    exit;
}

// --- API LOGIC ---

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method Not Allowed']);
    exit;
}

// Get POST data
$data = json_decode(file_get_contents('php://input'), true);

// Basic Validation
if (!isset($data['player_id']) || !isset($data['numbers']) || !isset($data['amount'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Missing required fields: player_id, numbers, amount.']);
    exit;
}
if (!is_array($data['numbers']) || empty($data['numbers'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Field "numbers" must be a non-empty array.']);
    exit;
}
if (!is_numeric($data['amount']) || $data['amount'] <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Field "amount" must be a positive number.']);
    exit;
}

$playerId = $data['player_id'];
$betNumbers = json_encode($data['numbers']); // Store numbers as a JSON string
$amount = $data['amount'];

// --- Database Interaction ---
try {
    // Note: This assumes a table named `bets` exists with columns:
    // id (PK, AI), player_id, bet_numbers (TEXT), amount (DECIMAL), timestamp (TIMESTAMP)
    $stmt = $pdo->prepare(
        "INSERT INTO bets (player_id, bet_numbers, amount) VALUES (?, ?, ?)"
    );
    $stmt->execute([$playerId, $betNumbers, $amount]);

    // --- Telegram Notification ---
    $notification_text = "✅ 新投注提醒\n";
    $notification_text .= "玩家ID: `{$playerId}`\n";
    $notification_text .= "投注号码: `" . implode(', ', $data['numbers']) . "`\n";
    $notification_text .= "投注金额: `{$amount}`";

    // Send notification to all admins
    foreach ($ADMIN_USER_IDS as $admin_id) {
        sendMessage($admin_id, $notification_text, $TELEGRAM_BOT_TOKEN);
    }

    // --- Success Response ---
    http_response_code(201); // 201 Created
    echo json_encode(['success' => true, 'message' => 'Bet placed successfully.']);

} catch (PDOException $e) {
    http_response_code(500);
    error_log("Betting API Database Error: " . $e->getMessage()); // Log error for admin
    echo json_encode(['success' => false, 'message' => 'An error occurred while placing the bet.']);
} catch (Throwable $e) {
    http_response_code(500);
    error_log("Betting API General Error: " . $e->getMessage()); // Log error for admin
    echo json_encode(['success' => false, 'message' => 'A critical error occurred.']);
}

?>
