<?php
// SUITS and RANKS constants (for card representation)
define('SUITS', ['H' => 'Hearts', 'D' => 'Diamonds', 'C' => 'Clubs', 'S' => 'Spades']);
define('RANKS', [
    '2' => 2, '3' => 3, '4' => 4, '5' => 5, '6' => 6, '7' => 7, '8' => 8, '9' => 9,
    'T' => 10, 'J' => 11, 'Q' => 12, 'K' => 13, 'A' => 14
]); // T for Ten, A for Ace (can be low for A2345 straight)

function create_deck() {
    $deck = [];
    foreach (array_keys(SUITS) as $suit) {
        foreach (array_keys(RANKS) as $rank) {
            $deck[] = $rank . $suit; // e.g., "AH", "KD", "2C"
        }
    }
    return $deck;
}

function shuffle_deck(&$deck) {
    shuffle($deck);
}

function deal_cards($numPlayers = 4, $cardsPerPlayer = 13) {
    if ($numPlayers * $cardsPerPlayer > 52) {
        return false; // Not enough cards
    }
    $deck = create_deck();
    shuffle_deck($deck);

    $hands = array_fill(0, $numPlayers, []);
    for ($i = 0; $i < $cardsPerPlayer; $i++) {
        for ($j = 0; $j < $numPlayers; $j++) {
            $hands[$j][] = array_pop($deck);
        }
    }
    return $hands;
}

// --- Thirteen Shui Specific Logic ---
// This is where the most complex logic will go.
// You'll need functions for:
// 1. Parsing a hand into front, middle, back (3, 5, 5 cards)
// 2. Validating if a segment is a valid poker hand (pair, two pair, three of a kind, straight, flush, etc.)
// 3. Evaluating the strength of each segment
// 4. Comparing two players' arranged hands segment by segment
// 5. Calculating scores based on comparisons and special hands (冲三, 铁支, 同花顺, etc.)
// 6. Handling "打枪" (scoop) and "全垒打" (grand slam / home run)

/**
 * Evaluates a single segment of 3 or 5 cards.
 * Returns an array like ['type' => 'straight', 'rank' => 9, 'high_card' => '9', 'kickers' => [...]]
 * This is highly complex.
 */
function evaluate_segment(array $cards) {
    // TODO: Implement poker hand evaluation for this segment
    // Consider card sorting, counting ranks, checking suits
    // Return a structured representation of the hand type and its value for comparison
    // Example hand types: '乌龙', '一对', '两对', '三条', '顺子', '同花', '葫芦', '铁支', '同花顺'
    // For 3-card front: '乌龙', '一对', '三条'
    return ['type' => 'placeholder', 'value' => 0, 'description' => 'Not implemented'];
}

/**
 * Validates if the arranged hand is legal (front <= middle <= back).
 * And checks for "倒水" (mis-set hand / invalid arrangement).
 */
function is_arrangement_valid(array $front, array $middle, array $back) {
    // TODO: Implement logic to compare evaluated segments
    // $evalFront = evaluate_segment($front);
    // $evalMiddle = evaluate_segment($middle);
    // $evalBack = evaluate_segment($back);
    // Compare $evalFront with $evalMiddle, and $evalMiddle with $evalBack
    // This comparison itself is non-trivial as you need a robust hand ranking system.
    return true; // Placeholder
}

/**
 * Compares two players' fully arranged hands and calculates points.
 */
function compare_player_hands(array $player1Arrangement, array $player2Arrangement) {
    // $player1Arrangement = ['front' => [...], 'middle' => [...], 'back' => [...]];
    // TODO: Implement comparison logic for each segment (front vs front, middle vs middle, back vs back)
    // TODO: Add logic for "打枪" (scooping - winning all 3 segments)
    // TODO: Add logic for special hand bonuses (e.g. 铁支 in back, 葫芦 in middle)
    $player1Score = 0;
    $player2Score = 0;

    // Placeholder comparison
    // Compare front:
    // if (evaluate_segment($player1Arrangement['front']) > evaluate_segment($player2Arrangement['front'])) $player1Score++; else $player2Score++;
    // Compare middle:
    // if (evaluate_segment($player1Arrangement['middle']) > evaluate_segment($player2Arrangement['middle'])) $player1Score++; else $player2Score++;
    // Compare back:
    // if (evaluate_segment($player1Arrangement['back']) > evaluate_segment($player2Arrangement['back'])) $player1Score++; else $player2Score++;

    return ['player1_score' => $player1Score, 'player2_score' => $player2Score];
}


