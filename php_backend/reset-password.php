<?php
// php_backend/reset-password.php
require_once __DIR__ . '/php_deps/autoload.php';
require_once __DIR__ . '/database.php';

header('Content-Type: application/json');

// --- CORS Headers ---
if (isset($_SERVER['HTTP_ORIGIN'])) {
    header("Access-Control-Allow-Origin: {$_SERVER['HTTP_ORIGIN']}");
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Max-Age: 86400');
}
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_METHOD'])) {
        header("Access-Control-Allow-Methods: POST, OPTIONS");
    }
    if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS'])) {
        header("Access-Control-Allow-Headers: {$_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS']}");
    }
    exit(0);
}

// --- Main Logic ---
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);

    // Basic validation
    if (!isset($data['phone']) || !isset($data['token']) || !isset($data['newPassword'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Phone, token, and new password are required.']);
        exit();
    }

    // Enforce password policy for the new password
    if (strlen($data['newPassword']) < 8) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'New password must be at least 8 characters long.']);
        exit();
    }

    $pdo = getDbConnection();

    try {
        // Find user by phone number
        $stmt = $pdo->prepare("SELECT id, reset_token, reset_expires FROM users WHERE phone = :phone");
        $stmt->execute([':phone' => $data['phone']]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Invalid phone number or token.']);
            exit();
        }

        // --- Token Validation ---
        // 1. Check if token exists and is not expired
        if (empty($user['reset_token']) || time() > $user['reset_expires']) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Token is invalid or has expired.']);
            exit();
        }

        // 2. Hash the provided token and compare it to the stored hash
        $hashedToken = hash('sha256', $data['token']);
        if (!hash_equals($user['reset_token'], $hashedToken)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Invalid phone number or token.']);
            exit();
        }

        // --- Update Password ---
        // Hash the new password
        $newHashedPassword = password_hash($data['newPassword'], PASSWORD_BCRYPT);

        // Update the password and clear the reset token fields
        $stmt = $pdo->prepare("
            UPDATE users
            SET password = :password, reset_token = NULL, reset_expires = NULL
            WHERE id = :id
        ");
        $stmt->execute([
            ':password' => $newHashedPassword,
            ':id' => $user['id']
        ]);

        http_response_code(200);
        echo json_encode(['success' => true, 'message' => 'Password has been reset successfully.']);

    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'An error occurred: ' . $e->getMessage()]);
    }

} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed.']);
}