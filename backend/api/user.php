<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

require_once '../config/database.php';
require_once '../models/UserModel.php';
require_once '../models/SubmissionModel.php';
require_once '../utils/Auth.php';

$database = new Database();
$db = $database->getConnection();
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
    }
}
?>