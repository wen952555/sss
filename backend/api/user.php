<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

// 关闭错误输出
ini_set('display_errors', 0);
error_reporting(0);

// 使用绝对路径包含文件
$root_dir = dirname(__DIR__);
require_once $root_dir . '/config/database.php';
require_once $root_dir . '/models/UserModel.php';
require_once $root_dir . '/models/SubmissionModel.php';
require_once $root_dir . '/utils/Auth.php';

try {
    $database = new Database();
    $db = $database->getConnection();
    
    if (!$db) {
        throw new Exception('无法连接到数据库');
    }
    
    $userModel = new UserModel($db);
    $submissionModel = new SubmissionModel($db);

    $user_id = Auth::getUserIdFromHeader();

    if ($_SERVER['REQUEST_METHOD'] == 'GET') {
        if (!$user_id) {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => '未授权访问']);
            exit;
        }
        
        $action = $_GET['action'] ?? '';
        
        if ($action == 'profile') {
            $user = $userModel->getUserById($user_id);
            if (!$user) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => '用户不存在']);
                exit;
            }
            
            echo json_encode(['success' => true, 'user' => $user]);
            
        } elseif ($action == 'submissions') {
            $limit = $_GET['limit'] ?? 10;
            $submissions = $submissionModel->getUserSubmissions($user_id, $limit);
            
            echo json_encode(['success' => true, 'submissions' => $submissions]);
        } else {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => '无效的操作']);
        }
    } else {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => '方法不允许']);
    }
} catch (Exception $e) {
    error_log("User API Error: " . $e->getMessage());
    
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => '服务器错误，请稍后重试']);
}
?>