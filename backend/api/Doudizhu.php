<?php
// backend/api/Doudizhu.php

require_once 'Game.php';
require_once 'doudizhu_helpers.php';

class Doudizhu extends Game {

    public function __construct($pdo) {
        parent::__construct($pdo);
        $this->load_game_state();
    }

    public function execute() {
        switch ($this->action) {
            case 'createGame':
                $this->createGame();
                break;
            case 'getGameState':
                $this->getGameState();
                break;
            case 'makeBid':
                $this->makeBid();
                break;
            case 'playHand':
                $this->playHand();
                break;
            case 'passTurn':
                $this->passTurn();
                break;
            case 'getAiBid':
                $this->getAiBid();
                break;
            case 'getAiPlay':
                $this->getAiPlay();
                break;
            default:
                $this->send_error("Invalid action specified for Dou Di Zhu.");
                break;
        }
        $this->save_game_state();
    }

    protected function createGame() {
        $this->game_id = uniqid('ddz_');

        $deck = createDoudizhuDeck();
        shuffle($deck);
        $players = ['player1', 'player2', 'player3'];
        $hands = array_fill_keys($players, []);
        for ($i = 0; $i < 51; $i++) {
            $hands[$players[$i % 3]][] = $deck[$i];
        }
        $kitty = array_slice($deck, 51);
        $starting_bidder = $players[array_rand($players)];

        $this->game_state = [
            'game_id' => $this->game_id, 'game_type' => 'doudizhu', 'players' => $players,
            'hands' => $hands, 'kitty' => $kitty, 'landlord' => null,
            'bidding' => [
                'turn' => $starting_bidder, 'highest_bid' => 0, 'highest_bidder' => null,
                'passes' => 0, 'history' => [],
            ],
            'game_phase' => 'bidding', 'current_turn' => null, 'last_play' => null, 'passed_players' => [],
        ];

        $this->save_game_state();

        $this->send_response([
            "game_id" => $this->game_id,
            "message" => "New Dou Di Zhu game created. Bidding starts with {$starting_bidder}."
        ], 201);
    }

    protected function getGameState() {
        $show_all = $_GET['show_all'] ?? false;
        $response_state = $this->game_state;

        if (!$show_all && $this->player_id) {
            $original_hands = $response_state['hands'];
            if (isset($original_hands[$this->player_id])) {
                $player_hand = $original_hands[$this->player_id];
                $response_state['hands'] = []; // Clear hands
                foreach ($response_state['players'] as $p_id) {
                    if ($p_id === $this->player_id) {
                        $response_state['hands'][$p_id] = $player_hand;
                    } else {
                        $response_state['hands'][$p_id] = count($original_hands[$p_id]);
                    }
                }
            }
        }
        $this->send_response(["game_state" => $response_state]);
    }

    protected function makeBid() {
        $bid = $this->request_data['bid'] ?? 0;

        if ($this->game_state['game_phase'] !== 'bidding') { $this->send_error("Not in bidding phase."); }
        if ($this->game_state['bidding']['turn'] !== $this->player_id) { $this->send_error("Not your turn to bid."); }
        if ($bid > 0 && $bid <= $this->game_state['bidding']['highest_bid']) { $this->send_error("Bid must be higher than the current highest bid."); }
        if ($bid < 0 || $bid > 3) { $this->send_error("Invalid bid amount."); }

        $this->game_state['bidding']['history'][] = ['player' => $this->player_id, 'bid' => $bid];

        if ($bid > 0) {
            $this->game_state['bidding']['highest_bid'] = $bid;
            $this->game_state['bidding']['highest_bidder'] = $this->player_id;
            $this->game_state['bidding']['passes'] = 0;
        } else {
            $this->game_state['bidding']['passes']++;
        }

        $this->game_state['bidding']['turn'] = $this->get_next_player($this->player_id);

        $landlord = null;
        if ($this->game_state['bidding']['highest_bid'] == 3) {
            $landlord = $this->game_state['bidding']['highest_bidder'];
        } else if ($this->game_state['bidding']['passes'] >= 2 && $this->game_state['bidding']['highest_bidder'] !== null) {
            $landlord = $this->game_state['bidding']['highest_bidder'];
        }

        if ($landlord) {
            $this->game_state['landlord'] = $landlord;
            $this->game_state['hands'][$landlord] = array_merge($this->game_state['hands'][$landlord], $this->game_state['kitty']);
            usort($this->game_state['hands'][$landlord], fn($a, $b) => $b['value'] <=> $a['value']);
            $this->game_state['game_phase'] = 'playing';
            $this->game_state['current_turn'] = $landlord;
        }

        $this->send_response(["message" => "Bid of {$bid} made by {$this->player_id}."]);
    }

