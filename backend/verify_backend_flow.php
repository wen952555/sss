<?php
require_once __DIR__ . '/api/db_connect.php';
require_once __DIR__ . '/utils/utils.php';
require_once __DIR__ . '/api/actions/match.php';
require_once __DIR__ . '/api/actions/player_action.php';

echo "--- Starting Backend Verification --- \n";

// Mock user and game parameters
$userId = 1; // Assume user with ID 1 exists
$gameType = 'thirteen';
$gameMode = '4-normal';
$playersNeeded = 4;

// 1. Simulate Matchmaking
echo "Step 1: Simulating matchmaking for user $userId...\n";
$_GET['gameType'] = $gameType;
$_GET['gameMode'] = $gameMode;
$_GET['userId'] = $userId;
$_GET['playerCount'] = $playersNeeded;

// Capture output of match.php
ob_start();
include __DIR__ . '/api/actions/match.php';
$match_output = ob_get_clean();
$match_data = json_decode($match_output, true);

if (!$match_data || !$match_data['success']) {
    echo "Error: Matchmaking failed.\n";
    exit(1);
}
$roomId = $match_data['roomId'];
echo "Success: User $userId joined room $roomId.\n";

// 2. Verify AI players were added
echo "Step 2: Verifying AI players...\n";
$stmt = $conn->prepare("SELECT COUNT(*) as playerCount FROM room_players WHERE room_id = ?");
$stmt->bind_param("i", $roomId);
$stmt->execute();
$result = $stmt->get_result()->fetch_assoc();
$playerCount = (int)$result['playerCount'];
$stmt->close();

if ($playerCount !== $playersNeeded) {
    echo "Error: Room was not filled with AI. Expected $playersNeeded players, found $playerCount.\n";
    exit(1);
}
echo "Success: Room has correct number of players ($playerCount).\n";

// 3. Simulate Player Ready
echo "Step 3: Simulating player ready action...\n";
$_POST['userId'] = $userId;
$_POST['roomId'] = $roomId;
$_POST['action'] = 'ready';

// Hack to simulate php://input for player_action.php
global $mock_input;
$mock_input = json_encode(['userId' => $userId, 'roomId' => $roomId, 'action' => 'ready']);
function file_get_contents($filename) {
    global $mock_input;
    if ($filename === 'php://input') {
        return $mock_input;
    }
    return \file_get_contents($filename);
}

ob_start();
include __DIR__ . '/api/actions/player_action.php';
$action_output = ob_get_clean();
$action_data = json_decode($action_output, true);

if (!$action_data || !$action_data['success']) {
    echo "Error: Player ready action failed.\n";
    print_r($action_data);
    exit(1);
}
echo "Success: Player ready action completed.\n";

// 4. Verify Cards were dealt
echo "Step 4: Verifying cards were dealt...\n";
$stmt = $conn->prepare("SELECT initial_hand FROM room_players WHERE room_id = ? AND user_id = ?");
$stmt->bind_param("ii", $roomId, $userId);
$stmt->execute();
$result = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (empty($result['initial_hand'])) {
    echo "Error: Cards were not dealt to player.\n";
    exit(1);
}
echo "Success: Cards were dealt to player.\n";

echo "\n--- Backend Verification Successful! ---\n";
?>
