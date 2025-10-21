<?php
require_once __DIR__ . '/../../../vendor/autoload.php';
require_once __DIR__ . '/../../utils/auto_sorter.php';

header('Content-Type: application/json');

$post_data = json_decode(file_get_contents("php://input"), true);

if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid JSON input.']);
    exit;
}

$hand = $post_data['hand'] ?? null;

if (!$hand || !is_array($hand) || count($hand) !== 13) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Missing or invalid hand parameter.']);
    exit;
}

try {
    $sorted_hand = auto_sort_hand($hand);
    echo json_encode(['success' => true, 'hand' => $sorted_hand]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'An error occurred while sorting the hand.']);
}
?>
