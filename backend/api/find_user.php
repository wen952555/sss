<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type");

require_once 'db_connect.php';

$input = json_decode(file_get_contents('php://input'), true);

if (!$input || !isset($input['phone'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => '无效的请求，需要提供手机号。']);
    exit;
}

$phoneToFind = $input['phone'];

$stmt = $conn->prepare("SELECT id FROM users WHERE phone = ?");
$stmt->bind_param("s", $phoneToFind);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 1) {
    $row = $result->fetch_assoc();
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'userId' => $row['id'],
    ]);
    exit;
} else {
    http_response_code(404);
    echo json_encode(['success' => false, 'message' => '未找到该手机号对应的用户。']);
    exit;
}

$stmt->close();
$conn->close();
?>