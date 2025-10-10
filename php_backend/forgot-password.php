<?php
// php_backend/forgot-password.php
require_once __DIR__ . '/php_deps/autoload.php';
require_once __DIR__ . '/database.php';

header('Content-Type: application/json');

// --- CORS Headers ---
if (isset($_SERVER['HTTP_origin'])) {
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

    if (!isset($data['phone'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Phone number is required.']);
        exit();
    }

    $pdo = getDbConnection();

    try {
        // Find the user by phone number
        $stmt = $pdo->prepare("SELECT id FROM users WHERE phone = :phone");
        $stmt->execute([':phone' => $data['phone']]);
        $user = $stmt->fetch();

        if (!$user) {
            // To prevent user enumeration, we send a generic success message
            // even if the user does not exist.
            http_response_code(200);
            echo json_encode(['success' => true, 'message' => 'If an account with that phone number exists, a reset token has been generated.']);
            exit();
        }

        // Generate a secure random token
        $token = bin2hex(random_bytes(32));
        // Hash the token for database storage
        $hashedToken = hash('sha256', $token);
        // Set expiration to 1 hour from now
        $expires = time() + 3600;

        // Store the hashed token and expiration in the database
        $stmt = $pdo->prepare("UPDATE users SET reset_token = :token, reset_expires = :expires WHERE id = :id");
        $stmt->execute([
            ':token' => $hashedToken,
            ':expires' => $expires,
            ':id' => $user['id']
        ]);

        // --- IMPORTANT FOR TESTING ---
        // In a real application, you would send the UNHASHED $token via email/SMS.
        // For this project, we return it directly in the response so the frontend can use it.
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'A password reset token has been generated.',
            'reset_token' => $token // This is for testing purposes only
        ]);

    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'An error occurred: ' . $e->getMessage()]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Could not generate token: ' . $e->getMessage()]);
    }

} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed.']);
}