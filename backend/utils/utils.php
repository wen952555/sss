<?php
// --- Helper Functions ---
function dealCards($conn, $roomId, $gameType, $playerCount) {
    $ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king', 'ace'];
    $suits = ['spades', 'hearts', 'clubs', 'diamonds'];
    $deck = [];
    foreach ($suits as $suit) {
        foreach ($ranks as $rank) {
            $deck[] = ['rank' => $rank, 'suit' => $suit];
        }
    }
    shuffle($deck);
    $cards_per_player = $gameType === 'eight' ? 8 : 13;
    $all_hands = [];
    for ($i = 0; $i < $playerCount; $i++) {
        $hand = array_slice($deck, $i * $cards_per_player, $cards_per_player);
        if ($gameType === 'eight') {
            $all_hands[$i] = ['top' => [], 'middle' => $hand, 'bottom' => []];
        } else {
            usort($hand, function ($a, $b) use ($ranks) {
                return array_search($b['rank'], $ranks) - array_search($a['rank'], $ranks);
            });
            $all_hands[$i] = [
                'top' => array_slice($hand, 10, 3),
                'middle' => array_slice($hand, 5, 5),
                'bottom' => array_slice($hand, 0, 5),
            ];
        }
    }

    // Deal hands to players
    $stmt = $conn->prepare("SELECT user_id FROM room_players WHERE room_id=? ORDER BY id ASC");
    $stmt->bind_param("i", $roomId);
    $stmt->execute();
    $playerIdsResult = $stmt->get_result();
    $i = 0;
    while ($row = $playerIdsResult->fetch_assoc()) {
        $handJson = json_encode($all_hands[$i++]);
        $updateStmt = $conn->prepare("UPDATE room_players SET initial_hand=? WHERE room_id=? AND user_id=?");
        $updateStmt->bind_param("sii", $handJson, $roomId, $row['user_id']);
        $updateStmt->execute();
        $updateStmt->close();
    }
    $stmt->close();

    // Update room status
    $stmt = $conn->prepare("UPDATE game_rooms SET status='playing' WHERE id=?");
    $stmt->bind_param("i", $roomId);
    $stmt->execute();
    $stmt->close();
}

?>
