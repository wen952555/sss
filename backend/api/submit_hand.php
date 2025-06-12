<?php
// header("Access-Control-Allow-Origin: https://mm.9525.ip-ddns.com");
// header("Access-Control-Allow-Methods: POST, OPTIONS");
// header("Access-Control-Allow-Headers: Content-Type");
// header("Content-Type: application/json");

// if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
//     exit(0);
// }

// require_once '../includes/Card.php';
// require_once '../includes/HandEvaluator.php';

// $response = ['success' => false, 'message' => '', 'isValid' => false, 'score' => null];

// if ($_SERVER['REQUEST_METHOD'] == 'POST') {
//     $input = json_decode(file_get_contents('php://input'), true);
//     // Expected input: { initialHand: ["AS", "KC", ...], top: ["AH", "AD", "AC"], middle: [...], bottom: [...] }

//     $initialHandIds = $input['initialHand'] ?? null;
//     $topHandIds = $input['top'] ?? null;
//     $middleHandIds = $input['middle'] ?? null;
//     $bottomHandIds = $input['bottom'] ?? null;

//     // 1. Validate input structure and card counts (3, 5, 5)
//     // 2. Validate all cards in top, middle, bottom are present in initialHand and unique.
//     // 3. Evaluate each hand using HandEvaluator
//     // 4. Check for "倒水" (misarrangement): top <= middle <= bottom
//     // 5. If valid, calculate score/points.

//     // This is complex and depends on your game rules for scoring.
//     // For now, just a placeholder.

//     $response['message'] = "Submit hand API is under development.";

// } else {
//     $response['message'] = 'Invalid request method. Use POST.';
// }
// echo json_encode($response);
