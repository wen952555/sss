<?php
// This file no longer needs the scorer for dealing cards, as no sorting that requires it is done here.

/**
 * Deals 13 cards to each player in the room.
 * The hand is arranged by a simple rank sort and sliced into lanes.
 * This is a fast and simple approach as per user instruction.
 */
function dealCardsFor4Players($conn, $roomId) {
    $ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king', 'ace'];
    $suits = ['spades', 'hearts', 'clubs', 'diamonds'];
    $deck = [];
    foreach ($suits as $suit) {
        foreach ($ranks as $rank) {
            $deck[] = ['rank' => $rank, 'suit' => $suit];
        }
    }
    shuffle($deck);

    $cards_per_player = 13;

    $stmt = $conn->prepare("SELECT user_id FROM room_players WHERE room_id=? ORDER BY id ASC");
    $stmt->bind_param("i", $roomId);
    $stmt->execute();
    $playerIdsResult = $stmt->get_result();

    $player_ids = [];
    while ($row = $playerIdsResult->fetch_assoc()) {
        $player_ids[] = $row['user_id'];
    }
    $stmt->close();

    for ($i = 0; $i < count($player_ids); $i++) {
        $hand_unsorted = array_slice($deck, $i * $cards_per_player, $cards_per_player);

        // Simple sort by rank as per user's new instruction
        usort($hand_unsorted, function ($a, $b) use ($ranks) {
            return array_search($b['rank'], $ranks) - array_search($a['rank'], $ranks);
        });

        // Slice into lanes directly
        $hand_arranged = [
            'bottom' => array_slice($hand_unsorted, 0, 5),
            'middle' => array_slice($hand_unsorted, 5, 5),
            'top' => array_slice($hand_unsorted, 10, 3),
        ];

        $handJson = json_encode($hand_arranged);

        $updateStmt = $conn->prepare("UPDATE room_players SET initial_hand=? WHERE room_id=? AND user_id=?");
        $updateStmt->bind_param("sii", $handJson, $roomId, $player_ids[$i]);
        $updateStmt->execute();
        $updateStmt->close();
    }

    // Update room status to 'arranging'
    $stmt = $conn->prepare("UPDATE game_rooms SET status='arranging' WHERE id=?");
    $stmt->bind_param("i", $roomId);
    $stmt->execute();
    $stmt->close();
}

function dealCardsFor8Players($conn, $roomId) {
    $stmt = $conn->prepare("SELECT COUNT(*) as playerCount FROM room_players WHERE room_id = ?");
    $stmt->bind_param("i", $roomId);
    $stmt->execute();
    $result = $stmt->get_result()->fetch_assoc();
    $playerCount = (int)$result['playerCount'];
    $stmt->close();

    $ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king', 'ace'];
    $suits = ['spades', 'hearts', 'clubs', 'diamonds'];
    $deck = [];

    // Base deck
    foreach ($suits as $suit) {
        foreach ($ranks as $rank) {
            $deck[] = ['rank' => $rank, 'suit' => $suit];
        }
    }

    $suits_to_add = $playerCount - 4;
    if ($suits_to_add > 0) {
        $additional_suits = array_slice($suits, 0, $suits_to_add);
        foreach ($additional_suits as $suit) {
            foreach ($ranks as $rank) {
                $deck[] = ['rank' => $rank, 'suit' => $suit];
            }
        }
    }

    if ($playerCount === 8) { // Two full decks for 8 players
        $deck = array_merge($deck, $deck);
    }

    shuffle($deck);

    $cards_per_player = 13;

    $stmt = $conn->prepare("SELECT user_id FROM room_players WHERE room_id=? ORDER BY id ASC");
    $stmt->bind_param("i", $roomId);
    $stmt->execute();
    $playerIdsResult = $stmt->get_result();

    $player_ids = [];
    while ($row = $playerIdsResult->fetch_assoc()) {
        $player_ids[] = $row['user_id'];
    }
    $stmt->close();

    for ($i = 0; $i < count($player_ids); $i++) {
        $hand_unsorted = array_slice($deck, $i * $cards_per_player, $cards_per_player);

        usort($hand_unsorted, function ($a, $b) use ($ranks) {
            return array_search($b['rank'], $ranks) - array_search($a['rank'], $ranks);
        });

        $hand_arranged = [
            'bottom' => array_slice($hand_unsorted, 0, 5),
            'middle' => array_slice($hand_unsorted, 5, 5),
            'top' => array_slice($hand_unsorted, 10, 3),
        ];

        $handJson = json_encode($hand_arranged);

        $updateStmt = $conn->prepare("UPDATE room_players SET initial_hand=? WHERE room_id=? AND user_id=?");
        $updateStmt->bind_param("sii", $handJson, $roomId, $player_ids[$i]);
        $updateStmt->execute();
        $updateStmt->close();
    }

    $stmt = $conn->prepare("UPDATE game_rooms SET status='arranging' WHERE id=?");
    $stmt->bind_param("i", $roomId);
    $stmt->execute();
    $stmt->close();
}

