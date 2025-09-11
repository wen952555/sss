<?php
require_once __DIR__ . '/../db_connect.php';
require_once __DIR__ . '/../../utils/utils.php';

$roomId = (int)($_GET['roomId'] ?? 0);
$userId = (int)($_GET['userId'] ?? 0);

if (!$roomId || !$userId) { echo json_encode(['success'=>false]); exit; }

// Cleanup inactive players from the room (zombie players)
// We only do this in the 'matching' or 'waiting' phase to not disrupt an ongoing game
$roomStatusStmt = $conn->prepare("SELECT status FROM game_rooms WHERE id = ?");
$roomStatusStmt->bind_param("i", $roomId);
$roomStatusStmt->execute();
$roomStatusResult = $roomStatusStmt->get_result()->fetch_assoc();
$roomStatusStmt->close();

if ($roomStatusResult && ($roomStatusResult['status'] === 'matching' || $roomStatusResult['status'] === 'waiting')) {
    $cleanupStmt = $conn->prepare("
        DELETE rp FROM room_players rp
        JOIN users u ON rp.user_id = u.id
        WHERE rp.room_id = ? AND u.last_active < NOW() - INTERVAL 2 MINUTE
    ");
    $cleanupStmt->bind_param("i", $roomId);
    $cleanupStmt->execute();
    $cleanupStmt->close();
}

// Update user's last active timestamp
if ($userId > 0) {
    $updateStmt = $conn->prepare("UPDATE users SET last_active = NOW() WHERE id = ?");
    $updateStmt->bind_param("i", $userId);
    $updateStmt->execute();
    $updateStmt->close();
}

$stmt = $conn->prepare("SELECT status FROM game_rooms WHERE id = ?");
$stmt->bind_param("i", $roomId);
$stmt->execute();
$room = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$room) { echo json_encode(['success'=>false]); exit; }

$stmt = $conn->prepare("SELECT u.id, u.phone, rp.is_ready, rp.is_auto_managed FROM room_players rp JOIN users u ON rp.user_id = u.id WHERE rp.room_id = ?");
$stmt->bind_param("i", $roomId);
$stmt->execute();
$playersResult = $stmt->get_result();
$players = [];
$aiCounter = 1;
while($row = $playersResult->fetch_assoc()) {
    if ($row['is_auto_managed'] == 1) {
        $row['phone'] = '电脑玩家 ' . $aiCounter++;
    }
    $players[] = $row;
}
$stmt->close();

$response = [
    'success' => true,
    'gameStatus' => $room['status'],
    'players' => $players
];

if ($room['status'] === 'playing' || $room['status'] === 'arranging') {
    $stmt = $conn->prepare("SELECT initial_hand FROM room_players WHERE room_id = ? AND user_id = ?");
    $stmt->bind_param("ii", $roomId, $userId);
    $stmt->execute();
    $handResult = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if ($handResult) {
        $response['hand'] = json_decode($handResult['initial_hand'], true);
    }
}
if ($room['status'] === 'finished') {
    $stmt = $conn->prepare("SELECT u.id, u.phone as name, rp.submitted_hand, rp.score, rp.is_auto_managed FROM room_players rp JOIN users u ON rp.user_id = u.id WHERE rp.room_id = ?");
    $stmt->bind_param("i", $roomId);
    $stmt->execute();
    $resultPlayersResult = $stmt->get_result();
    $resultPlayers = [];
    while($row = $resultPlayersResult->fetch_assoc()) {
        $row['hand'] = json_decode($row['submitted_hand'], true);
        unset($row['submitted_hand']);
        $resultPlayers[] = $row;
    }
    $stmt->close();
    $response['result'] = ['players' => $resultPlayers];
}
echo json_encode($response);
$conn->close();
?>
