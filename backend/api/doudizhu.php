<?php
// backend/api/doudizhu.php

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, GET");

require_once 'doudizhu_helpers.php';
session_start();

$action = $_GET['action'] ?? '';

function send_error($code, $message) {
    http_response_code($code);
    echo json_encode(["success" => false, "message" => $message]);
    exit();
}

switch ($action) {
    case 'createGame':
        $deck = createDoudizhuDeck();
        shuffle($deck);

        $players = ['player1', 'player2', 'player3']; // Hardcoded for now
        $hands = array_fill_keys($players, []);

        // Deal 17 cards to each player
        for ($i = 0; $i < 51; $i++) {
            $hands[$players[$i % 3]][] = $deck[$i];
        }

        // The last 3 cards are the kitty
        $kitty = array_slice($deck, 51);

        // Determine random starting bidder
        $starting_bidder = $players[array_rand($players)];

        $game_state = [
            'game_id' => session_id(),
            'game_type' => 'doudizhu',
            'players' => $players,
            'hands' => $hands,
            'kitty' => $kitty,
            'landlord' => null,
            'bidding' => [
                'turn' => $starting_bidder,
                'highest_bid' => 0,
                'highest_bidder' => null,
                'passes' => 0,
                'history' => [],
            ],
            'game_phase' => 'bidding', // 'bidding' or 'playing'
            'current_turn' => null, // Play turn starts after bidding
            'last_play' => null,
        ];

        $_SESSION['doudizhu_game'] = $game_state;

        http_response_code(201);
        echo json_encode([
            "success" => true,
            "game_id" => $game_state['game_id'],
            "message" => "New Dou Di Zhu game created. Bidding starts with {$starting_bidder}."
        ]);
        break;

    case 'getGameState':
        if (!isset($_SESSION['doudizhu_game'])) {
            send_error(404, "No Dou Di Zhu game in session.");
        }
        $game_state = $_SESSION['doudizhu_game'];
        $player_id = $_GET['player_id'] ?? 'player1';
        $show_all = $_GET['show_all'] ?? false;

        $original_hands = $game_state['hands'];

        // Unless show_all is requested for debugging, hide other players' hands.
        if (!$show_all) {
            $player_hand = $original_hands[$player_id];
            $game_state['hands'] = []; // Clear hands
            foreach ($game_state['players'] as $p_id) {
                if ($p_id === $player_id) {
                    $game_state['hands'][$p_id] = $player_hand;
                } else {
                    $game_state['hands'][$p_id] = count($original_hands[$p_id]); // Show card count
                }
            }
        }

        echo json_encode(["success" => true, "game_state" => $game_state]);
        break;

    case 'makeBid':
        $data = json_decode(file_get_contents("php://input"), true);
        $player_id = $data['player_id'] ?? null;
        $bid = $data['bid'] ?? 0; // 0 for pass

        if (!isset($_SESSION['doudizhu_game'])) { send_error(404, "No game in session."); }
        $game_state = $_SESSION['doudizhu_game'];

        if ($game_state['game_phase'] !== 'bidding') { send_error(400, "Not in bidding phase."); }
        if ($game_state['bidding']['turn'] !== $player_id) { send_error(400, "Not your turn to bid."); }
        if ($bid > 0 && $bid <= $game_state['bidding']['highest_bid']) { send_error(400, "Bid must be higher than the current highest bid."); }
        if ($bid < 0 || $bid > 3) { send_error(400, "Invalid bid amount."); }

        $game_state['bidding']['history'][] = ['player' => $player_id, 'bid' => $bid];

        if ($bid > 0) {
            $game_state['bidding']['highest_bid'] = $bid;
            $game_state['bidding']['highest_bidder'] = $player_id;
            $game_state['bidding']['passes'] = 0;
        } else {
            $game_state['bidding']['passes']++;
        }

        $next_player_index = (array_search($player_id, $game_state['players']) + 1) % 3;
        $next_player = $game_state['players'][$next_player_index];
        $game_state['bidding']['turn'] = $next_player;

        // Check for end of bidding
        $landlord = null;
        if ($game_state['bidding']['highest_bid'] == 3) {
            $landlord = $game_state['bidding']['highest_bidder'];
        } else if ($game_state['bidding']['passes'] == 2 && $game_state['bidding']['highest_bidder'] !== null) {
            $landlord = $game_state['bidding']['highest_bidder'];
        }

        if ($landlord) {
            $game_state['landlord'] = $landlord;
            $game_state['hands'][$landlord] = array_merge($game_state['hands'][$landlord], $game_state['kitty']);
            usort($game_state['hands'][$landlord], fn($a, $b) => $b['value'] <=> $a['value']);
            $game_state['game_phase'] = 'playing';
            $game_state['current_turn'] = $landlord;
        }

        $_SESSION['doudizhu_game'] = $game_state;
        echo json_encode(["success" => true, "message" => "Bid of {$bid} made by {$player_id}."]);
        break;

    case 'getAiBid':
        if (!isset($_SESSION['doudizhu_game'])) { send_error(404, "No game in session."); }
        $game_state = $_SESSION['doudizhu_game'];
        $player_id = $_GET['player_id'] ?? null;

        if (!$player_id || !in_array($player_id, $game_state['players'])) { send_error(400, "Invalid player ID."); }
        if ($game_state['game_phase'] !== 'bidding') { send_error(400, "Not in bidding phase."); }
        if ($game_state['bidding']['turn'] !== $player_id) { send_error(400, "Not AI's turn to bid."); }

        $hand = $game_state['hands'][$player_id];
        $bid = getDoudizhuAiBid($hand);

        // Ensure AI doesn't make an illegal low bid
        if ($bid > 0 && $bid <= $game_state['bidding']['highest_bid']) {
            $bid = 0; // Pass instead
        }

        echo json_encode(['success' => true, 'bid' => $bid]);
        break;

    case 'getAiPlay':
        if (!isset($_SESSION['doudizhu_game'])) { send_error(404, "No game in session."); }
        $game_state = $_SESSION['doudizhu_game'];
        $player_id = $_GET['player_id'] ?? null;

        if (!$player_id || !in_array($player_id, $game_state['players'])) { send_error(400, "Invalid player ID."); }
        if ($game_state['game_phase'] !== 'playing') { send_error(400, "Not in playing phase."); }
        if ($game_state['current_turn'] !== $player_id) { send_error(400, "Not AI's turn to play."); }

        $hand = $game_state['hands'][$player_id];
        $last_play_cards = $game_state['last_play']['cards'] ?? [];

        $move = findBestDoudizhuMove($hand, $last_play_cards);

        echo json_encode(['success' => true, 'move' => $move]);
        break;

    default:
        send_error(400, "Invalid action specified for Dou Di Zhu game.");
        break;
}
?>
