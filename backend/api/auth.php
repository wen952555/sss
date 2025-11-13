<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

require_once '../config/database.php';
require_once '../models/UserModel.php';
require_once '../utils/Auth.php';

$database = new Database();
$db = $database->getConnection();
$userModel = new UserModel($db);

$input = json_decode(file_get_contents('php://input'), true);

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $action = $_GET['action'] ?? '';
    
    if ($action == 'login') {
        $phone = $input['phone'] ?? '';
        $password = $input['password'] ?? '';
        
        if (empty($phone) || empty($password)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => '手机号和密码不能为空']);
            exit;
        }
        
        $user = $userModel->getUserByPhone($phone);
        if (!$user || !password_verify($password, $user['password_hash'])) {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => '手机号或密码错误']);
            exit;
        }
        
        $token = Auth::generateToken($user['id']);
        $userModel->updateLastLogin($user['id']);
        
        // 移除密码哈希
        unset($user['password_hash']);
        
        echo json_encode([
            'success' => true,
            'message' => '登录成功',
            'token' => $token,
            'user' => $user
        ]);
        
    } elseif ($action == 'register') {
        $phone = $input['phone'] ?? '';
        $password = $input['password'] ?? '';
        $email = $input['email'] ?? '';
        
        // 验证手机号格式
        if (empty($phone) || !preg_match('/^1[3-9]\\d{9}$/', $phone)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => '请输入有效的手机号']);
            exit;
        }
        
        if (empty($password) || strlen($password) < 6) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => '密码长度至少6位']);
            exit;
        }
        
        // 检查手机号是否已存在
        if ($userModel->phoneExists($phone)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => '手机号已注册']);
            exit;
        }
        
        $user_id = $userModel->createUser($phone, $password, $email);
        if ($user_id) {
            echo json_encode([
                'success' => true, 
                'message' => '注册成功',
                'user_id' => $user_id
            ]);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => '注册失败']);
        }
        
    } elseif ($action == 'find_user_id') {
        $phone = $input['phone'] ?? '';
        
        if (empty($phone)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => '请输入手机号']);
            exit;
        }
        
        $user = $userModel->getUserByPhone($phone);
        if (!$user) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => '手机号未注册']);
            exit;
        }
        
        echo json_encode([
            'success' => true,
            'user_id' => $user['user_id'],
            'phone' => $user['phone']
        ]);
    }
}
?>