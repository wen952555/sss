<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
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
require_once $root_dir . '/models/GameModel.php';
require_once $root_dir . '/models/SubmissionModel.php';
require_once $root_dir . '/models/UserModel.php';
require_once $root_dir . '/utils/Auth.php';
require_once $root_dir . '/utils/CardGenerator.php';

// 辅助函数：格式化单张卡片
function formatCardData($cards) {
    if (!is_array($cards)) return [];
    
    return array_map(function($card) {
        if (is_array($card)) {
            // 如果已经是对象格式，确保filename有.svg扩展名
            if (isset($card['filename']) && !str_ends_with($card['filename'], '.svg')) {
                $card['filename'] = $card['filename'] . '.svg';
            }
            return $card;
        }
        
        // 解析字符串格式的卡片
        if (is_string($card)) {
            $filename = $card;
            // 确保有.svg扩展名
            if (!str_ends_with($filename, '.svg')) {
                $filename = $filename . '.svg';
            }
            
            $cardName = str_replace('.svg', '', $filename);
            list($value, $suit) = explode('_of_', $cardName);
            
            $suitSymbols = [
                'clubs' => '♣',
                'diamonds' => '♦', 
                'hearts' => '♥',
                'spades' => '♠'
            ];
            
            $valueMap = [
                'ace' => 'A', 'king' => 'K', 'queen' => 'Q', 'jack' => 'J',
                '10' => '10', '9' => '9', '8' => '8', '7' => '7', '6' => '6',
                '5' => '5', '4' => '4', '3' => '3', '2' => '2'
            ];
            
            return [
                'filename' => $filename,
                'value' => $value,
                'suit' => $suit,
                'display' => ($valueMap[$value] ?? $value) . ($suitSymbols[$suit] ?? $suit)
            ];
        }
        
        return $card;
    }, $cards);
}

// 辅助函数：格式化整个牌型安排
function formatCardArrangement($arrangement) {
    if (!is_array($arrangement)) {
        return [
            'head' => [],
            'middle' => [],
            'tail' => []
        ];
    }
    return [
        'head' => formatCardData($arrangement['head'] ?? []),
        'middle' => formatCardData($arrangement['middle'] ?? []),
        'tail' => formatCardData($arrangement['tail'] ?? [])
    ];
}

try {
    $database = new Database();
    $db = $database->getConnection();
    
    if (!$db) {
        throw new Exception('无法连接到数据库');
    }
    
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
            
            $game = $gameModel->getAvailableGame($session_type);
            if (!$game) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => '暂无可用牌局']);
                exit;
            }
            
            $gameModel->markGameAsUsed($game['id']);
            
            // 准备返回数据
            $response = [
                'success' => true,
                'game_id' => $game['id'],
                'preset_arrangement' => formatCardArrangement(json_decode($game['player1_arranged'], true)),
                'original_cards' => formatCardData(json_decode($game['player1_original'], true)),
                'ai_arrangements' => [
                    formatCardArrangement(json_decode($game['player2_arranged'], true)),
                    formatCardArrangement(json_decode($game['player3_arranged'], true)),
                    formatCardArrangement(json_decode($game['player4_arranged'], true))
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
        } else {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => '无效的操作']);
        }
        
    } elseif ($_SERVER['REQUEST_METHOD'] == 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => '无效的JSON数据']);
            exit;
        }
        
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
            
            if ($submissionModel->hasSubmitted($game_id, $user_id)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => '已提交过该牌局']);
                exit;
            }
            
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
            
            $result = $submissionModel->createSubmission($game_id, $user_id, $arranged_cards);
            
            if ($result) {
                echo json_encode(['success' => true, 'message' => '提交成功']);
            } else {
                http_response_code(500);
                echo json_encode(['success' => false, 'message' => '提交失败']);
            }
        } else {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => '无效的操作']);
        }
    } else {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => '方法不允许']);
    }
} catch (Exception $e) {
    error_log("Game API Error: " . $e->getMessage());
    
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => '服务器错误，请稍后重试']);
}
?>