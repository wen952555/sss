<?php
session_start();
require 'db.php';
require 'utils.php';

header('Content-Type: application/json');

$user_id = $_SESSION['user_id'] ?? null;

// Even if user is not logged in, they should see the counts.
// The front-end will handle the UI for logging in.

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
    // --- Sub-query to get top 3 hands for a given session ---
    $getTopHands = function($date, $session_type) use ($pdo) {
        $sql = "
            SELECT u.username, r.hand_info, r.hand_rank
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

    // --- Process Today's Session ---
    $stmt_today = $pdo->prepare("SELECT COUNT(*) as count FROM reservations WHERE reservation_date = ? AND session_type = 'today'");
    $stmt_today->execute([$today_date]);
    $response['today']['count'] = (int) $stmt_today->fetchColumn();
    $response['today']['top_hands'] = $getTopHands($today_date, 'today');

    // --- Process Tomorrow's Session ---
    $stmt_tomorrow = $pdo->prepare("SELECT COUNT(*) as count FROM reservations WHERE reservation_date = ? AND session_type = 'tomorrow'");
    $stmt_tomorrow->execute([$tomorrow_date]);
    $response['tomorrow']['count'] = (int) $stmt_tomorrow->fetchColumn();
    $response['tomorrow']['top_hands'] = $getTopHands($tomorrow_date, 'tomorrow');

    // --- Check user's reservation status if logged in ---
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
    sendJSON(['status' => 'error', 'message' => '服务器内部错误，获取预约状态失败'], 500);
}
?>
