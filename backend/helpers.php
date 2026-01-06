<?php
// 生成4位数字加字母的唯一ID
function generateShortId($pdo) {
    $chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    while (true) {
        $shortId = "";
        for ($i = 0; $i < 4; $i++) {
            $shortId .= $chars[rand(0, strlen($chars) - 1)];
        }
        $stmt = $pdo->prepare("SELECT id FROM users WHERE short_id = ?");
        $stmt->execute([$shortId]);
        if (!$stmt->fetch()) return $shortId;
    }
}

function sendResponse($data, $code = 200) {
    header('Content-Type: application/json');
    http_response_code($code);
    echo json_encode($data);
    exit;
}