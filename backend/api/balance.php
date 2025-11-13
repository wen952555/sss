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
require_once $root_dir . '/models/UserModel.php';
require_once $root_dir . '/models/BalanceTransferModel.php';
require_once $root_dir . '/utils/Auth.php';

try {
    $database = new Database();
    $db = $database->getConnection();
    
    if (!$db) {
        throw new Exception('无法连接到数据库');
    }
    
    $userModel = new UserModel($db);
    $transferModel = new BalanceTransferModel($db);

    $user_id = Auth::getUserIdFromHeader();

    if (!$user_id) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => '未授权访问']);
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] == 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        // 检查JSON解析是否成功
        if (json_last_error() !== JSON_ERROR_NONE) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => '无效的JSON数据']);
            exit;
        }
        
        $action = $_GET['action'] ?? '';
        
        if ($action == 'transfer') {
            $to_user_id = $input['to_user_id'] ?? '';
            $amount = $input['amount'] ?? 0;
            $note = $input['note'] ?? '';
            
            if (empty($to_user_id) || $amount <= 0) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => '参数错误']);
                exit;
            }
            
            // 检查收款用户是否存在
            $to_user = $userModel->getUserByUserId($to_user_id);
            if (!$to_user) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => '收款用户不存在']);
                exit;
            }
            
            // 不能给自己转账
            if ($to_user['id'] == $user_id) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => '不能给自己转账']);
                exit;
            }
            
            // 获取当前用户信息
            $from_user = $userModel->getUserById($user_id);
            
            // 检查余额是否足够
            if ($from_user['balance'] < $amount) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => '余额不足']);
                exit;
            }
            
            // 开始事务
            $db->beginTransaction();
            
            try {
                // 扣除转出用户余额
                $new_from_balance = $from_user['balance'] - $amount;
                $userModel->updateBalance($user_id, $new_from_balance);
                
                // 增加收款用户余额
                $new_to_balance = $to_user['balance'] + $amount;
                $userModel->updateBalance($to_user['id'], $new_to_balance);
                
                // 记录转账
                $transferModel->createTransfer($user_id, $to_user['id'], $amount, $note);
                
                // 提交事务
                $db->commit();
                
                echo json_encode([
                    'success' => true,
                    'message' => '转账成功',
                    'new_balance' => $new_from_balance
                ]);
                
            } catch (Exception $e) {
                // 回滚事务
                $db->rollBack();
                throw $e;
            }
        } else {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => '无效的操作']);
        }
        
    } elseif ($_SERVER['REQUEST_METHOD'] == 'GET') {
        $action = $_GET['action'] ?? '';
        
        if ($action == 'transfers') {
            $limit = $_GET['limit'] ?? 20;
            $transfers = $transferModel->getUserTransfers($user_id, $limit);
            
            echo json_encode(['success' => true, 'transfers' => $transfers]);
            
        } elseif ($action == 'recent_transfers') {
            $count = $_GET['count'] ?? 5;
            $transfers = $transferModel->getRecentTransfers($user_id, $count);
            
            echo json_encode(['success' => true, 'transfers' => $transfers]);
        } else {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => '无效的操作']);
        }
    } else {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => '方法不允许']);
    }
} catch (Exception $e) {
    error_log("Balance API Error: " . $e->getMessage());
    
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => '服务器错误，请稍后重试']);
}
?>