<?php
// php_backend/register.php
require_once __DIR__ . '/php_deps/autoload.php';
require_once __DIR__ . '/database.php';

// Set content type to JSON
header('Content-Type: application/json');

// Allow CORS from any origin
if (isset($_SERVER['HTTP_ORIGIN'])) {
    header("Access-Control-Allow-Origin: {$_SERVER['HTTP_ORIGIN']}");
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Max-Age: 86400'); // cache for 1 day
}

// Access-Control headers are received during OPTIONS requests
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_METHOD'])) {
        header("Access-Control-Allow-Methods: POST, OPTIONS");
    }
    if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS'])) {
        header("Access-Control-Allow-Headers: {$_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS']}");
    }
    exit(0);
}

// --- Main Registration Logic ---
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);

    // Basic validation
    if (!isset($data['phone']) || !isset($data['password'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Phone number and password are required.']);
        exit();
    }
    if (!preg_match('/^\d{11}$/', $data['phone'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Please enter a valid 11-digit phone number.']);
        exit();
    }
    // --- NEW: Enforce password policy ---
    if (strlen($data['password']) < 8) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Password must be at least 8 characters long.']);
        exit();
    }

    $pdo = getDbConnection();

    try {
        // Check if the phone number already exists
        $stmt = $pdo->prepare("SELECT id FROM users WHERE phone = :phone");
        $stmt->execute([':phone' => $data['phone']]);
        if ($stmt->fetch()) {
            http_response_code(409);
            echo json_encode(['success' => false, 'message' => 'This phone number is already registered.']);
            exit();
        }

        // Hash the password
        $hashedPassword = password_hash($data['password'], PASSWORD_BCRYPT);

        // Generate a unique display_id
        $displayId = '';
        $isUnique = false;
        while (!$isUnique) {
            $displayId = str_pad(mt_rand(0, 999), 3, '0', STR_PAD_LEFT);
            $stmt = $pdo->prepare("SELECT id FROM users WHERE display_id = :display_id");
            $stmt->execute([':display_id' => $displayId]);
            if (!$stmt->fetch()) {
                $isUnique = true;
            }
        }

        // Insert the new user into the database
        $stmt = $pdo->prepare("INSERT INTO users (phone, password, display_id) VALUES (:phone, :password, :display_id)");
        $stmt->execute([
            ':phone' => $data['phone'],
            ':password' => $hashedPassword,
            ':display_id' => $displayId
        ]);

        http_response_code(201);
        echo json_encode(['success' => true, 'message' => 'User registered successfully.']);

    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Registration failed: ' . $e->getMessage()]);
    }
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed.']);
}