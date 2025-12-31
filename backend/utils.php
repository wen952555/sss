<?php
// Note: This function now requires the PDO database connection object.
function generateUniqueShortId($pdo, $length = 4) {
    // Using a smaller, more readable character set.
    $chars = "0123456789abcdefghijklmnopqrstuvwxyz";
    do {
        $short_id = '';
        for ($i = 0; $i < $length; $i++) {
            $short_id .= $chars[rand(0, strlen($chars) - 1)];
        }
        $stmt = $pdo->prepare("SELECT id FROM users WHERE short_id = ?");
        $stmt->execute([$short_id]);
    } while ($stmt->fetchColumn());

    return $short_id;
}

function sendJSON($data, $code = 200) {
    http_response_code($code);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}
?>