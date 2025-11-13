<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

require_once '../config/database.php';
require_once '../models/GameModel.php';
require_once '../models/SubmissionModel.php';
require_once '../models/UserModel.php';
require_once '../utils/Auth.php';
require_once '../utils/CardGenerator.php';

$database = new Database();
$db = $database->getConnection();
$gameModel = new GameModel($db);
$submissionModel = new SubmissionModel($db);
$userModel = new UserModel($db);

$user_id = Auth::getUserIdFromHeader();

if ($_SERVER['REQUEST_METHOD'] == 'GET') {
    $action = $_GET['action'] ?? '';
    
    if ($action == 'get_game') {
        if (!$user_id) {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => '未授权访问']);
            exit;
        }
        
        $session_type = $_GET['session_type'] ?? '2';
        
        if (!in_array($session_type, ['2', '5', '10'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => '无效的场次类型']);
            exit;
        }
        
        // 获取可用牌局
        $game = $gameModel->getAvailableGame($session_type);
        if (!$game) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => '暂无可用牌局']);
            exit;
        }
        
        // 标记为已使用
        $gameModel->markGameAsUsed($game['id']);
        
        // 准备返回数据
        $response = [
            'success' => true,
            'game_id' => $game['id'],
            'preset_arrangement' => json_decode($game['player1_arranged'], true),
            'original_cards' => json_decode($game['player1_original'], true),
            'ai_arrangements' => [
                json_decode($game['player2_arranged'], true),
                json_decode($game['player3_arranged'], true),
                json_decode($game['player4_arranged'], true)
            ]
        ];
        
        echo json_encode($response);
        
    } elseif ($action == 'user_info') {
        if (!$user_id) {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => '未授权访问']);
            exit;
        }
        
        $user = $userModel->getUserById($user_id);
        if (!$user) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => '用户不存在']);
            exit;
        }
        
        echo json_encode(['success' => true, 'user' => $user]);
    }
    
} elseif ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $_GET['action'] ?? '';
    
    if ($action == 'submit') {
        if (!$user_id) {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => '未授权访问']);
            exit;
        }
        
        $game_id = $input['game_id'] ?? null;
        $arranged_cards = $input['arranged_cards'] ?? null;
        
        if (!$game_id || !$arranged_cards) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => '缺少必要参数']);
            exit;
        }
        
        // 检查是否已提交过
        if ($submissionModel->hasSubmitted($game_id, $user_id)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => '已提交过该牌局']);
            exit;
        }
        
        // 验证牌型是否倒水
        $cardGenerator = new CardGenerator();
        if (!$cardGenerator->validateArrangement(
            $arranged_cards['head'] ?? [],
            $arranged_cards['middle'] ?? [], 
            $arranged_cards['tail'] ?? []
        )) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => '牌型倒水，无法提交']);
            exit;
        }
        
        // 创建提交记录
        $result = $submissionModel->createSubmission($game_id, $user_id, $arranged_cards);
        
        if ($result) {
            echo json_encode(['success' => true, 'message' => '提交成功']);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => '提交失败']);
        }
    }
}
?>