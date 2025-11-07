<?php
// 全局可用的辅助函数

function json_response($data, $status_code = 200) {
    http_response_code($status_code);
    echo json_encode($data);
    exit;
}

function get_request_data() {
    return json_decode(file_get_contents('php://input'), true);
}

// ... 未来可以添加更多如Token验证等函数
?>