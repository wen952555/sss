<?php
/**
 * 路径: backend/functions.php
 */
function generateUID($pdo) {
    $c = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    while (true) {
        $u = ''; for($i=0;$i<4;$i++) $u .= $c[rand(0,35)];
        $s = $pdo->prepare("SELECT id FROM users WHERE uid = ?");
        $s->execute([$u]);
        if (!$s->fetch()) return $u;
    }
}
function sendResponse($data) {
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}
