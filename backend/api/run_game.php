<?php
// backend/api/run_game.php

header('Content-Type: application/json');

// This script is intended to be run from the command line or a cron job,
// but we include headers for potential direct API access for admin purposes.

// --- DEPENDENCIES & CONFIG ---
try {
    require_once 'config.php';
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database connection failed: ' . $e->getMessage()]);
    exit;
}

// --- CORE GAME LOGIC ---

/**
 * Draws 7 unique random numbers from 1 to 49.
 * @return array
 */
function drawWinningNumbers(): array {
    $numbers = range(1, 49);
    shuffle($numbers);
    return array_slice($numbers, 0, 7);
}

/**
 * Defines the payout structure based on the number of matches.
 * @param int $matchCount
 * @return int The multiplier for the bet amount.
 */
function getPayoutMultiplier(int $matchCount): int {
    switch ($matchCount) {
        case 4: return 10;
        case 5: return 100;
        case 6: return 1000;
        case 7: return 10000;
        default: return 0;
    }
}

// --- MAIN EXECUTION ---
$response = [
    'success' => false,
    'message' => '',
    'data' => [
        'winning_numbers' => [],
        'bets_processed' => 0,
        'total_winnings' => 0,
    ]
];

try {
    // 1. Fetch all open bets
    $stmt = $pdo->prepare("SELECT * FROM bets WHERE status = 'open'");
    $stmt->execute();
    $openBets = $stmt->fetchAll();

    if (empty($openBets)) {
        $response['success'] = true;
        $response['message'] = 'No open bets to process.';
        echo json_encode($response);
        exit;
    }

    // Begin a transaction
    $pdo->beginTransaction();

    // 2. Draw winning numbers
    $winningNumbers = drawWinningNumbers();
    $response['data']['winning_numbers'] = $winningNumbers;

    // 3. Create a new game round
    $stmt = $pdo->prepare("INSERT INTO game_rounds (winning_numbers) VALUES (?)");
    $stmt->execute([json_encode($winningNumbers)]);
    $gameRoundId = $pdo->lastInsertId();

    $totalWinnings = 0;

    // 4. Process each bet
    foreach ($openBets as $bet) {
        $betNumbers = json_decode($bet['bet_numbers'], true);
        $matches = count(array_intersect($betNumbers, $winningNumbers));
        $payoutMultiplier = getPayoutMultiplier($matches);
        $winnings = $bet['amount'] * $payoutMultiplier;

        // Update player's score if they won
        if ($winnings > 0) {
            $stmt = $pdo->prepare("UPDATE players SET score = score + ? WHERE id = ?");
            $stmt->execute([$winnings, $bet['player_id']]);
            $totalWinnings += $winnings;
        }

        // Update the bet to mark it as processed
        $stmt = $pdo->prepare(
            "UPDATE bets SET status = ?, game_round_id = ?, winnings = ? WHERE id = ?"
        );
        $stmt->execute(['processed', $gameRoundId, $winnings, $bet['id']]);
    }

    // Commit the transaction
    $pdo->commit();

    $response['success'] = true;
    $response['message'] = 'Game round completed successfully.';
    $response['data']['bets_processed'] = count($openBets);
    $response['data']['total_winnings'] = $totalWinnings;

} catch (Exception $e) {
    // An error occurred, rollback the transaction
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    $response['message'] = 'An error occurred during game execution: ' . $e->getMessage();
    error_log('Game Execution Error: ' . $e->getMessage());

}

echo json_encode($response);
?>
