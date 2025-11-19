<?php
// backend/api/auth.php
require_once '../config/database.php';
require_once '../models/UserModel.php';
require_once '../utils/Auth.php';

header('Content-Type: application/json');

$action = $_GET['action'] ?? '';
$data = json_decode(file_get_contents('php://input'), true);

$database = new Database();
$db = $database->getConnection();
$userModel = new UserModel($db);

switch ($action) {
    case 'register':
        if (empty($data['phone']) || empty($data['password'])) {
            http_response_code(400);
            echo json_encode(['message' => 'Missing required fields']);
            exit;
        }

        $userId = $userModel->create($data['phone'], $data['password']);
        if ($userId) {
            $newUser = $userModel->findById($userId);
            Auth::login($userId, $newUser['user_id']);
            echo json_encode(['id' => $userId, 'user_id' => $newUser['user_id'], 'balance' => 1000]);
        } else {
            http_response_code(500);
            echo json_encode(['message' => 'Registration failed']);
        }
        break;

    case 'login':
        if (empty($data['phone']) || empty($data['password'])) {
            http_response_code(400);
            echo json_encode(['message' => 'Missing required fields']);
            exit;
        }

        $user = $userModel->findByPhone($data['phone']);
        if ($user && password_verify($data['password'], $user['password_hash'])) {
            Auth::login($user['id'], $user['user_id']);
            echo json_encode(['id' => $user['id'], 'user_id' => $user['user_id'], 'balance' => $user['balance']]);
        } else {
            http_response_code(401);
            echo json_encode(['message' => 'Invalid credentials']);
        }
        break;
    
    case 'logout':
        Auth::logout();
        echo json_encode(['message' => 'Logged out successfully']);
        break;

    default:
        http_response_code(404);
        echo json_encode(['message' => 'Action not found']);
        break;
}