    protected function playHand() {
        if ($this->game_state['game_phase'] !== 'playing') { $this->send_error("Not in playing phase."); }
        if ($this->game_state['current_turn'] !== $this->player_id) { $this->send_error("It's not your turn."); }

        $played_cards = $this->request_data['cards'] ?? [];
        if (empty($played_cards)) { $this->send_error("You must select cards to play."); }

        $player_hand_names = array_map(fn($c) => $c['name'], $this->game_state['hands'][$this->player_id]);
        $played_card_names = array_map(fn($c) => $c['name'], $played_cards);
        if (count(array_intersect($player_hand_names, $played_card_names)) !== count($played_cards)) {
            $this->send_error("Invalid move: You do not own the selected cards.");
        }

        $played_combo = analyzeDoudizhuCombination($played_cards);
        if ($played_combo['type'] === 'invalid') {
            $this->send_error("Invalid card combination.");
        }

        $last_play = $this->game_state['last_play'];
        if ($last_play) {
            $last_combo = analyzeDoudizhuCombination($last_play['cards']);
            if (!isValidDoudizhuMove($played_combo, $last_combo)) {
                $this->send_error("Your play is not valid against the last hand.");
            }
        }

        $new_hand = array_udiff($this->game_state['hands'][$this->player_id], $played_cards, fn($a, $b) => $a['name'] <=> $b['name']);
        $this->game_state['hands'][$this->player_id] = array_values($new_hand);
        $this->game_state['last_play'] = ['player_id' => $this->player_id, 'cards' => $played_cards];
        $this->game_state['passed_players'] = []; // Any play resets the pass counter
        $this->game_state['current_turn'] = $this->get_next_player($this->player_id);

        if (empty($this->game_state['hands'][$this->player_id])) {
            $this->game_state['game_phase'] = 'finished';
        }

        $this->send_response(["message" => "Hand played successfully."]);
    }

    protected function passTurn() {
        if ($this->game_state['game_phase'] !== 'playing') { $this->send_error("Not in playing phase."); }
        if ($this->game_state['current_turn'] !== $this->player_id) { $this->send_error("It's not your turn."); }
        if (!$this->game_state['last_play']) { $this->send_error("You cannot pass when you are leading the trick."); }

        $this->game_state['passed_players'][] = $this->player_id;

        $next_player = $this->get_next_player($this->player_id);

        if (count($this->game_state['passed_players']) >= 2) {
            // The player who made the last play starts a new trick.
            $this->game_state['current_turn'] = $this->game_state['last_play']['player_id'];
            $this->game_state['last_play'] = null;
            $this->game_state['passed_players'] = [];
        } else {
            $this->game_state['current_turn'] = $next_player;
        }

        $this->send_response(["message" => "You passed."]);
    }

    private function get_next_player($current_player) {
        $players = $this->game_state['players'];
        $current_index = array_search($current_player, $players);
        $next_index = ($current_index + 1) % count($players);
        return $players[$next_index];
    }

    protected function getAiBid() {
        if ($this->game_state['game_phase'] !== 'bidding') { $this->send_error("Not in bidding phase."); }
        if ($this->game_state['bidding']['turn'] !== $this->player_id) { $this->send_error("Not AI's turn to bid."); }

        $hand = $this->game_state['hands'][$this->player_id];
        $bid = getDoudizhuAiBid($hand);

        if ($bid > 0 && $bid <= $this->game_state['bidding']['highest_bid']) {
            $bid = 0;
        }

        $this->send_response(['bid' => $bid]);
    }

    protected function getAiPlay() {
        if ($this->game_state['game_phase'] !== 'playing') { $this->send_error("Not in playing phase."); }
        if ($this->game_state['current_turn'] !== $this->player_id) { $this->send_error("Not AI's turn to play."); }

        $hand = $this->game_state['hands'][$this->player_id];
        $last_play_cards = $this->game_state['last_play']['cards'] ?? [];
        $move = findBestDoudizhuMove($hand, $last_play_cards);

        $this->send_response(['move' => $move]);
    }
}
