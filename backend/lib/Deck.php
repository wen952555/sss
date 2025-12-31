<?php

class Deck {

    /**
     * Creates a standard 52-card deck.
     * @return array The deck of cards.
     */
    public static function create(): array {
        $suits = ['spades', 'hearts', 'clubs', 'diamonds'];
        $ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king', 'ace'];
        $deck = [];
        foreach ($suits as $suit) {
            foreach ($ranks as $rank) {
                $deck[] = $rank . '_of_' . $suit;
            }
        }
        return $deck;
    }

    /**
     * Shuffles a deck and deals it to players.
     * @param array $deck The deck to deal from.
     * @param int $num_players Number of players.
     * @param int $cards_per_player Cards to deal to each player.
     * @return array Hands for each player position (north, east, south, west).
     * @throws Exception If not enough cards are in the deck.
     */
    public static function deal(array $deck, int $num_players = 4, int $cards_per_player = 13): array {
        if (count($deck) < $num_players * $cards_per_player) {
            throw new Exception("Not enough cards in the deck to deal.");
        }
        shuffle($deck);
        
        $hands = [];
        $player_positions = ['north', 'east', 'south', 'west'];
        
        // Distribute cards to each player position
        for ($i = 0; $i < $num_players; $i++) {
            $hands[$player_positions[$i]] = array_splice($deck, 0, $cards_per_player);
        }

        return $hands;
    }
}
?>