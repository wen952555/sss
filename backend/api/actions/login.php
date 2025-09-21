<?php
require_once __DIR__ . '/../db_connect.php';
require_once __DIR__ . '/../../utils/utils.php';

$conn = db_connect();

$data = json_decode(file_get_contents("php://input"));
if (!isset($data->phone) || !isset($data->password)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => '手机号和密码均不能为空']);
    exit;
}
$phone = $data->phone;
$password = $data->password;
$stmt = $conn->prepare("SELECT id, password, phone, points FROM users WHERE phone = ?");
$stmt->bind_param("s", $phone);
$stmt->execute();
$result = $stmt->get_result();
if ($result->num_rows === 1) {
    $foundUser = $result->fetch_assoc();
    if (password_verify($password, $foundUser['password'])) {
        $userDataForFrontend = [
            'id' => $foundUser['id'],
            'phone' => $foundUser['phone'],
            'points' => $foundUser['points']
        ];
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'userId' => $foundUser['id'],
            'userData' => $userDataForFrontend
        ]);
    } else {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => '手机号或密码错误']);
    }
} else {
    http_response_code(404);
    echo json_encode(['success' => false, 'message' => '手机号或密码错误']);
}
$stmt->close();
$conn->close();
?>
