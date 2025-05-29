<?php
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/utils.php';
// If using JWT, you'd include the library here
// require_once __DIR__ . '/../vendor/autoload.php'; // If using composer for JWT
// use Firebase\JWT\JWT;
// use Firebase\JWT\Key;

function register_user($data) {
    $conn = get_db_connection();
    $username = sanitize_input($data['username'] ?? '');
    $password = $data['password'] ?? ''; // Raw password

    if (empty($username) || empty($password)) {
        send_json_response(['error' => 'Username and password are required.'], 400);
    }

    // Check if username exists
    $stmt = $conn->prepare("SELECT id FROM users WHERE username = ?");
    $stmt->execute([$username]);
    if ($stmt->fetch()) {
        send_json_response(['error' => 'Username already taken.'], 409);
    }

    $hashed_password = password_hash($password, PASSWORD_ARGON2ID); // Or PASSWORD_DEFAULT

    $stmt = $conn->prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)");
    if ($stmt->execute([$username, $hashed_password])) {
        send_json_response(['message' => 'User registered successfully.', 'userId' => $conn->lastInsertId()], 201);
    } else {
        send_json_response(['error' => 'Registration failed.'], 500);
    }
}

function login_user($data) {
    $conn = get_db_connection();
    $username = sanitize_input($data['username'] ?? '');
    $password = $data['password'] ?? '';

    if (empty($username) || empty($password)) {
        send_json_response(['error' => 'Username and password are required.'], 400);
    }

    $stmt = $conn->prepare("SELECT id, password_hash FROM users WHERE username = ?");
    $stmt->execute([$username]);
    $user = $stmt->fetch();

    if ($user && password_verify($password, $user['password_hash'])) {
        // Login successful
        // TODO: Implement session or JWT token generation
        // For JWT:
        // $payload = [
        //     'iss' => "your-app-name", // Issuer
        //     'aud' => "your-app-name", // Audience
        //     'iat' => time(), // Issued at
        //     'nbf' => time(), // Not before
        //     'exp' => time() + (60*60*24), // Expiration time (e.g., 1 day)
        //     'data' => [
        //         'userId' => $user['id'],
        //         'username' => $username
        //     ]
        // ];
        // $jwt = JWT::encode($payload, JWT_SECRET, 'HS256');
        // send_json_response(['message' => 'Login successful.', 'token' => $jwt, 'userId' => $user['id']]);

        // Simple session example (Serv00 might require specific session path config)
        if (session_status() == PHP_SESSION_NONE) {
             session_start([
                'cookie_samesite' => 'None', // Required for cross-site cookies
                'cookie_secure' => true,     // Required for cross-site cookies if HTTPS
                'cookie_httponly' => true,
             ]);
        }
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['username'] = $username;

        send_json_response(['message' => 'Login successful.', 'userId' => $user['id'], 'username' => $username]);
    } else {
        send_json_response(['error' => 'Invalid username or password.'], 401);
    }
}

function get_current_user_id() {
    // For JWT:
    // $token = get_bearer_token();
    // if ($token) {
    //     try {
    //         $decoded = JWT::decode($token, new Key(JWT_SECRET, 'HS256'));
    //         return $decoded->data->userId;
    //     } catch (Exception $e) {
    //         return null; // Invalid token
    //     }
    // }

    // For session:
    if (session_status() == PHP_SESSION_NONE) {
         session_start([
            'cookie_samesite' => 'None',
            'cookie_secure' => true,
            'cookie_httponly' => true,
         ]);
    }
    return $_SESSION['user_id'] ?? null;
}

function require_auth() {
    $userId = get_current_user_id();
    if (!$userId) {
        send_json_response(['error' => 'Unauthorized. Please login.'], 401);
    }
    return $userId;
}
?>
