<?php
class Card {
    public $suit; // clubs, spades, diamonds, hearts
    public $rank; // ace, king, queen, jack, 10, 9, ..., 2

    // 为了牌型比较，我们可能还是需要内部的数值表示
    public $suitInternal; // H, D, C, S
    public $rankInternal; // A, K, Q, J, T, 9, ..., 2

    private static $rankMap = [
        'A' => 'ace', 'K' => 'king', 'Q' => 'queen', 'J' => 'jack',
        'T' => '10', '9' => '9', '8' => '8', '7' => '7',
        '6' => '6', '5' => '5', '4' => '4', '3' => '3', '2' => '2'
    ];

    private static $suitMap = [
        'S' => 'spades', 'H' => 'hearts', 'D' => 'diamonds', 'C' => 'clubs'
    ];

    public function __construct($internalSuit, $internalRank) {
        $this->suitInternal = $internalSuit;
        $this->rankInternal = $internalRank;

        if (!isset(self::$suitMap[$internalSuit]) || !isset(self::$rankMap[$internalRank])) {
            throw new InvalidArgumentException("Invalid card suit or rank: {$internalSuit}{$internalRank}");
        }

        $this->suit = self::$suitMap[$internalSuit];
        $this->rank = self::$rankMap[$internalRank];
    }

    /**
     * Returns a string representation for image mapping, e.g., "spades_ace"
     */
    public function toStringForImage() {
        return $this->suit . '_' . $this->rank;
    }

    /**
     * Optional: A more traditional string representation, e.g., "AS" or "KH"
     * You might still want this for internal logic or debugging
     */
    public function toStringShort() {
        return $this->rankInternal . $this->suitInternal;
    }
}

class ThirteenWaters {
    private $deck = [];
    private $players = [];

    public function __construct() {
        $this->initializeDeck();
    }

    private function initializeDeck() {
        $this->deck = []; // Clear deck before initializing
        $internalSuits = ['S', 'H', 'D', 'C']; // Spades, Hearts, Diamonds, Clubs
        $internalRanks = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2']; // T for 10

        foreach ($internalSuits as $suit) {
            foreach ($internalRanks as $rank) {
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
        $cardsDealt = 0;
        $totalCardsToDeal = $numPlayers * 13;

        // Make sure deck has enough cards
        if (count($this->deck) < $totalCardsToDeal) {
            // This shouldn't happen with a standard 52 card deck and up to 4 players
            // but good to be aware of if deck size changes or player count is very high.
            error_log("Not enough cards in deck to deal.");
            return;
        }

        foreach ($this->deck as $card) {
            if ($cardsDealt >= $totalCardsToDeal) break;

            $currentPlayerKey = 'player' . (($cardsDealt % $numPlayers) + 1);
            $this->players[$currentPlayerKey]['hand'][] = $card;
            $cardsDealt++;
        }
    }


    public function getPlayerHand($playerId) {
        return isset($this->players[$playerId]) ? $this->players[$playerId]['hand'] : null;
    }

    public function getGameState() {
        $state = [];
        foreach ($this->players as $playerId => $playerData) {
            $state[$playerId] = [
                // Use toStringForImage() for the frontend
                'hand' => array_map(function($card) { /** @var Card $card */ return $card->toStringForImage(); }, $playerData['hand']),
                'score' => $playerData['score'],
                'played_hands' => $playerData['played_hands']
            ];
        }
        return $state;
    }

    // ... (Rest of the ThirteenWaters class: submitHand, isValidHandCombination, compareHandsAndScore etc.)
}
?>
