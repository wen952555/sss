<?php
// backend/api/Mahjong.php

require_once 'Game.php';
require_once 'mahjong_helpers.php';

class Mahjong extends Game {

    public function __construct($pdo) {
        parent::__construct($pdo);
        $this->load_game_state();
    }

    public function execute() {
        switch ($this->action) {
            case 'createGame': $this->createGame(); break;
            case 'getGameState': $this->getGameState(); break;
            case 'drawTile': $this->drawTile(); break;
            case 'discardTile': $this->discardTile(); break;
            case 'pung': $this->pung(); break;
            case 'chow': $this->chow(); break;
            case 'kong': $this->kong(); break;
            case 'checkWin': $this->checkWinAction(); break;
            case 'win': $this->win(); break;
            default: $this->send_error("Invalid action specified for Mahjong."); break;
        }
        $this->save_game_state();
    }

    protected function createGame() {
        $this->game_id = uniqid('mj_');
        $tiles = createMahjongTiles();
        shuffle($tiles);
        $players = ['player1', 'player2', 'player3', 'player4'];
        $hands = array_fill_keys($players, []);
        for ($i = 0; $i < 13; $i++) {
            foreach ($players as $player) {
                $hands[$player][] = array_pop($tiles);
            }
        }
        $hands['player1'][] = array_pop($tiles);
        $this->game_state = [
            'game_id' => $this->game_id, 'game_type' => 'mahjong', 'players' => $players,
            'hands' => $hands, 'wall' => $tiles, 'discards' => [],
            'melds' => array_fill_keys($players, []), 'current_turn' => 'player1',
            'game_phase' => 'playing', 'last_discard' => null, 'winner' => null,
            'action_options' => [], // To notify players of available actions
        ];
        $this->save_game_state();
        $this->send_response(["game_id" => $this->game_id, "message" => "New Mahjong game created."], 201);
    }

    protected function getGameState() {
        $this->send_response(['game_state' => $this->game_state]);
    }

    protected function drawTile() {
        if ($this->game_state['current_turn'] !== $this->player_id) { $this->send_error("It's not your turn."); }
        if (count($this->game_state['hands'][$this->player_id]) >= 14) { $this->send_error("You must discard a tile first."); }
        if (empty($this->game_state['wall'])) {
            $this->game_state['game_phase'] = 'finished'; // Draw
            $this->send_response(['message' => 'The wall is empty. Game is a draw.']);
            return;
        }
        $tile = array_pop($this->game_state['wall']);
        $this->game_state['hands'][$this->player_id][] = $tile;
        $this->send_response(['message' => 'Tile drawn.', 'drawn_tile' => $tile]);
    }

    protected function discardTile() {
        if ($this->game_state['current_turn'] !== $this->player_id) { $this->send_error("It's not your turn."); }
        if (count($this->game_state['hands'][$this->player_id]) % 3 !== 2) { $this->send_error("You cannot discard now."); }

        $tileToDiscardId = $this->request_data['tile_id'] ?? null;
        if (!$tileToDiscardId) { $this->send_error("You must specify a tile to discard."); }

        $hand = &$this->game_state['hands'][$this->player_id];
        $tile_index = -1;
        foreach($hand as $i => $tile) {
            if ($tile['id'] === $tileToDiscardId) { $tile_index = $i; break; }
        }

        if ($tile_index === -1) { $this->send_error("You don't have that tile in your hand."); }

        $discarded = array_splice($hand, $tile_index, 1);
        $this->game_state['discards'][] = $discarded[0];
        $this->game_state['last_discard'] = $discarded[0];

        // Check other players for actions
        $this->game_state['action_options'] = $this->check_for_actions($discarded[0]);

        if (empty($this->game_state['action_options'])) {
            $this->game_state['current_turn'] = $this->get_next_player($this->player_id);
        }

        $this->send_response(['message' => 'Tile discarded.']);
    }

    protected function pung() {
        $options = $this->game_state['action_options'][$this->player_id] ?? [];
        if (!in_array('pung', $options)) { $this->send_error("You cannot pung now."); }

        $last_discard = $this->game_state['last_discard'];
        $hand = &$this->game_state['hands'][$this->player_id];

        $new_hand = [];
        $matches_found = 0;
        foreach ($hand as $tile) {
            if ($tile['name'] === $last_discard['name'] && $matches_found < 2) {
                $matches_found++;
            } else {
                $new_hand[] = $tile;
            }
        }

        $this->game_state['hands'][$this->player_id] = $new_hand;
        $this->game_state['melds'][$this->player_id][] = ['type' => 'pung', 'tiles' => [$last_discard, $last_discard, $last_discard]];
        $this->game_state['last_discard'] = null;
        $this->game_state['action_options'] = [];
        $this->game_state['current_turn'] = $this->player_id;

        $this->send_response(['message' => 'Pung successful. Please discard a tile.']);
    }

    protected function chow() { $this->send_error("Chow not implemented yet."); }
    protected function kong() { $this->send_error("Kong not implemented yet."); }

    protected function checkWinAction() {
        $hand = $this->game_state['hands'][$this->player_id] ?? [];
        // A player might check for win with the last discard from another player
        $last_discard = $this->game_state['last_discard'];
        $winnable = false;
        if ($last_discard) {
            $potential_hand = array_merge($hand, [$last_discard]);
            if(checkWin($potential_hand)) {
                $winnable = true;
            }
        }
        // Or check after their own draw
        if (!$winnable) {
            $winnable = checkWin($hand);
        }
        $this->send_response(['can_win' => $winnable]);
    }

    protected function win() {
        $hand = $this->game_state['hands'][$this->player_id];
        $last_discard = $this->game_state['last_discard'];

        // Check for win with own hand (after drawing)
        $win_on_draw = checkWin($hand);
        // Check for win with opponent's discard
        $win_on_discard = false;
        if ($last_discard && $this->game_state['current_turn'] !== $this->player_id) {
            $potential_hand = array_merge($hand, [$last_discard]);
            $win_on_discard = checkWin($potential_hand);
        }

        if ($win_on_draw || $win_on_discard) {
            $this->game_state['game_phase'] = 'finished';
            $this->game_state['winner'] = $this->player_id;
            $this->send_response(['message' => "Congratulations, you won!"]);
        } else {
            $this->send_error("This is not a winning hand.");
        }
    }

    private function check_for_actions($discarded_tile) {
        $actions = [];
        foreach ($this->game_state['players'] as $player_id) {
            if ($player_id === $this->game_state['current_turn']) continue; // Can't act on your own discard

            $player_actions = [];
            $hand = $this->game_state['hands'][$player_id];

            if (canPung($hand, $discarded_tile)) $player_actions[] = 'pung';
            if (canKong($hand, $discarded_tile)) $player_actions[] = 'kong';

            // Check for chow only for the next player
            if ($player_id === $this->get_next_player($this->game_state['current_turn'])) {
                if (findChow($hand, $discarded_tile)) $player_actions[] = 'chow';
            }

            if (!empty($player_actions)) {
                $actions[$player_id] = $player_actions;
            }
        }
        return $actions;
    }

    private function get_next_player($current_player) {
        $players = $this->game_state['players'];
        $current_index = array_search($current_player, $players);
        $next_index = ($current_index + 1) % count($players);
        return $players[$next_index];
    }
}
