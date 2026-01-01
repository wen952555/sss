<?php
/**
 * 路径: backend/api.php
 * 描述: 后端核心API入口，处理所有前端请求
 */

// 1. 环境配置与头部处理
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

// 处理预检请求
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit;
}

// 2. 引入依赖文件
require_once 'db.php';
require_once 'functions.php';
require_once 'game_logic.php';

// 3. 获取输入数据
$action = $_GET['action'] ?? '';
$input = json_decode(file_get_contents('php://input'), true);

// 4. 路由逻辑
switch ($action) {
    
    // --- 用户注册 ---
    case 'register':
        $phone = $input['phone'] ?? '';
        $pass = $input['password'] ?? '';
        
        if (strlen($phone) < 11) {
            sendResponse(['error' => '请输入正确的手机号']);
        }
        if (strlen($pass) < 6) {
            sendResponse(['error' => '密码长度至少为6位']);
        }
        
        $uid = generateUID($pdo); // 在functions.php中定义
        $hashedPassword = password_hash($pass, PASSWORD_DEFAULT);
        
        try {
            $stmt = $pdo->prepare("INSERT INTO users (phone, uid, password, points) VALUES (?, ?, ?, 1000)");
            $stmt->execute([$phone, $uid, $hashedPassword]);
            sendResponse(['success' => true, 'uid' => $uid, 'msg' => '注册成功']);
        } catch (PDOException $e) {
            if ($e->getCode() == 23000) {
                sendResponse(['error' => '该手机号已被注册']);
            } else {
                sendResponse(['error' => '数据库错误: ' . $e->getMessage()]);
            }
        }
        break;

    // --- 用户登录 ---
    case 'login':
        $phone = $input['phone'] ?? '';
        $pass = $input['password'] ?? '';
        
        $stmt = $pdo->prepare("SELECT * FROM users WHERE phone = ?");
        $stmt->execute([$phone]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($user && password_verify($pass, $user['password'])) {
            // 登录成功，移除敏感字段
            unset($user['password']);
            sendResponse(['success' => true, 'user' => $user]);
        } else {
            sendResponse(['error' => '手机号或密码错误']);
        }
        break;

    // --- 搜索用户 (根据手机号找ID) ---
    case 'search':
        $phone = $input['phone'] ?? '';
        $stmt = $pdo->prepare("SELECT uid, phone FROM users WHERE phone = ?");
        $stmt->execute([$phone]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($result) {
            sendResponse($result);
        } else {
            sendResponse(['error' => '未找到该用户']);
        }
        break;

    // --- 积分转账 ---
    case 'transfer':
        $from_id = $input['from_id'] ?? 0;
        $to_uid = $input['to_uid'] ?? '';
        $amount = intval($input['amount'] ?? 0);
        
        if ($amount <= 0) {
            sendResponse(['error' => '转账金额必须大于0']);
        }

        try {
            $pdo->beginTransaction();
            
            // 检查余额
            $stmt = $pdo->prepare("SELECT points FROM users WHERE id = ? FOR UPDATE");
            $stmt->execute([$from_id]);
            $currentPoints = $stmt->fetchColumn();
            
            if ($currentPoints < $amount) {
                throw new Exception('余额不足');
            }
            
            // 扣除积分
            $stmt = $pdo->prepare("UPDATE users SET points = points - ? WHERE id = ?");
            $stmt->execute([$amount, $from_id]);
            
            // 增加积分
            $stmt = $pdo->prepare("UPDATE users SET points = points + ? WHERE uid = ?");
            $stmt->execute([$amount, $to_uid]);
            
            if ($stmt->rowCount() === 0) {
                throw new Exception('接收者ID无效');
            }
            
            $pdo->commit();
            sendResponse(['success' => true, 'msg' => '转账成功']);
        } catch (Exception $e) {
            $pdo->rollBack();
            sendResponse(['error' => $e->getMessage()]);
        }
        break;

    // --- 游戏发牌 ---
    case 'deal':
        $suits = ['spades', 'hearts', 'diamonds', 'clubs'];
        $values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king', 'ace'];
        $deck = [];
        foreach ($suits as $s) {
            foreach ($values as $v) {
                $deck[] = "{$v}_of_{$s}.svg";
            }
        }
        // 随机洗牌
        shuffle($deck);
        // 发放13张牌，排除大小王（大小王逻辑已在生成循环中避开）
        sendResponse(['cards' => array_slice($deck, 0, 13)]);
        break;

    // --- 提交比牌结果 ---
    case 'submit_hand':
        $user_id = $input['user_id'] ?? 0;
        $front = $input['front'] ?? [];
        $mid = $input['mid'] ?? [];
        $back = $input['back'] ?? [];

        if (count($front) != 3 || count($mid) != 5 || count($back) != 5) {
            sendResponse(['error' => '手牌数量不符合规则']);
        }

        // 计算三道牌力值
        $sFront = Shisanshui::getHandScore($front);
        $sMid = Shisanshui::getHandScore($mid);
        $sBack = Shisanshui::getHandScore($back);

        // 验证是否倒水 (规则：后道 >= 中道 >= 前道)
        if ($sBack < $sMid || $sMid < $sFront) {
            sendResponse(['error' => '倒水！后道必须 ≥ 中道 ≥ 前道']);
        } else {
            // 这里执行简单的胜负逻辑，例如：赢了增加积分
            // 实际复杂逻辑应根据对手进行比对，此处根据您的需求简化为出牌即得奖励
            $reward = 100; 
            $stmt = $pdo->prepare("UPDATE users SET points = points + ? WHERE id = ?");
            $stmt->execute([$reward, $user_id]);
            
            sendResponse([
                'success' => true, 
                'msg' => '出牌成功！',
                'analysis' => [
                    'front' => Shisanshui::analyzeHand($front)['rank'],
                    'mid' => Shisanshui::analyzeHand($mid)['rank'],
                    'back' => Shisanshui::analyzeHand($back)['rank']
                ]
            ]);
        }
        break;

    default:
        sendResponse(['error' => '无效的操作请求']);
        break;
}

/**
 * 助手函数：发送JSON响应
 */
function sendResponse($data) {
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}
