<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

// 关闭错误输出，避免污染JSON响应
ini_set('display_errors', 0);
error_reporting(0);

require_once '../config/database.php';
require_once '../models/UserModel.php';
require_once '../utils/Auth.php';

$database = new Database();
$db = $database->getConnection();
$userModel = new UserModel($db);

$input = json_decode(file_get_contents('php://input'), true);

// 确保输入解析成功
if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => '无效的JSON数据']);
    exit;
}

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
        
        // 基本手机号验证
        if (strlen($phone) !== 11 || !is_numeric($phone)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => '请输入11位手机号']);
            exit;
        }
        
        try {
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
            
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => '服务器错误，请稍后重试']);
        }
        
    } elseif ($action == 'register') {
        $phone = $input['phone'] ?? '';
        $password = $input['password'] ?? '';
        $email = $input['email'] ?? '';
        
        // 验证手机号格式
        if (empty($phone) || strlen($phone) !== 11 || !is_numeric($phone)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => '请输入11位手机号']);
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
        
        try {
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
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => '服务器错误，请稍后重试']);
        }
        
    } elseif ($action == 'find_user_id') {
        $phone = $input['phone'] ?? '';
        
        if (empty($phone) || strlen($phone) !== 11 || !is_numeric($phone)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => '请输入11位手机号']);
            exit;
        }
        
        try {
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
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => '服务器错误，请稍后重试']);
        }
    } else {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => '无效的操作']);
    }
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => '方法不允许']);
}
?>