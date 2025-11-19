<?php
// backend/utils/CardGenerator.php

require_once __DIR__ . '/CardComparator.php';

class CardGenerator {
    private $suits = ['clubs', 'diamonds', 'hearts', 'spades'];
    private $values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king', 'ace'];
    private $comparator;

    public function __construct() {
        $this->comparator = new CardComparator();
    }

    // Generates a standard 52-card deck.
    public function generateDeck(): array {
        $deck = [];
        foreach ($this->suits as $suit) {
            foreach ($this->values as $value) {
                $deck[] = $value . '_of_' . $suit;
            }
        }
        return $deck;
    }

    // Shuffles the deck.
    public function shuffleDeck(array $deck): array {
        shuffle($deck);
        return $deck;
    }

    // Deals 13 cards to each of the 4 players.
    public function dealCards(): array {
        $deck = $this->generateDeck();
        $shuffled = $this->shuffleDeck($deck);
        
        $players = [];
        for ($i = 0; i < 4; $i++) {
            $players[$i] = array_slice($shuffled, $i * 13, 13);
        }
        return $players;
    }

    /**
     * Checks if a 13-card arrangement is valid (not "倒水").
     * Head <= Middle <= Tail
     * @param array $arrangement
     * @return bool
     */
    private function isValidArrangement(array $arrangement): bool {
        $head = $arrangement['head'];
        $middle = $arrangement['middle'];
        $tail = $arrangement['tail'];

        if (count($head) !== 3 || count($middle) !== 5 || count($tail) !== 5) {
            return false;
        }

        $middle_vs_head = $this->comparator->compareHands($middle, $head);
        if ($middle_vs_head < 0) {
            return false; // Middle hand is weaker than head hand
        }

        $tail_vs_middle = $this->comparator->compareHands($tail, $middle);
        if ($tail_vs_middle < 0) {
            return false; // Tail hand is weaker than middle hand
        }

        return true;
    }

    /**
     * Finds the best possible 13-card arrangement.
     * @param array $cards
     * @return array
     */
    public function smartArrange(array $cards): array {
        // This will be replaced with a sophisticated algorithm.
        // For now, return a basic valid arrangement.
        $sorted = $this->sortCardsByRank($cards);
        return [
            'head' => array_slice($sorted, 0, 3),
            'middle' => array_slice($sorted, 3, 5),
            'tail' => array_slice($sorted, 8, 5)
        ];
    }
    
    /**
     * Sorts cards primarily by rank, then by suit.
     * @param array $cards
     * @return array
     */
    private function sortCardsByRank(array $cards): array {
        $value_order = ['2' => 2, '3' => 3, '4' => 4, '5' => 5, '6' => 6, '7' => 7, '8' => 8, '9' => 9, '10' => 10, 'jack' => 11, 'queen' => 12, 'king' => 13, 'ace' => 14];
        $suit_order = ['clubs' => 1, 'diamonds' => 2, 'hearts' => 3, 'spades' => 4];
        
        usort($cards, function($a, $b) use ($value_order, $suit_order) {
            list($a_value, $a_suit) = explode('_of_', $a);
            list($b_value, $b_suit) = explode('_of_', $b);
            
            $a_rank = $value_order[$a_value] ?? 0;
            $b_rank = $value_order[$b_value] ?? 0;

            if ($a_rank !== $b_rank) {
                return $a_rank - $b_rank;
            }
            
            $a_suit_rank = $suit_order[$a_suit] ?? 0;
            $b_suit_rank = $suit_order[$b_suit] ?? 0;
            return $a_suit_rank - $b_suit_rank;
        });
        return $cards;
    }
}
?>