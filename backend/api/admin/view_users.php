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

// 验证管理员权限
if (!$auth->isAdmin($user_data['user_id'])) {
    http_response_code(403);
    echo json_encode(['error' => '需要管理员权限']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$database = new Database();
$conn = $database->getConnection();

// 获取查询参数
$page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
$limit = isset($_GET['limit']) ? min(100, max(1, intval($_GET['limit']))) : 20;
$offset = ($page - 1) * $limit;

// 获取用户总数
$query = "SELECT COUNT(*) as total FROM users";
$stmt = $conn->prepare($query);
$stmt->execute();
$total_result = $stmt->fetch(PDO::FETCH_ASSOC);
$total_users = $total_result['total'];

// 获取用户列表
$query = "SELECT user_id, phone, points, is_admin, created_at, updated_at 
          FROM users 
          ORDER BY created_at DESC 
          LIMIT :limit OFFSET :offset";
$stmt = $conn->prepare($query);
$stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
$stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
$stmt->execute();

$users = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo json_encode([
    'success' => true,
    'users' => $users,
    'pagination' => [
        'page' => $page,
        'limit' => $limit,
        'total' => $total_users,
        'pages' => ceil($total_users / $limit)
    ]
]);
?>