// --- API related game functions ---
function create_new_game_room($userId) {
    $conn = get_db_connection();
    // For simplicity, room code could be a short unique string
    $roomCode = strtoupper(substr(bin2hex(random_bytes(3)), 0, 5)); // e.g., A3B5D
    $status = 'waiting'; // waiting, playing, finished

    $stmt = $conn->prepare("INSERT INTO rooms (room_code, creator_id, status, created_at) VALUES (?, ?, ?, NOW())");
    if ($stmt->execute([$roomCode, $userId, $status])) {
        $roomId = $conn->lastInsertId();
        // Add creator to the room_players table
        $stmtPlayer = $conn->prepare("INSERT INTO room_players (room_id, user_id, join_order) VALUES (?, ?, 1)");
        $stmtPlayer->execute([$roomId, $userId]);
        return ['room_id' => $roomId, 'room_code' => $roomCode];
    }
    return false;
}

function join_game_room($userId, $roomCode) {
    $conn = get_db_connection();
    $stmt = $conn->prepare("SELECT id, status, (SELECT COUNT(*) FROM room_players WHERE room_id = rooms.id) as player_count FROM rooms WHERE room_code = ?");
    $stmt->execute([$roomCode]);
    $room = $stmt->fetch();

    if (!$room) {
        return ['error' => 'Room not found.'];
    }
    if ($room['player_count'] >= 4) { // Max 4 players
        return ['error' => 'Room is full.'];
    }
    if ($room['status'] !== 'waiting') {
        return ['error' => 'Game already started or finished.'];
    }

    // Check if user already in room
    $stmtCheck = $conn->prepare("SELECT user_id FROM room_players WHERE room_id = ? AND user_id = ?");
    $stmtCheck->execute([$room['id'], $userId]);
    if ($stmtCheck->fetch()) {
        return ['message' => 'Already in room.', 'room_id' => $room['id']]; // Or an error if you don't allow rejoining
    }

    $nextJoinOrder = $room['player_count'] + 1;
    $stmtPlayer = $conn->prepare("INSERT INTO room_players (room_id, user_id, join_order) VALUES (?, ?, ?)");
    if ($stmtPlayer->execute([$room['id'], $userId, $nextJoinOrder])) {
        return ['room_id' => $room['id'], 'room_code' => $roomCode];
    }
    return ['error' => 'Failed to join room.'];
}

