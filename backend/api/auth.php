<?php
// 在注册部分，放宽手机号验证：

if ($action == 'register') {
    $phone = $input['phone'] ?? '';
    $password = $input['password'] ?? '';
    $email = $input['email'] ?? '';
    
    // 验证手机号格式 - 放宽验证，只检查长度和是否为数字
    if (empty($phone) || strlen($phone) !== 11 || !is_numeric($phone)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => '请输入11位手机号']);
        exit;
    }
    
    if (empty($password) || strlen($password) < 6) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => '密码长度至少6位']);
        exit;
    }
    
    // 检查手机号是否已存在
    if ($userModel->phoneExists($phone)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => '手机号已注册']);
        exit;
    }
    
    $user_id = $userModel->createUser($phone, $password, $email);
    if ($user_id) {
        echo json_encode([
            'success' => true, 
            'message' => '注册成功',
            'user_id' => $user_id
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => '注册失败']);
    }
    
} elseif ($action == 'find_user_id') {
    $phone = $input['phone'] ?? '';
    
    if (empty($phone) || strlen($phone) !== 11 || !is_numeric($phone)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => '请输入11位手机号']);
        exit;
    }
    
    $user = $userModel->getUserByPhone($phone);
    if (!$user) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => '手机号未注册']);
        exit;
    }
    
    echo json_encode([
        'success' => true,
        'user_id' => $user['user_id'],
        'phone' => $user['phone']
    ]);
}
?>