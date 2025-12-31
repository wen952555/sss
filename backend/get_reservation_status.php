<?php
session_start();
require __DIR__ . '/db.php';
require __DIR__ . '/utils.php';

header('Content-Type: application/json');

$user_id = $_SESSION['user_id'] ?? null;

$today_date = date('Y-m-d');
$tomorrow_date = date('Y-m-d', strtotime('+1 day'));

$response = [
    'today' => [
        'count' => 0,
        'user_has_reserved' => false,
        'top_hands' => []
    ],
    'tomorrow' => [
        'count' => 0,
        'user_has_reserved' => false,
        'top_hands' => []
    ]
];

try {
    $getTopHands = function($date, $session_type) use ($pdo) {
        $sql = "
            SELECT u.short_id, r.hand_description, r.hand_rank
            FROM reservations r
            JOIN users u ON r.user_id = u.id
            WHERE r.reservation_date = ? AND r.session_type = ?
            ORDER BY r.hand_rank DESC
            LIMIT 3
        ";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$date, $session_type]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    };

    // ---

    $stmt_today = $pdo->prepare("SELECT COUNT(*) as count FROM reservations WHERE reservation_date = ? AND session_type = 'today'");
    $stmt_today->execute([$today_date]);
    $response['today']['count'] = (int) $stmt_today->fetchColumn();
    if ($response['today']['count'] > 0) {
        $response['today']['top_hands'] = $getTopHands($today_date, 'today');
    }

    // ---

    $stmt_tomorrow = $pdo->prepare("SELECT COUNT(*) as count FROM reservations WHERE reservation_date = ? AND session_type = 'tomorrow'");
    $stmt_tomorrow->execute([$tomorrow_date]);
    $response['tomorrow']['count'] = (int) $stmt_tomorrow->fetchColumn();
    if ($response['tomorrow']['count'] > 0) {
        $response['tomorrow']['top_hands'] = $getTopHands($tomorrow_date, 'tomorrow');
    }

    // ---

    if ($user_id) {
        $stmt_user_today = $pdo->prepare("SELECT 1 FROM reservations WHERE user_id = ? AND reservation_date = ? AND session_type = 'today'");
        $stmt_user_today->execute([$user_id, $today_date]);
        if ($stmt_user_today->fetch()) {
            $response['today']['user_has_reserved'] = true;
        }

        $stmt_user_tomorrow = $pdo->prepare("SELECT 1 FROM reservations WHERE user_id = ? AND reservation_date = ? AND session_type = 'tomorrow'");
        $stmt_user_tomorrow->execute([$user_id, $tomorrow_date]);
        if ($stmt_user_tomorrow->fetch()) {
            $response['tomorrow']['user_has_reserved'] = true;
        }
    }

    sendJSON($response, 200);

} catch (Exception $e) {
    error_log("Get Reservation Status Error: " . $e->getMessage());
    sendJSON(['status' => 'error', 'message' => '服务器内部错误，获取预约状态失败', 'details' => $e->getMessage()], 500);
}
?>