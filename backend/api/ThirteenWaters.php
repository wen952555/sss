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

        // --- Check for Instant-Win "Dragon" Hand ---
        foreach ($hands as $player_id => $hand) {
            if (check_for_dragon($hand)) {
                $this->game_state['game_phase'] = 'finished';
                $total_points = array_fill_keys($players, -13);
                $total_points[$player_id] = 39; // +13 from each of the 3 other players
                $this->game_state['results'] = [
                    'points' => $total_points,
                    'details' => "Player $player_id won with a Dragon hand!",
                    'winner' => $player_id
                ];
                break; // End check once one dragon is found
            }
        }

        $this->save_game_state();
        $this->send_response(['game_id' => $this->game_id, 'message' => 'New game created.']);
    }

    protected function setHand() {
        if ($this->game_state['game_phase'] !== 'setting') {
            $this->send_error("The game is not in the setting phase.");
        }

        $front = $this->request_data['front'] ?? [];
        $middle = $this->request_data['middle'] ?? [];
        $back = $this->request_data['back'] ?? [];

        if (count($front) !== 3 || count($middle) !== 5 || count($back) !== 5) {
            $this->send_error("Invalid hand arrangement. Must be 3-5-5.");
        }

        // --- Card Ownership Validation ---
        $player_hand = $this->game_state['hands'][$this->player_id];
        $submitted_hand = array_merge($front, $middle, $back);
        if (count($submitted_hand) !== 13) {
            $this->send_error("You must use exactly 13 cards.");
        }

        $player_hand_names = array_column($player_hand, 'name');
        $submitted_hand_names = array_column($submitted_hand, 'name');
        sort($player_hand_names);
        sort($submitted_hand_names);

        if ($player_hand_names !== $submitted_hand_names) {
            $this->send_error("The submitted cards do not match the cards in your hand.");
        }

        // --- Hand Evaluation and Strength Validation ---
        $front_eval = evaluate_3_card_hand($front);
        $middle_eval = evaluate_5_card_hand($middle);
        $back_eval = evaluate_5_card_hand($back);

        if (compare_evaluated_hands($middle_eval, $back_eval) > 0) {
            $this->send_error("Invalid arrangement: Middle hand cannot be stronger than the back hand.");
        }
        if (compare_evaluated_hands($front_eval, $middle_eval) > 0) {
            $this->send_error("Invalid arrangement: Front hand cannot be stronger than the middle hand.");
        }

        // --- Store the Validated Hand ---
        $this->game_state['set_hands'][$this->player_id] = [
            'front' => ['cards' => $front, 'eval' => $front_eval],
            'middle' => ['cards' => $middle, 'eval' => $middle_eval],
            'back' => ['cards' => $back, 'eval' => $back_eval],
        ];

        if (count($this->game_state['set_hands']) === count($this->game_state['players'])) {
            $this->compareAllHands();
            $this->game_state['game_phase'] = 'finished';
        }

        $this->send_response(['message' => 'Hand set successfully.']);
    }

    private function compareAllHands() {
        $players = $this->game_state['players'];
        $set_hands = $this->game_state['set_hands'];
        $num_players = count($players);
        $total_points = array_fill_keys($players, 0);

        for ($i = 0; $i < $num_players; $i++) {
            for ($j = $i + 1; $j < $num_players; $j++) {
                $p1_id = $players[$i];
                $p2_id = $players[$j];
                $p1_hand = $set_hands[$p1_id];
                $p2_hand = $set_hands[$p2_id];

                $p1_net_wins = 0;

                // Compare Front
                $front_comp = compare_evaluated_hands($p1_hand['front']['eval'], $p2_hand['front']['eval']);
                if ($front_comp > 0) $p1_net_wins++; else if ($front_comp < 0) $p1_net_wins--;

                // Compare Middle
                $middle_comp = compare_evaluated_hands($p1_hand['middle']['eval'], $p2_hand['middle']['eval']);
                if ($middle_comp > 0) $p1_net_wins++; else if ($middle_comp < 0) $p1_net_wins--;

                // Compare Back
                $back_comp = compare_evaluated_hands($p1_hand['back']['eval'], $p2_hand['back']['eval']);
                if ($back_comp > 0) $p1_net_wins++; else if ($back_comp < 0) $p1_net_wins--;

                $points_exchanged = 0;
                // Check for a "scoop" (winning all 3)
                if ($p1_net_wins === 3) {
                    $points_exchanged = 6; // 3 for segments, 3 bonus for scoop
                } else if ($p1_net_wins === -3) {
                    $points_exchanged = -6; // P2 scoops
                } else {
                    $points_exchanged = $p1_net_wins;
                }

                $total_points[$p1_id] += $points_exchanged;
                $total_points[$p2_id] -= $points_exchanged;
            }
        }

        // Update player scores in the database
        // For now, we just store results in the game state. A real implementation
        // would need to map game players to DB users and update their points.
        // Example:
        // foreach ($total_points as $player_id => $points_won) {
        //     $stmt = $this->pdo->prepare("UPDATE users SET points = points + ? WHERE username = ?");
        //     $stmt->execute([$points_won, $player_id]);
        // }

        $this->game_state['results'] = [
            'points' => $total_points,
            'details' => "Comparison complete." // Could be expanded with per-player results
        ];
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