/**
 * Fills the remaining slots in a room with AI players.
 */
function fillWithAI($conn, $roomId, $gameType, $playersNeeded) {
    $stmt = $conn->prepare("SELECT COUNT(*) as current_players FROM room_players WHERE room_id=?");
    $stmt->bind_param("i", $roomId);
    $stmt->execute();
    $currentPlayers = $stmt->get_result()->fetch_assoc()['current_players'];
    $stmt->close();

    $aiToCreate = $playersNeeded - $currentPlayers;
    if ($aiToCreate <= 0) return;

    for ($i = 1; $i <= $aiToCreate; $i++) {
        $aiPhone = "ai_player_" . $i;
        $aiId = null;

        $stmt = $conn->prepare("SELECT id FROM users WHERE phone = ?");
        $stmt->bind_param("s", $aiPhone);
        $stmt->execute();
        $result = $stmt->get_result();
        if ($row = $result->fetch_assoc()) {
            $aiId = $row['id'];
        }
        $stmt->close();

        if (!$aiId) {
            $insertStmt = $conn->prepare("INSERT INTO users (phone, password, points) VALUES (?, '', 1000)");
            $insertStmt->bind_param("s", $aiPhone);
            $insertStmt->execute();
            $aiId = $insertStmt->insert_id;
            $insertStmt->close();
        }

        if ($aiId) {
            $stmt = $conn->prepare("INSERT INTO room_players (room_id, user_id, is_ready, is_auto_managed) VALUES (?, ?, 1, 1)");
            $stmt->bind_param("ii", $roomId, $aiId);
            $stmt->execute();
            $stmt->close();
        }
    }
}

// --- Auto-Sorter Logic ported from frontend ---
require_once __DIR__ . '/poker_evaluator.php';

function calculateHandStrategicScore($hand, $strategy = 'bottom') {
    $handStrings = [
        'top' => array_map(fn($c) => "{$c['rank']}_of_{$c['suit']}", $hand['top']),
        'middle' => array_map(fn($c) => "{$c['rank']}_of_{$c['suit']}", $hand['middle']),
        'bottom' => array_map(fn($c) => "{$c['rank']}_of_{$c['suit']}", $hand['bottom']),
    ];

    $handRanks = [
        'top' => sssAreaTypeRank(getSssAreaType($handStrings['top'], 'head'), 'head'),
        'middle' => sssAreaTypeRank(getSssAreaType($handStrings['middle'], 'middle'), 'middle'),
        'bottom' => sssAreaTypeRank(getSssAreaType($handStrings['bottom'], 'tail'), 'tail'),
    ];

    $laneScores = [
        'top' => getSssAreaScore($handStrings['top'], 'head'),
        'middle' => getSssAreaScore($handStrings['middle'], 'middle'),
        'bottom' => getSssAreaScore($handStrings['bottom'], 'tail'),
    ];

    $rankScore = 0;
    switch ($strategy) {
        case 'top':
            $rankScore = ($handRanks['top'] * 10000) + ($handRanks['middle'] * 100) + $handRanks['bottom'];
            break;
        case 'middle':
            $rankScore = ($handRanks['middle'] * 10000) + ($handRanks['bottom'] * 100) + $handRanks['top'];
            break;
        case 'bottom':
        default:
            $rankScore = ($handRanks['bottom'] * 10000) + ($handRanks['middle'] * 100) + $handRanks['top'];
            break;
    }

    $pointsScore = $laneScores['bottom'] + $laneScores['middle'] + $laneScores['top'];
    return $rankScore * 100 + $pointsScore;
}

