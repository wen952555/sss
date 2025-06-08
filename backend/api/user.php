<?php
header('Content-Type: application/json');
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/auth.php';

$action = $_GET['action'] ?? '';
$db = new Database();
$auth = new Auth($db);

switch ($action) {
    case 'register':
        $phone = $_POST['phone'] ?? '';
        $password = $_POST['password'] ?? '';
        echo json_encode($auth->register($phone, $password));
        break;
    case 'login':
        $phone = $_POST['phone'] ?? '';
        $password = $_POST['password'] ?? '';
        echo json_encode($auth->login($phone, $password));
        break;
    case 'profile':
        $token = getBearerToken();
        if (!$auth->validateToken($token)) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            exit;
        }
        $userId = $auth->getUserIdFromToken($token);
        $user = $db->query("SELECT id, phone, points FROM users WHERE id = ?", [$userId])->fetch();
        echo json_encode($user);
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
