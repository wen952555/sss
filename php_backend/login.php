<?php
// php_backend/login.php
require_once __DIR__ . '/php_deps/autoload.php';
require_once __DIR__ . '/database.php';

use Firebase\JWT\JWT;

// Set content type to JSON
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

// --- Main Login Logic ---
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);

    // Basic validation
    if (!isset($data['phone']) || !isset($data['password'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Phone number and password are required.']);
        exit();
    }

    $pdo = getDbConnection();

    try {
        // Find the user by phone number
        $stmt = $pdo->prepare("SELECT id, display_id, password FROM users WHERE phone = :phone");
        $stmt->execute([':phone' => $data['phone']]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        // Verify user exists and password is correct
        if (!$user || !password_verify($data['password'], $user['password'])) {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => 'Invalid credentials.']);
            exit();
        }

        // --- JWT Generation ---
        // IMPORTANT: In a real application, get this from a secure environment variable.
        $jwtSecret = getenv('JWT_SECRET') ?: 'a_secure_secret_for_development';

        $payload = [
            'iss' => "http://localhost", // Issuer
            'aud' => "http://localhost", // Audience
            'iat' => time(), // Issued at
            'exp' => time() + (60 * 60), // Expiration time (1 hour)
            'data' => [
                'id' => $user['id'],
                'display_id' => $user['display_id']
            ]
        ];

        // Generate the JWT
        $token = JWT::encode($payload, $jwtSecret, 'HS256');

        // Send the token back to the client
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'Logged in successfully.',
            'token' => $token
        ]);

    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Login failed: ' . $e->getMessage()]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Could not generate token: ' . $e->getMessage()]);
    }

} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed.']);
}