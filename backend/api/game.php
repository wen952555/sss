<?php
header("Content-Type: application/json");
// IMPORTANT: Add CORS headers for local development and Cloudflare Pages
header("Access-Control-Allow-Origin: *"); // Be more specific in production, e.g., your Cloudflare Pages domain
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../core/ThirteenWaters.php';

session_start(); // Use sessions to store game state per user/game

$action = $_GET['action'] ?? null;
$response = ['status' => 'error', 'message' => 'Invalid action'];

if (!isset($_SESSION['game'])) {
    $_SESSION['game'] = new ThirteenWaters();
}
/** @var ThirteenWaters $game */
$game = $_SESSION['game'];

switch ($action) {
    case 'new_game':
        $numPlayers = isset($_GET['players']) ? (int)$_GET['players'] : 2;
        if ($numPlayers < 2 || $numPlayers > 4) $numPlayers = 2;
        $game->dealCards($numPlayers);
        $_SESSION['game'] = $game; // Save updated game state
        $response = ['status' => 'success', 'message' => 'New game started.', 'gameState' => $game->getGameState()];
        break;

    case 'get_state':
        $response = ['status' => 'success', 'gameState' => $game->getGameState()];
        break;

    // TODO: Add actions for submitting hands, etc.
    // case 'play_hand':
    //     $playerId = $_POST['playerId'] ?? null;
    //     $front = $_POST['front'] ?? null; // Array of card strings
    //     $middle = $_POST['middle'] ?? null; // Array of card strings
    //     $back = $_POST['back'] ?? null; // Array of card strings
    //     // ... validation and game logic ...
    //     $response = ['status' => 'success', 'message' => 'Hand played.'];
    //     break;

    default:
        $response = ['status' => 'error', 'message' => 'Unknown action.'];
        break;
}

echo json_encode($response);
?>
