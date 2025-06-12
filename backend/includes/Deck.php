<?php
require_once 'Card.php';

class Deck {
    private array $cards = [];

    public function __construct() {
        $this->cards = [];
        $ranks = array_values(Card::SYMBOL_TO_RANK); // Use numeric ranks for generation
        $suits = Card::SUITS;

        foreach ($suits as $suit) {
            foreach ($ranks as $rank) {
                $this->cards[] = new Card($rank, $suit);
            }
        }
    }

    public function shuffle(): void {
        shuffle($this->cards);
    }

    public function deal(int $count = 13): array {
        if ($count > count($this->cards)) {
            throw new Exception("Not enough cards in deck to deal {$count}.");
        }
        return array_splice($this->cards, 0, $count);
    }

    public function count(): int {
        return count($this->cards);
    }
}
