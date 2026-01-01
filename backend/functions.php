<?php
// backend/functions.php
function generateUID($pdo) {
    $chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    while (true) {
        $uid = '';
        for ($i = 0; $i < 4; $i++) $uid .= $chars[rand(0, 35)];
        $stmt = $pdo->prepare("SELECT id FROM users WHERE uid = ?");
        $stmt->execute([$uid]);
        if (!$stmt->fetch()) return $uid;
    }
}
function sendResponse($data) {
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}