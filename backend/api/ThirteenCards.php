<?php
// backend/api/ThirteenCards.php

require_once 'Game.php';
require_once 'game_helpers.php'; // Contains analyzeCombination and findBestAiMove

class ThirteenCards extends Game {

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
            case 'playHand':
                $this->playHand();
                break;
            case 'passTurn':
                $this->passTurn();
                break;
            case 'getAiMove':
                $this->getAiMove();
                break;
            default:
                $this->send_error("Invalid action specified for Thirteen Cards.");
                break;
        }
        // Save state after every action
        $this->save_game_state();
    }

    protected function createGame() {
        $this->game_id = uniqid('tc_'); // Generate a unique ID for the game

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
        $this->game_state = [
            'game_id' => $this->game_id, 'player_ids' => $players, 'hands' => $hands,
            'current_turn' => $starting_player, 'last_play' => null, 'trick_pile' => [],
            'game_status' => 'in_progress', 'passed_players' => [], 'turn_winner' => null,
            'is_first_turn' => true
        ];

        // Important: Save the new game state to the session immediately
        $this->save_game_state();

        $this->send_response(["game_id" => $this->game_id, "message" => "New game created. Player {$starting_player} starts."], 201);
    }

    protected function getGameState() {
        if (!$this->player_id || !isset($this->game_state['hands'][$this->player_id])) {
            $this->send_error("Player not found in this game.");
        }

        // The game state already contains the game_id
        $player_view = [
            'game_id' => $this->game_state['game_id'],
            'players' => [],
            'my_hand' => $this->game_state['hands'][$this->player_id],
            'current_turn' => $this->game_state['current_turn'],
            'last_play' => $this->game_state['last_play'],
            'trick_pile' => $this->game_state['trick_pile'],
            'game_status' => $this->game_state['game_status'],
            'player_id' => $this->player_id,
        ];
        foreach ($this->game_state['player_ids'] as $p_id) {
            $player_view['players'][$p_id] = ['card_count' => count($this->game_state['hands'][$p_id])];
        }
        usort($player_view['my_hand'], function($a, $b) {
            if ($a['value'] === $b['value']) { return $a['suit_value'] <=> $b['suit_value']; }
            return $a['value'] <=> $b['value'];
        });

        $this->send_response(["game_state" => $player_view]);
    }

    protected function playHand() {
        $played_cards = $this->request_data['cards'] ?? null;

        if ($this->game_state['game_status'] !== 'in_progress') { $this->send_error("The game is not in progress."); }
        if ($this->game_state['current_turn'] !== $this->player_id) { $this->send_error("It's not your turn."); }
        if (in_array($this->player_id, $this->game_state['passed_players'])) { $this->send_error("You have already passed for this trick."); }
        if (empty($played_cards)) { $this->send_error("You must select at least one card to play."); }

        $player_hand_names = array_map(fn($c) => $c['name'], $this->game_state['hands'][$this->player_id]);
        $played_card_names = array_map(fn($c) => $c['name'], $played_cards);
        if (count(array_intersect($player_hand_names, $played_card_names)) !== count($played_cards)) {
            $this->send_error("Invalid move: You do not own the selected cards.");
        }

        $played_combo = analyzeCombination($played_cards);
        if ($played_combo['type'] === 'invalid') { $this->send_error("Invalid combination: " . $played_combo['reason']); }

        if ($this->game_state['is_first_turn']) {
            $has_3_of_spades = false;
            foreach($played_cards as $c) { if ($c['name'] === '3_of_spades') $has_3_of_spades = true; }
            if (!$has_3_of_spades) { $this->send_error("The first play of the game must include the 3 of Spades."); }
        }

        $last_play = $this->game_state['last_play'];
        if ($last_play) {
            $last_combo = analyzeCombination($last_play['cards']);
            $is_bomb = in_array($played_combo['type'], ['four_of_a_kind', 'double_straight']);
            $can_bomb_2 = ($last_combo['type'] === 'single' && $last_combo['high_card']['rank'] === '2');

            if (!($is_bomb && $can_bomb_2) && !($is_bomb && $last_combo['type'] === 'four_of_a_kind' && $played_combo['rank'] > $last_combo['rank'])) {
                 if ($played_combo['type'] !== $last_combo['type'] || count($played_cards) !== count($last_play['cards'])) {
                    $this->send_error("Invalid play: You must play the same type of combination (" . $last_combo['type'] . ").");
                } else if ($played_combo['rank'] < $last_combo['rank'] || ($played_combo['rank'] === $last_combo['rank'] && $played_combo['high_card']['suit_value'] < $last_combo['high_card']['suit_value'])) {
                    $this->send_error("Invalid play: Your combination must be of a higher rank.");
                }
            }
        }

        $new_hand = array_udiff($this->game_state['hands'][$this->player_id], $played_cards, fn($a, $b) => $a['name'] <=> $b['name']);
        $this->game_state['hands'][$this->player_id] = array_values($new_hand);
        $this->game_state['last_play'] = ['player_id' => $this->player_id, 'cards' => $played_cards];
        $this->game_state['trick_pile'] = array_merge($this->game_state['trick_pile'], $played_cards);
        $this->game_state['passed_players'] = [];
        $this->game_state['is_first_turn'] = false;
        $this->game_state['turn_winner'] = $this->player_id;
        $this->game_state['current_turn'] = $this->get_next_player($this->player_id);

        if (empty($this->game_state['hands'][$this->player_id])) {
            $this->game_state['game_status'] = 'finished';
        }

        $this->send_response(["message" => "Hand played successfully."]);
    }

    protected function passTurn() {
        if ($this->game_state['game_status'] !== 'in_progress') { $this->send_error("The game is not in progress."); }
        if ($this->game_state['current_turn'] !== $this->player_id) { $this->send_error("It's not your turn."); }
        if (!$this->game_state['last_play']) { $this->send_error("You cannot pass when you are leading the trick."); }

        $this->game_state['passed_players'][] = $this->player_id;

        $message = "You passed.";
        $next_player = $this->get_next_player($this->player_id);
        while(in_array($next_player, $this->game_state['passed_players'])) {
            if ($next_player === $this->game_state['turn_winner']) {
                $this->game_state['current_turn'] = $this->game_state['turn_winner'];
                $this->game_state['last_play'] = null;
                $this->game_state['trick_pile'] = [];
                $this->game_state['passed_players'] = [];
                $message = "You passed. New trick started.";
                $this->send_response(["message" => $message]);
                return;
            }
            $next_player = $this->get_next_player($next_player);
        }
        $this->game_state['current_turn'] = $next_player;

        $this->send_response(["message" => $message]);
    }

    protected function getAiMove() {
        if (!$this->player_id || !isset($this->game_state['hands'][$this->player_id])) { $this->send_error("AI Player not found in this game."); }
        if ($this->game_state['game_status'] !== 'in_progress') { $this->send_error("The game is not in progress."); }
        if ($this->game_state['current_turn'] !== $this->player_id) { $this->send_error("It's not the AI's turn."); }

        $ai_hand = $this->game_state['hands'][$this->player_id];
        $last_play = $this->game_state['last_play'];
        $move = findBestAiMove($ai_hand, $last_play);

        $this->send_response(["move" => $move]);
    }

    private function get_next_player($current_player) {
        $all_players = $this->game_state['player_ids'];
        $current_index = array_search($current_player, $all_players);
        $next_index = ($current_index + 1) % count($all_players);
        return $all_players[$next_index];
    }
}
