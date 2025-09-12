<?php
/**
 * Backend API for the Thirteen Card Game
 */

// --- Pre-flight and Headers ---
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, GET");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// --- Dependencies & Session ---
session_start();
require_once 'game_helpers.php';

// --- Helper Functions ---
function send_error($code, $message) {
    http_response_code($code);
    echo json_encode(["success" => false, "message" => $message]);
    exit();
}

function get_next_player($current_player, $all_players) {
    $current_index = array_search($current_player, $all_players);
    $next_index = ($current_index + 1) % count($all_players);
    return $all_players[$next_index];
}

// --- Router ---
$action = isset($_GET['action']) ? $_GET['action'] : '';
$data = json_decode(file_get_contents("php://input"), true);
$game_id = $data['game_id'] ?? $_GET['game_id'] ?? null;

if ($action !== 'createGame' && (!$game_id || session_id() !== $game_id || !isset($_SESSION['game_state']))) {
    send_error(404, "Game not found or session expired. Please create a new game.");
}
$game_state = $_SESSION['game_state'] ?? null;


switch ($action) {
    case 'createGame':
        // (Code from previous step - unchanged)
        $ranks = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];
        $suits = ['spades', 'clubs', 'diamonds', 'hearts'];
        $rank_values = array_flip($ranks);
        $suit_values = array_flip($suits);
        $deck = [];
        foreach ($suits as $suit) {
            foreach ($ranks as $rank) {
                $deck[] = ['rank' => $rank, 'suit' => $suit, 'value' => $rank_values[$rank], 'suit_value' => $suit_values[$suit], 'name' => "{$rank}_of_{$suit}"];
            }
        }
        shuffle($deck);
        $players = ['player1', 'player2', 'player3', 'player4'];
        $hands = array_fill_keys($players, []);
        for ($i = 0; $i < 52; $i++) { $hands[$players[$i % 4]][] = $deck[$i]; }
        $starting_player = '';
        foreach($hands as $player_id => $hand) {
            foreach($hand as $card) {
                if ($card['rank'] === '3' && $card['suit'] === 'spades') { $starting_player = $player_id; break 2; }
            }
        }
        $game_state = [
            'game_id' => session_id(), 'player_ids' => $players, 'hands' => $hands,
            'current_turn' => $starting_player, 'last_play' => null, 'trick_pile' => [],
            'game_status' => 'in_progress', 'passed_players' => [], 'turn_winner' => null,
            'is_first_turn' => true
        ];
        $_SESSION['game_state'] = $game_state;
        http_response_code(201);
        echo json_encode(["success" => true, "game_id" => $game_state['game_id'], "message" => "New game created. Player {$starting_player} starts."]);
        break;

    case 'getGameState':
        // (Code from previous step - largely unchanged)
        $player_id = $_GET['player_id'] ?? null;
        if (!$player_id || !isset($game_state['hands'][$player_id])) { send_error(400, "Player not found in this game."); }
        $player_view = [
            'game_id' => $game_state['game_id'], 'players' => [], 'my_hand' => $game_state['hands'][$player_id],
            'current_turn' => $game_state['current_turn'], 'last_play' => $game_state['last_play'],
            'trick_pile' => $game_state['trick_pile'], 'game_status' => $game_state['game_status'],
            'player_id' => $player_id,
        ];
        foreach ($game_state['player_ids'] as $p_id) { $player_view['players'][$p_id] = ['card_count' => count($game_state['hands'][$p_id])]; }
        usort($player_view['my_hand'], function($a, $b) {
            if ($a['value'] === $b['value']) { return $a['suit_value'] <=> $b['suit_value']; }
            return $a['value'] <=> $b['value'];
        });
        echo json_encode(["success" => true, "game_state" => $player_view]);
        break;

    case 'playHand':
        $player_id = $data['player_id'] ?? null;
        $played_cards = $data['cards'] ?? null;

        // Validation
        if ($game_state['game_status'] !== 'in_progress') { send_error(400, "The game is not in progress."); }
        if ($game_state['current_turn'] !== $player_id) { send_error(400, "It's not your turn."); }
        if (in_array($player_id, $game_state['passed_players'])) { send_error(400, "You have already passed for this trick."); }
        if (empty($played_cards)) { send_error(400, "You must select at least one card to play."); }

        // Check if player has the cards
        $player_hand_names = array_map(fn($c) => $c['name'], $game_state['hands'][$player_id]);
        $played_card_names = array_map(fn($c) => $c['name'], $played_cards);
        if (count(array_intersect($player_hand_names, $played_card_names)) !== count($played_cards)) {
            send_error(400, "Invalid move: You do not own the selected cards.");
        }

        // Analyze played hand
        $played_combo = analyzeCombination($played_cards);
        if ($played_combo['type'] === 'invalid') { send_error(400, "Invalid combination: " . $played_combo['reason']); }

        // First turn of the whole game must include 3 of spades
        if ($game_state['is_first_turn']) {
            $has_3_of_spades = false;
            foreach($played_cards as $c) { if ($c['name'] === '3_of_spades') $has_3_of_spades = true; }
            if (!$has_3_of_spades) { send_error(400, "The first play of the game must include the 3 of Spades."); }
        }

        // Validate against last play
        $last_play = $game_state['last_play'];
        if ($last_play) {
            $last_combo = analyzeCombination($last_play['cards']);

            // Bomb logic
            $is_bomb = in_array($played_combo['type'], ['four_of_a_kind', 'double_straight']);
            $can_bomb_2 = ($last_combo['type'] === 'single' && $last_combo['high_card']['rank'] === '2');

            if ($is_bomb && $can_bomb_2) {
                // Valid bomb on a 2, proceed
            } else if ($is_bomb && $last_combo['type'] === 'four_of_a_kind' && $played_combo['rank'] > $last_combo['rank']) {
                // Higher bomb beats lower bomb
            } else if ($played_combo['type'] !== $last_combo['type'] || count($played_cards) !== count($last_play['cards'])) {
                send_error(400, "Invalid play: You must play the same type of combination (" . $last_combo['type'] . ").");
            } else if ($played_combo['rank'] < $last_combo['rank'] || ($played_combo['rank'] === $last_combo['rank'] && $played_combo['high_card']['suit_value'] < $last_combo['high_card']['suit_value'])) {
                send_error(400, "Invalid play: Your combination must be of a higher rank.");
            }
        }

        // --- Update Game State ---
        // Remove cards from player's hand
        $new_hand = array_udiff($game_state['hands'][$player_id], $played_cards, fn($a, $b) => $a['name'] <=> $b['name']);
        $game_state['hands'][$player_id] = array_values($new_hand);

        $game_state['last_play'] = ['player_id' => $player_id, 'cards' => $played_cards];
        $game_state['trick_pile'] = array_merge($game_state['trick_pile'], $played_cards);
        $game_state['passed_players'] = []; // Reset passed players for the new trick part
        $game_state['is_first_turn'] = false;
        $game_state['turn_winner'] = $player_id; // This player is the current trick winner
        $game_state['current_turn'] = get_next_player($player_id, $game_state['player_ids']);

        // Check for winner
        if (empty($game_state['hands'][$player_id])) {
            $game_state['game_status'] = 'finished';
            // More logic for scoring etc. can be added here
        }

        $_SESSION['game_state'] = $game_state;
        echo json_encode(["success" => true, "message" => "Hand played successfully."]);
        break;

    case 'passTurn':
        $player_id = $data['player_id'] ?? null;

        if ($game_state['game_status'] !== 'in_progress') { send_error(400, "The game is not in progress."); }
        if ($game_state['current_turn'] !== $player_id) { send_error(400, "It's not your turn."); }
        if (!$game_state['last_play']) { send_error(400, "You cannot pass when you are leading the trick."); }

        $game_state['passed_players'][] = $player_id;

        // Find next active player
        $next_player = get_next_player($player_id, $game_state['player_ids']);
        while(in_array($next_player, $game_state['passed_players'])) {
            if ($next_player === $game_state['turn_winner']) {
                // All other players passed, trick is over
                $game_state['current_turn'] = $game_state['turn_winner'];
                $game_state['last_play'] = null; // Clear the table
                $game_state['trick_pile'] = [];
                $game_state['passed_players'] = [];
                $_SESSION['game_state'] = $game_state;
                echo json_encode(["success" => true, "message" => "You passed. New trick started."]);
                exit();
            }
            $next_player = get_next_player($next_player, $game_state['player_ids']);
        }
        $game_state['current_turn'] = $next_player;

        $_SESSION['game_state'] = $game_state;
        echo json_encode(["success" => true, "message" => "You passed."]);
        break;

    case 'getAiMove':
        $player_id = $_GET['player_id'] ?? null;

        if (!$player_id || !isset($game_state['hands'][$player_id])) {
            send_error(400, "AI Player not found in this game.");
        }
        if ($game_state['game_status'] !== 'in_progress') {
            send_error(400, "The game is not in progress.");
        }
        if ($game_state['current_turn'] !== $player_id) {
            send_error(400, "It's not the AI's turn.");
        }

        $ai_hand = $game_state['hands'][$player_id];
        $last_play = $game_state['last_play'];

        // Call the helper to determine the AI's move
        $move = findBestAiMove($ai_hand, $last_play);

        echo json_encode([
            "success" => true,
            "move" => $move
        ]);
        break;

    default:
        send_error(400, "Invalid action specified.");
        break;
}
?>