function runExhaustiveSearch($cardObjects, $strategy) {
    $bestHands = [];
    $bestScore = -1;
    $bottomCombinations = combinations($cardObjects, 5);

    foreach ($bottomCombinations as $bottom) {
        $remainingAfterBottom = array_filter($cardObjects, fn($c) => !in_array($c, $bottom));
        $middleCombinations = combinations(array_values($remainingAfterBottom), 5);

        foreach ($middleCombinations as $middle) {
            $top = array_filter($remainingAfterBottom, fn($c) => !in_array($c, $middle));
            $top = array_values($top);

            if (count($top) !== 3) continue;

            $hand = ['top' => $top, 'middle' => $middle, 'bottom' => $bottom];

            $handStrings = [
                'top' => array_map(fn($c) => "{$c['rank']}_of_{$c['suit']}", $hand['top']),
                'middle' => array_map(fn($c) => "{$c['rank']}_of_{$c['suit']}", $hand['middle']),
                'bottom' => array_map(fn($c) => "{$c['rank']}_of_{$c['suit']}", $hand['bottom']),
            ];

            if (isSssFoul($handStrings)) {
                continue;
            }

            $currentScore = calculateHandStrategicScore($hand, $strategy);
            if ($currentScore > $bestScore) {
                $bestScore = $currentScore;
                $bestHands = [$hand];
            } else if ($currentScore === $bestScore) {
                $bestHands[] = $hand;
            }
        }
    }

    if (count($bestHands) > 0) {
        $randomIndex = array_rand($bestHands);
        return $bestHands[$randomIndex];
    }
    return null;
}

function getSmartSortedHandPHP($allCards, $strategy = 'bottom') {
    if (!$allCards || count($allCards) !== 13) return null;

    $cardObjects = array_map(function($c) {
        return is_string($c) ? parseCard($c) : $c;
    }, $allCards);

    $ranks = array_unique(array_map(fn($c) => $c['rank'], $cardObjects));
    if (count($ranks) === 13) {
        $sorted = sortCards($cardObjects);
        return ['top' => array_slice($sorted, 0, 3), 'middle' => array_slice($sorted, 3, 8), 'bottom' => array_slice($sorted, 8, 13)];
    }

    $bestHand = runExhaustiveSearch($cardObjects, $strategy);
    if ($bestHand) {
        return [
            'top' => sortCards($bestHand['top']),
            'middle' => sortCards($bestHand['middle']),
            'bottom' => sortCards($bestHand['bottom']),
        ];
    }

    return null;
}

function submitPlayerHand($conn, $userId, $roomId, $hand) {
    if (!$hand) {
        throw new Exception("Hand data is missing for user {$userId}.");
    }

    // In auto-submit, we generate a valid hand, but we check for foul as a safeguard.
    if (isSssFoul($hand)) {
        throw new Exception("倒水！Hand for user {$userId} is not valid.");
    }

    $handJson = json_encode($hand);
    $stmt = $conn->prepare("UPDATE room_players SET submitted_hand = ? WHERE user_id = ? AND room_id = ?");
    $stmt->bind_param("sii", $handJson, $userId, $roomId);
    $stmt->execute();
    $stmt->close();

    // Check if all players have submitted their hands
    $stmt = $conn->prepare("SELECT player_count FROM game_rooms WHERE id = ?");
    $stmt->bind_param("i", $roomId);
    $stmt->execute();
    $playerCount = $stmt->get_result()->fetch_assoc()['player_count'];
    $stmt->close();

    $stmt = $conn->prepare("SELECT COUNT(*) as submitted_count FROM room_players WHERE room_id = ? AND submitted_hand IS NOT NULL");
    $stmt->bind_param("i", $roomId);
    $stmt->execute();
    $submittedCount = $stmt->get_result()->fetch_assoc()['submitted_count'];
    $stmt->close();

    if ($submittedCount === $playerCount) {
        // All hands are in, calculate scores and finish the game
        $stmt = $conn->prepare("SELECT user_id, submitted_hand FROM room_players WHERE room_id = ?");
        $stmt->bind_param("i", $roomId);
        $stmt->execute();
        $result = $stmt->get_result();
        $players = [];
        while ($row = $result->fetch_assoc()) {
            $players[] = [
                'id' => $row['user_id'],
                'hand' => json_decode($row['submitted_hand'], true)
            ];
        }
        $stmt->close();

        $scores = [];
        foreach ($players as $p) {
            $scores[$p['id']] = 0;
        }

        for ($i = 0; $i < count($players); $i++) {
            for ($j = $i + 1; $j < count($players); $j++) {
                $p1 = $players[$i];
                $p2 = $players[$j];
                $pair_score = calculateSinglePairScore($p1['hand'], $p2['hand']);
                $scores[$p1['id']] += $pair_score;
                $scores[$p2['id']] -= $pair_score;
            }
        }

        foreach ($scores as $pId => $finalScore) {
            $stmt = $conn->prepare("UPDATE room_players SET score = ? WHERE user_id = ? AND room_id = ?");
            $stmt->bind_param("iii", $finalScore, $pId, $roomId);
            $stmt->execute();
            $stmt->close();
        }

        // Update game room status to finished
        $stmt = $conn->prepare("UPDATE game_rooms SET status = 'finished' WHERE id = ?");
        $stmt->bind_param("i", $roomId);
        $stmt->execute();
        $stmt->close();
    }
}
?>
