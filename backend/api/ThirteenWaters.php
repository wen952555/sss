<?php
// backend/api/ThirteenWaters.php

require_once 'Game.php';
require_once 'thirteen_waters_helpers.php';

class ThirteenWaters extends Game {
    public function __construct($pdo) {
        parent::__construct($pdo);
        $this->load_game_state();
    }

    public function execute() {
        switch ($this->action) {
            case 'createGame': $this->createGame(); break;
            case 'setHand': $this->setHand(); break;
            case 'getGameState': $this->getGameState(); break;
            default: $this->send_error("Invalid action for Thirteen Waters."); break;
        }
        $this->save_game_state();
    }

    protected function createGame() {
        $this->game_id = uniqid('tw_');
        $deck = $this->create_deck();
        shuffle($deck);

        $players = ['player1', 'player2', 'player3', 'player4'];
        $hands = [];
        foreach ($players as $p) {
            $hands[$p] = array_splice($deck, 0, 13);
        }

        $this->game_state = [
            'game_id' => $this->game_id,
            'players' => $players,
            'hands' => $hands,
            'set_hands' => [],
            'results' => null,
            'game_phase' => 'setting', // 'setting', 'finished'
        ];

        $this->save_game_state();
        $this->send_response(['game_id' => $this->game_id, 'message' => 'New game created.']);
    }

    protected function setHand() {
        $front = $this->request_data['front'] ?? [];
        $middle = $this->request_data['middle'] ?? [];
        $back = $this->request_data['back'] ?? [];

        if (count($front) !== 3 || count($middle) !== 5 || count($back) !== 5) {
            $this->send_error("Invalid hand arrangement. Must be 3-5-5.");
        }

        // TODO: Add more validation (e.g., check for unique cards, check hand strength rules)

        $this->game_state['set_hands'][$this->player_id] = [
            'front' => $front,
            'middle' => $middle,
            'back' => $back,
        ];

        if (count($this->game_state['set_hands']) === count($this->game_state['players'])) {
            $this->compareAllHands();
            $this->game_state['game_phase'] = 'finished';
        }

        $this->send_response(['message' => 'Hand set successfully.']);
    }

    private function compareAllHands() {
        // This is a placeholder for the full comparison logic
        $this->game_state['results'] = "All hands are set. Comparison logic to be implemented.";
    }

    private function create_deck() {
        $ranks = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
        $suits = ['s', 'c', 'd', 'h'];
        $deck = [];
        foreach ($suits as $s_idx => $suit) {
            foreach ($ranks as $r_idx => $rank) {
                $deck[] = ['rank' => $rank, 'suit' => $suit, 'value' => $r_idx, 'suit_value' => $s_idx, 'name' => "{$rank}{$suit}"];
            }
        }
        return $deck;
    }

    protected function getGameState() {
        $player_view = $this->game_state;
        // Hide other players' hands if the game is in the setting phase
        if ($player_view['game_phase'] === 'setting') {
            foreach($player_view['players'] as $p_id) {
                if ($p_id !== $this->player_id) {
                    $player_view['hands'][$p_id] = array_fill(0, 13, ['name' => 'card_back']);
                }
            }
        }
        $this->send_response(['game_state' => $player_view]);
    }
}
