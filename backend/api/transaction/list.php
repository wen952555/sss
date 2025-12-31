<?php
require_once __DIR__ . '/../../lib/auth.php';
require_once __DIR__ . '/../../lib/db.php';

header('Content-Type: application/json');

// 验证token
$headers = getallheaders();
$token = isset($headers['Authorization']) ? str_replace('Bearer ', '', $headers['Authorization']) : null;

$auth = new Auth();
$user_data = $auth->validateToken($token);

if (!$user_data) {
    http_response_code(401);
    echo json_encode(['error' => '未授权访问']);
    exit;
}

$user_id = $user_data['user_id'];
$page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
$limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 20;
$offset = ($page - 1) * $limit;

$database = new Database();
$conn = $database->getConnection();

try {
    // 获取总数
    $stmt = $conn->prepare("SELECT COUNT(*) FROM transactions WHERE from_user_id = :user_id OR to_user_id = :user_id");
    $stmt->bindParam(':user_id', $user_id);
    $stmt->execute();
    $total_records = $stmt->fetchColumn();

    // 获取分页数据
    $stmt = $conn->prepare("SELECT * FROM transactions WHERE from_user_id = :user_id OR to_user_id = :user_id ORDER BY created_at DESC LIMIT :limit OFFSET :offset");
    $stmt->bindParam(':user_id', $user_id);
    $stmt->bindParam(':limit', $limit, PDO::PARAM_INT);
    $stmt->bindParam(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();
    
    $transactions = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'transactions' => $transactions,
        'total' => $total_records,
        'page' => $page,
        'limit' => $limit
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => '查询交易记录失败: ' . $e->getMessage()]);
}
?>