<?php
require_once __DIR__ . '/api/db_connect.php';

echo "--- Starting Matchmaking Verification --- \n\n";

$conn = db_connect();

// Helper function to call the match action
function call_match($userId, $gameType, $gameMode, $playerCount) {
    $_GET['userId'] = $userId;
    $_GET['gameType'] = $gameType;
    $_GET['gameMode'] = $gameMode;
    $_GET['playerCount'] = $playerCount;

    ob_start();
    include __DIR__ . '/api/actions/match.php';
    $output = ob_get_clean();

    $data = json_decode($output, true);
    if (!$data || !$data['success']) {
        echo "Error: Matchmaking call failed for user $userId.\n";
        echo "Output: $output\n";
        exit(1);
    }
    return $data['roomId'];
}

// Clean up database before test
echo "Step 0: Cleaning up previous test data...\n";
$conn->query("DELETE FROM room_players");
$conn->query("DELETE FROM game_rooms");
echo "Success: Database cleaned.\n\n";

// Test Case 1: 4 players join a 4-player game
echo "--- Test Case 1: 4 players join a 4-player game ---\n";

// Player 1 joins
echo "Step 1.1: Player 1 joins...\n";
$roomId1 = call_match(1, 'thirteen', '4-normal', 4);
echo "Player 1 joined room $roomId1.\n";

// Player 2 joins
echo "Step 1.2: Player 2 joins...\n";
$roomId2 = call_match(2, 'thirteen', '4-normal', 4);
echo "Player 2 joined room $roomId2.\n";

if ($roomId1 !== $roomId2) {
    echo "Error: Player 2 should have joined Player 1's room. Got $roomId2, expected $roomId1.\n";
    exit(1);
}
echo "Success: Player 2 joined the same room as Player 1.\n";

// Player 3 joins
echo "Step 1.3: Player 3 joins...\n";
$roomId3 = call_match(3, 'thirteen', '4-normal', 4);
echo "Player 3 joined room $roomId3.\n";

// Player 4 joins
echo "Step 1.4: Player 4 joins...\n";
$roomId4 = call_match(4, 'thirteen', '4-normal', 4);
echo "Player 4 joined room $roomId4.\n";

// Verify room is full and cards are dealt
echo "Step 1.5: Verifying room status and cards...\n";
$stmt = $conn->prepare("SELECT status FROM game_rooms WHERE id = ?");
$stmt->bind_param("i", $roomId1);
$stmt->execute();
$result = $stmt->get_result()->fetch_assoc();
$stmt->close();

if ($result['status'] !== 'arranging') {
    echo "Error: Room status should be 'arranging', but it is '{$result['status']}'.\n";
    exit(1);
}
echo "Success: Room status is 'arranging'.\n";

$stmt = $conn->prepare("SELECT COUNT(*) as card_count FROM room_players WHERE room_id = ? AND initial_hand IS NOT NULL");
$stmt->bind_param("i", $roomId1);
$stmt->execute();
$result = $stmt->get_result()->fetch_assoc();
$stmt->close();

if ((int)$result['card_count'] !== 4) {
    echo "Error: Not all players have cards. Expected 4, got {$result['card_count']}.\n";
    exit(1);
}
echo "Success: All 4 players have been dealt cards.\n\n";

// Test Case 2: A 5th player joins, creating a new room
echo "--- Test Case 2: 5th player joins ---\n";
echo "Step 2.1: Player 5 joins...\n";
$roomId5 = call_match(5, 'thirteen', '4-normal', 4);
echo "Player 5 joined room $roomId5.\n";

if ($roomId5 === $roomId1) {
    echo "Error: Player 5 should have been put in a new room, but was put in room $roomId1.\n";
    exit(1);
}
echo "Success: Player 5 was placed in a new room ($roomId5).\n";

echo "\n--- Matchmaking Verification Successful! ---\n";

$conn->close();
?>
