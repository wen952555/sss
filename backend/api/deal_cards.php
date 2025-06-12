<?php
header("Access-Control-Allow-Origin: https://mm.9525.ip-ddns.com");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

require_once '../includes/Deck.php';
require_once '../includes/Card.php'; // Deck uses Card

$response = ['success' => false, 'message' => '', 'hand' => null];

if ($_SERVER['REQUEST_METHOD'] == 'GET') {
    try {
        $deck = new Deck();
        $deck->shuffle();
        $playerHandCards = $deck->deal(13); // Array of Card objects

        $response['success'] = true;
        $response['hand'] = array_map(fn(Card $card) => $card->toArray(), $playerHandCards);
    } catch (Exception $e) {
        $response['message'] = 'Error dealing cards: ' . $e->getMessage();
    }
} else {
    $response['message'] = 'Invalid request method. Use GET.';
}

echo json_encode($response);