function start_game($roomId, $userId) {
    $conn = get_db_connection();
    // Check if user is creator or if all players ready (add a 'ready' status to room_players if needed)
    $stmtRoom = $conn->prepare("SELECT creator_id, status, (SELECT COUNT(*) FROM room_players WHERE room_id = rooms.id) as player_count FROM rooms WHERE id = ?");
    $stmtRoom->execute([$roomId]);
    $room = $stmtRoom->fetch();

    if (!$room) return ['error' => 'Room not found'];
    // if ($room['creator_id'] != $userId) return ['error' => 'Only creator can start the game']; // Or implement ready system
    if ($room['status'] !== 'waiting') return ['error' => 'Game not in waiting state'];
    if ($room['player_count'] < 2) return ['error' => 'Need at least 2 players to start']; // Or 4, depending on rules

    // Deal cards
    $hands = deal_cards($room['player_count']);
    if (!$hands) return ['error' => 'Failed to deal cards'];

    // Get players in the room
    $stmtPlayers = $conn->prepare("SELECT user_id FROM room_players WHERE room_id = ? ORDER BY join_order ASC");
    $stmtPlayers->execute([$roomId]);
    $players = $stmtPlayers->fetchAll(PDO::FETCH_COLUMN);

    $conn->beginTransaction();
    try {
        // Create a game instance
        $stmtGame = $conn->prepare("INSERT INTO games (room_id, current_round, status) VALUES (?, 1, 'dealing')");
        $stmtGame->execute([$roomId]);
        $gameId = $conn->lastInsertId();

        // Store dealt hands for each player in game_player_hands
        $stmtHand = $conn->prepare("INSERT INTO game_player_hands (game_id, user_id, hand_cards, round_number) VALUES (?, ?, ?, 1)");
        foreach ($players as $index => $playerId) {
            $stmtHand->execute([$gameId, $playerId, json_encode($hands[$index])]);
        }

        // Update room status
        $stmtUpdateRoom = $conn->prepare("UPDATE rooms SET status = 'playing', current_game_id = ? WHERE id = ?");
        $stmtUpdateRoom->execute([$gameId, $roomId]);

        $conn->commit();
        return ['message' => 'Game started!', 'game_id' => $gameId, 'player_hands' => $hands]; // For testing, you might return hands. In prod, player gets their own.
    } catch (Exception $e) {
        $conn->rollBack();
        error_log("Start game error: " . $e->getMessage());
        return ['error' => 'Failed to start game. ' . $e->getMessage()];
    }
}

function get_player_hand($gameId, $userId) {
    $conn = get_db_connection();
    $stmt = $conn->prepare("SELECT hand_cards FROM game_player_hands WHERE game_id = ? AND user_id = ? AND round_number = (SELECT current_round FROM games WHERE id = ?)");
    $stmt->execute([$gameId, $userId, $gameId]);
    $handData = $stmt->fetch();
    if ($handData) {
        return ['hand' => json_decode($handData['hand_cards'], true)];
    }
    return ['error' => 'Hand not found or game not active for this player.'];
}


