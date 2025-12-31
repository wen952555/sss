<?php
require_once __DIR__ . '/../../config.php';

header('Content-Type: application/json');

echo json_encode([
    'success' => true,
    'message' => '登出成功'
]);
?>