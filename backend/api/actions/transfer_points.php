<?php
require_once __DIR__ . '/../db_connect.php';
require_once __DIR__ . '/../../utils/utils.php';

$data = json_decode(file_get_contents("php://input"));
$fromId = (int)($data->fromId ?? 0);
$toId = (int)($data->toId ?? 0);
$amount = (int)($data->amount ?? 0);

if (!$fromId || !$toId || $amount <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid transfer parameters.']);
    exit;
}

$conn->begin_transaction();
try {
    // Check sender's balance
    $stmt = $conn->prepare("SELECT points FROM users WHERE id = ? FOR UPDATE");
    $stmt->bind_param("i", $fromId);
    $stmt->execute();
    $sender = $stmt->get_result()->fetch_assoc();

    if (!$sender || $sender['points'] < $amount) {
        throw new Exception('Insufficient points.');
    }

    // Perform transfer
    $stmt = $conn->prepare("UPDATE users SET points = points - ? WHERE id = ?");
    $stmt->bind_param("ii", $amount, $fromId);
    $stmt->execute();

    $stmt = $conn->prepare("UPDATE users SET points = points + ? WHERE id = ?");
    $stmt->bind_param("ii", $amount, $toId);
    $stmt->execute();

    // Get updated user data for the sender
    $stmt = $conn->prepare("SELECT id, phone, points FROM users WHERE id = ?");
    $stmt->bind_param("i", $fromId);
    $stmt->execute();
    $updatedUser = $stmt->get_result()->fetch_assoc();

    $conn->commit();
    echo json_encode(['success' => true, 'updatedUser' => $updatedUser]);

} catch (Exception $e) {
    $conn->rollback();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Transfer failed: ' . $e->getMessage()]);
}
$stmt->close();
$conn->close();
?>
