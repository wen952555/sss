<?php
session_start(); // Ensure session is started
require __DIR__ . '/../db.php';
require __DIR__ . '/../utils.php';

// Get user_id from the session, which is more secure than client input
$user_id = $_SESSION['user_id'] ?? null;

if (!$user_id) {
    sendJSON(['status' => 'error', 'message' => '用户未登录或认证失败'], 401);
    exit;
}

$reservation_date = date('Y-m-d'); // Reservations are for the current day
$booking_fee = 10; // The cost to make a reservation

$pdo->beginTransaction();

try {
    // 1. Check if user has enough points
    $stmt = $pdo->prepare("SELECT points FROM users WHERE id = ? FOR UPDATE");
    $stmt->execute([$user_id]);
    $user = $stmt->fetch();

    if (!$user || $user['points'] < $booking_fee) {
        $pdo->rollBack();
        sendJSON(['status' => 'error', 'message' => '积分不足，无法预约'], 402); // 402 Payment Required
        exit;
    }

    // 2. Check for existing reservation for the current day
    $stmt = $pdo->prepare("SELECT id FROM reservations WHERE user_id = ? AND reservation_date = ?");
    $stmt->execute([$user_id, $reservation_date]);
    if ($stmt->fetch()) {
        $pdo->rollBack();
        sendJSON(['status' => 'error', 'message' => '您今天已经预约过了'], 409);
        exit;
    }

    // 3. Deduct points
    $stmt = $pdo->prepare("UPDATE users SET points = points - ? WHERE id = ?");
    $stmt->execute([$booking_fee, $user_id]);

    // 4. Create the reservation
    $stmt = $pdo->prepare("INSERT INTO reservations (user_id, reservation_date) VALUES (?, ?)");
    $stmt->execute([$user_id, $reservation_date]);
    $reservation_id = $pdo->lastInsertId();

    // 5. Commit the transaction
    $pdo->commit();

    sendJSON([
        'status' => 'success',
        'message' => '预约成功！已扣除 ' . $booking_fee . ' 积分。',
        'reservation_id' => $reservation_id
    ], 201);

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('Reservation Error: ' . $e->getMessage());
    sendJSON(['status' => 'error', 'message' => '服务器内部错误，预约失败'], 500);
}
?>
