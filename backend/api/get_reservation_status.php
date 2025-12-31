<?php
session_start();
require __DIR__ . '/../db.php';
require __DIR__ . '/../utils.php';

$user_id = $_SESSION['user_id'] ?? null;

if (!$user_id) {
    sendJSON(['has_reservation' => false, 'message' => 'User not authenticated'], 401);
    exit;
}

$reservation_date = date('Y-m-d');

try {
    $stmt = $pdo->prepare("SELECT id FROM reservations WHERE user_id = ? AND reservation_date = ?");
    $stmt->execute([$user_id, $reservation_date]);
    $has_reservation = $stmt->fetch() !== false;

    sendJSON(['has_reservation' => $has_reservation], 200);

} catch (Exception $e) {
    error_log("Get Reservation Status Error: " . $e->getMessage());
    sendJSON(['error' => 'Server error while checking reservation status.'], 500);
}
?>