<?php
class Card {
    public $suit; // H (Hearts), D (Diamonds), C (Clubs), S (Spades)
    public $rank; // 2-10, J, Q, K, A

    public function __construct($suit, $rank) {
        $this->suit = $suit;
        $this->rank = $rank;
    }

    public function toString() {
        return $this->rank . $this->suit;
    }
}

class ThirteenWaters {
    private $deck = [];
    private $players = []; // ['player1' => ['hand' => [], 'score' => 0]]

    public function __construct() {
        $this->initializeDeck();
    }

    private function initializeDeck() {
        $suits = ['H', 'D', 'C', 'S'];
        $ranks = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A']; // T for 10
        foreach ($suits as $suit) {
            foreach ($ranks as $rank) {
                $this->deck[] = new Card($suit, $rank);
            }
        }
    }

    public function shuffleDeck() {
        shuffle($this->deck);
    }

    public function dealCards($numPlayers = 2) {
        $this->shuffleDeck();
        $this->players = [];
        for ($i = 0; $i < $numPlayers; $i++) {
            $this->players['player' . ($i + 1)] = ['hand' => [], 'score' => 0, 'played_hands' => null];
        }

        $playerIndex = 0;
        foreach ($this->deck as $card) {
            if (count($this->players['player' . ($playerIndex % $numPlayers + 1)]['hand']) < 13) {
                $this->players['player' . ($playerIndex % $numPlayers + 1)]['hand'][] = $card;
            }
            $playerIndex++;
            if ($playerIndex >= $numPlayers * 13) break; // Deal 13 cards per player
        }
    }

    public function getPlayerHand($playerId) {
        return isset($this->players[$playerId]) ? $this->players[$playerId]['hand'] : null;
    }

    public function getGameState() {
        // Convert card objects to strings for JSON output
        $state = [];
        foreach ($this->players as $playerId => $playerData) {
            $state[$playerId] = [
                'hand' => array_map(function($card) { return $card->toString(); }, $playerData['hand']),
                'score' => $playerData['score'],
                'played_hands' => $playerData['played_hands']
            ];
        }
        return $state;
    }

    // TODO: Add logic for submitting hands, validating hands, scoring, etc.
    // Example: public function submitHand($playerId, $front, $middle, $back)
    // Example: private function isValidHandCombination($front, $middle, $back)
    // Example: private function compareHandsAndScore()
}
?>
