<?php
require_once __DIR__ . '/../db_connect.php';
require_once __DIR__ . '/../../utils/scorer.php';

header('Content-Type: application/json');

// Read the raw POST data
$post_data = json_decode(file_get_contents("php://input"), true);

// Check for JSON decoding errors
if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid JSON input.']);
    exit;
}

// Get the hands from the post data
$hand1 = $post_data['hand1'] ?? null;
$hand2 = $post_data['hand2'] ?? null;

// Check if hands are provided
if (!$hand1 || !$hand2) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Missing required parameters (hand1, hand2).']);
    exit;
}

function is_valid_hand_for_comparison($hand) {
    if (!is_array($hand) ||
        !isset($hand['top']) || !is_array($hand['top']) ||
        !isset($hand['middle']) || !is_array($hand['middle']) ||
        !isset($hand['bottom']) || !is_array($hand['bottom'])) {
        return false;
    }
    // Check for null cards, which cause crashes.
    foreach (array_merge($hand['top'], $hand['middle'], $hand['bottom']) as $card) {
        if ($card === null) {
            return false;
        }
    }
    return true;
}

// Validate hand structure before proceeding. If a hand is incomplete or contains nulls,
// we can't perform a foul check, so we'll treat it as 'not foul' for now.
if (!is_valid_hand_for_comparison($hand1) || !is_valid_hand_for_comparison($hand2)) {
    echo json_encode(['success' => true, 'result' => ['foul' => 'none', 'score' => 0, 'lane_results' => []]]);
    exit;
}


try {
    $is_foul1 = false;
    $is_foul2 = false;

    // A complete hand (13 cards) is needed for a valid foul check.
    if (count($hand1['top']) + count($hand1['middle']) + count($hand1['bottom']) === 13) {
        $is_foul1 = isSssFoulPhp($hand1);
    }
    if (count($hand2['top']) + count($hand2['middle']) + count($hand2['bottom']) === 13) {
        $is_foul2 = isSssFoulPhp($hand2);
    }

    if ($is_foul1 && $is_foul2) {
        $result = ['foul' => 'both', 'score' => 0];
    } elseif ($is_foul1) {
        $result = ['foul' => 'p1', 'score' => -1]; // Player 1 is foul, loses
    } elseif ($is_foul2) {
        $result = ['foul' => 'p2', 'score' => 1]; // Player 2 is foul, wins
    } else {
        // Only calculate score if both hands are complete and not foul.
        if (count($hand1['top']) + count($hand1['middle']) + count($hand1['bottom']) === 13 &&
            count($hand2['top']) + count($hand2['middle']) + count($hand2['bottom']) === 13) {
            $score_result = calculateSinglePairScorePhp($hand1, $hand2);
            $result = ['foul' => 'none', 'score' => $score_result['total_score'], 'lane_results' => $score_result['lane_results']];
        } else {
             // If hands are not complete, it's not a foul, and score is 0.
             $result = ['foul' => 'none', 'score' => 0, 'lane_results' => []];
        }
    }

    echo json_encode(['success' => true, 'result' => $result]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

?>
