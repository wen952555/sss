<?php
header('Content-Type: application/json');
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/auth.php';

$action = $_GET['action'] ?? '';
$db = new Database();
$auth = new Auth($db);

// 验证JWT令牌
$token = getBearerToken();
if (!$auth->validateToken($token)) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$userId = $auth->getUserIdFromToken($token);

switch ($action) {
    case 'transfer':
        $receiverPhone = $_POST['phone'] ?? '';
        $amount = intval($_POST['amount'] ?? 0);
        echo json_encode($auth->transferPoints($userId, $receiverPhone, $amount));
        break;
    case 'transactions':
        $transactions = $db->query("
            SELECT * FROM point_transactions 
            WHERE sender_id = ? OR receiver_id = ?
            ORDER BY created_at DESC
        ", [$userId, $userId])->fetchAll();
        echo json_encode($transactions);
        break;
    default:
        http_response_code(400);
        echo json_encode(['error' => 'Invalid action']);
}

function getBearerToken() {
    $headers = getallheaders();
    if (isset($headers['Authorization'])) {
        if (preg_match('/Bearer\s(\S+)/', $headers['Authorization'], $matches)) {
            return $matches[1];
        }
    }
    return null;
}
?>
