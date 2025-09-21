<?php
require_once __DIR__ . '/../db_connect.php';
require_once __DIR__ . '/../../utils/utils.php';

$conn = db_connect();

$data = json_decode(file_get_contents("php://input"));
$phone = $data->phone ?? '';
if (empty($phone)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Phone number is required.']);
    exit;
}
$stmt = $conn->prepare("SELECT id FROM users WHERE phone = ?");
$stmt->bind_param("s", $phone);
$stmt->execute();
$result = $stmt->get_result();
if ($user = $result->fetch_assoc()) {
    echo json_encode(['success' => true, 'userId' => $user['id']]);
} else {
    http_response_code(404);
    echo json_encode(['success' => false, 'message' => 'User not found.']);
}
$stmt->close();
$conn->close();
?>