function submit_player_arrangement($gameId, $userId, $arrangement) {
    // $arrangement = ['front' => ['C1', 'D1', 'H1'], 'middle' => [...5 cards...], 'back' => [...5 cards...]];
    $conn = get_db_connection();

    // 1. Validate input: 3 cards in front, 5 in middle, 5 in back
    if (count($arrangement['front'] ?? []) !== 3 || count($arrangement['middle'] ?? []) !== 5 || count($arrangement['back'] ?? []) !== 5) {
        return ['error' => 'Invalid card counts for arrangement.'];
    }

    // 2. Verify all 13 cards submitted are from player's actual hand and unique
    $playerHandData = get_player_hand($gameId, $userId);
    if (isset($playerHandData['error'])) return $playerHandData;
    $originalHand = $playerHandData['hand'];
    $submittedCards = array_merge($arrangement['front'], $arrangement['middle'], $arrangement['back']);
    if (count($submittedCards) !== 13 || count(array_unique($submittedCards)) !== 13) {
         return ['error' => 'Invalid number of unique cards submitted.'];
    }
    foreach ($submittedCards as $card) {
        if (!in_array($card, $originalHand)) {
            return ['error' => "Card {$card} not in original hand."];
        }
    }
    // Check for duplicate cards within the submitted arrangement
    if (count($submittedCards) !== count(array_unique($submittedCards))) {
        return ['error' => "Duplicate cards submitted in arrangement."];
    }


    // 3. Validate "倒水" (mis-set hand) - THIS IS CRUCIAL AND COMPLEX
    // You need evaluate_segment() and a comparison function for hand strengths
    // if (!is_arrangement_valid($arrangement['front'], $arrangement['middle'], $arrangement['back'])) {
    //     return ['error' => '倒水! Invalid hand arrangement. Front must be weaker than middle, middle weaker than back.'];
    // }
    // For now, we'll skip full validation for brevity
    $front_eval = json_encode(evaluate_segment($arrangement['front'])); // Store evaluated segment if needed
    $middle_eval = json_encode(evaluate_segment($arrangement['middle']));
    $back_eval = json_encode(evaluate_segment($arrangement['back']));


    // 4. Store the arrangement
    $stmt = $conn->prepare("UPDATE game_player_hands
                            SET arranged_front = ?, arranged_middle = ?, arranged_back = ?,
                                arranged_front_eval = ?, arranged_middle_eval = ?, arranged_back_eval = ?,
                                submitted_at = NOW()
                            WHERE game_id = ? AND user_id = ? AND round_number = (SELECT current_round FROM games WHERE id = ?)");
    $success = $stmt->execute([
        json_encode($arrangement['front']),
        json_encode($arrangement['middle']),
        json_encode($arrangement['back']),
        $front_eval, $middle_eval, $back_eval, // Store evaluations
        $gameId, $userId, $gameId
    ]);

    if ($success && $stmt->rowCount() > 0) {
        // TODO: Check if all players have submitted. If so, trigger comparison.
        // This check_all_submitted_and_compare() function would be called here.
        return ['message' => 'Hand submitted successfully.'];
    } else {
        return ['error' => 'Failed to submit hand or hand already submitted.'];
    }
}

function get_game_state($gameId, $userId) {
    $conn = get_db_connection();
    // Fetch game info, players in game, their status (submitted hand or not),
    // and if all submitted, show all hands and scores.
    // This is a key function for frontend polling.

    $stmtGame = $conn->prepare("
        SELECT g.id as game_id, g.status as game_status, g.current_round, r.room_code
        FROM games g
        JOIN rooms r ON g.room_id = r.id
        WHERE g.id = ?
    ");
    $stmtGame->execute([$gameId]);
    $gameInfo = $stmtGame->fetch();

    if (!$gameInfo) return ['error' => 'Game not found'];

    $stmtPlayers = $conn->prepare("
        SELECT
            u.id as user_id,
            u.username,
            gph.hand_cards,
            gph.arranged_front,
            gph.arranged_middle,
            gph.arranged_back,
            gph.score,
            gph.submitted_at IS NOT NULL as has_submitted
        FROM game_player_hands gph
        JOIN users u ON gph.user_id = u.id
        WHERE gph.game_id = ? AND gph.round_number = ?
        ORDER BY u.id -- Or some player order
    ");
    $stmtPlayers->execute([$gameId, $gameInfo['current_round']]);
    $playersData = $stmtPlayers->fetchAll();

    $allSubmitted = true;
    $clientPlayers = [];
    foreach ($playersData as $player) {
        if (!$player['has_submitted']) {
            $allSubmitted = false;
        }
        $playerState = [
            'userId' => $player['user_id'],
            'username' => $player['username'],
            'hasSubmitted' => (bool)$player['has_submitted'],
        ];
        // Only send hand to the owner before all submitted, or if game is over
        if ($player['user_id'] == $userId && !$allSubmitted) {
            $playerState['hand'] = json_decode($player['hand_cards'], true);
        }
        // If all submitted or game is over, show everyone's cards and scores
        if ($allSubmitted || $gameInfo['game_status'] === 'finished') {
             $playerState['hand'] = json_decode($player['hand_cards'], true); // Original hand
             $playerState['arrangement'] = [
                'front' => json_decode($player['arranged_front'], true),
                'middle' => json_decode($player['arranged_middle'], true),
                'back' => json_decode($player['arranged_back'], true),
             ];
             $playerState['score'] = $player['score']; // You need to calculate and store this
        }
        $clientPlayers[] = $playerState;
    }

    // If all players have submitted and game not yet comparing/finished, trigger comparison
    if ($allSubmitted && $gameInfo['game_status'] === 'dealing') { // Or 'arranging'
        // TODO: Call a function here to compare all hands, calculate scores, update DB, and set game_status to 'comparing' or 'finished'.
        // compare_all_hands_and_update_scores($gameId, $playersData);
        // For now, just reflect this might happen
        $gameInfo['game_status'] = 'comparing_soon'; // A temporary status
    }


    return [
        'gameInfo' => $gameInfo,
        'players' => $clientPlayers,
        'allSubmitted' => $allSubmitted,
        'currentUser' => [
            'id' => $userId,
            // other current user details if needed
        ]
    ];
}
?>
