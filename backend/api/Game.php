<?php
// backend/api/Game.php

abstract class Game {
    protected $pdo;
    protected $action;
    protected $request_data;
    protected $player_id;
    protected $game_id; // The unique ID for a specific game instance
    protected $game_state;

    public function __construct($pdo) {
        $this->pdo = $pdo;
        $this->action = $_GET['action'] ?? null;
        $this->request_data = json_decode(file_get_contents("php://input"), true) ?? [];

        $this->player_id = $_GET['player_id'] ?? $this->request_data['player_id'] ?? null;
        $this->game_id = $_GET['game_id'] ?? $this->request_data['game_id'] ?? null;

        // Initialize the session games array if it doesn't exist
        if (!isset($_SESSION['games'])) {
            $_SESSION['games'] = [];
        }
    }

    // Abstract methods to be implemented by each game
    abstract public function execute();
    abstract protected function createGame();
    abstract protected function getGameState();

    protected function load_game_state() {
        if ($this->action === 'createGame') {
            $this->game_state = null;
            return;
        }

        if (!$this->game_id) {
            $this->send_error("Game ID is required.", 400);
        }

        if (isset($_SESSION['games'][$this->game_id])) {
            $this->game_state = $_SESSION['games'][$this->game_id];
        } else {
            $this->send_error("Game not found or session expired.", 404);
        }
    }

    protected function save_game_state() {
        if ($this->game_id && $this->game_state) {
            $_SESSION['games'][$this->game_id] = $this->game_state;
        } else if ($this->game_id && is_null($this->game_state)) {
            // If game state becomes null (e.g., game ends), remove it
            unset($_SESSION['games'][$this->game_id]);
        }
    }

    protected function send_response($data, $code = 200) {
        http_response_code($code);
        echo json_encode(array_merge(["success" => true], $data));
        exit();
    }

    protected function send_error($message, $code = 400) {
        http_response_code($code);
        echo json_encode(["success" => false, "message" => $message]);
        exit();
    }
}
