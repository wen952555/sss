<?php
require_once __DIR__ . '/../db_connect.php';
require_once __DIR__ . '/../../utils/utils.php';

$data = json_decode(file_get_contents('php://input'), true);

$userId = $data['userId'] ?? null;
$roomId = $data['roomId'] ?? null;
$action = $data['action'] ?? null;
$hand = $data['hand'] ?? null;

if (!$userId || !$roomId || $action !== 'submit_hand' || !$hand) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Missing required parameters.']);
    exit;
}

$conn = db_connect();
if (!$conn) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database connection failed.']);
    exit;
}

$response = ['success' => false, 'message' => 'An error occurred.'];

$conn->begin_transaction();
try {
    // The hand from the frontend is already in the correct format of {top, middle, bottom} with card strings.
    // My submitPlayerHand expects card objects. I need to convert them.
    // Correction: my `isSssFoul` takes card strings. But `submitPlayerHand` expects objects.
    // The `submitPlayerHand` I wrote in `utils.php` takes card *strings*. Let's double check.
    // `isSssFoul` in `scorer.php` takes an array of strings.
    // `submitPlayerHand` takes a hand object. Let's see what `isSssFoul` expects.
    // `isSssFoul` expects `['top' => ['ace_of_spades'], ...]`. This is what the frontend sends.
    // So my `submitPlayerHand` function in `utils.php` is correct. It takes the hand object with string arrays.

    // Let's re-read the `submitPlayerHand` I wrote in `utils.php`.
    // It calls `isSssFoul($hand)`. `isSssFoul` takes a hand with card strings. This is correct.
    // Then it json_encodes the hand and saves it. This is correct.
    // The `calculateSinglePairScore` takes a hand object and decodes the `submitted_hand` which is a json string of the hand object.

    // The frontend sends card strings. My `submitPlayerHand` expects card strings. It seems correct.

    submitPlayerHand($conn, $userId, $roomId, $hand);
    $response = ['success' => true, 'message' => 'Hand submitted successfully.'];
    $conn->commit();
} catch (Exception $e) {
    $conn->rollback();
    http_response_code(400); // Use 400 for client errors like submitting a foul hand
    $response = ['success' => false, 'message' => $e->getMessage()];
}

$conn->close();

echo json_encode($response);
?>
