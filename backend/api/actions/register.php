<?php
require_once __DIR__ . '/../db_connect.php';
require_once __DIR__ . '/../../utils/utils.php';

try {
    $conn = db_connect();
    $data = json_decode(file_get_contents("php://input"));
    if (!isset($data->phone) || !isset($data->password)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => '手机号和密码均不能为空']);
        exit;
    }
    $phone = $data->phone;
    $password = $data->password;
    if (!preg_match('/^\d{11}$/', $phone)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => '无效的手机号格式']);
        exit;
    }
    if (strlen($password) < 6) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => '密码长度不能少于6位']);
        exit;
    }
    $stmt = $conn->prepare("SELECT id FROM users WHERE phone = ?");
    $stmt->bind_param("s", $phone);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($result->num_rows > 0) {
        http_response_code(409);
        echo json_encode(['success' => false, 'message' => '该手机号已被注册']);
        $stmt->close();
        exit;
    }
    $stmt->close();
    $passwordHash = password_hash($password, PASSWORD_DEFAULT);
    $stmt = $conn->prepare("INSERT INTO users (phone, password, points) VALUES (?, ?, ?)");
    $initialPoints = 1000;
    $stmt->bind_param("ssi", $phone, $passwordHash, $initialPoints);
    if ($stmt->execute()) {
        $newUserId = $stmt->insert_id;
        http_response_code(201);
        echo json_encode([
            'success' => true,
            'userId' => $newUserId,
            'userData' => [
                'id' => $newUserId,
                'phone' => $phone,
                'points' => $initialPoints
            ]
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => '注册失败，请稍后再试。']);
    }
    $stmt->close();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
} finally {
    if (isset($conn)) {
        $conn->close();
    }
}
?>
