<?php
// backend/utils/CardComparator.php

class CardComparator {
    private const VALUES = ['2' => 2, '3' => 3, '4' => 4, '5' => 5, '6' => 6, '7' => 7, '8' => 8, '9' => 9, '10' => 10, 'jack' => 11, 'queen' => 12, 'king' => 13, 'ace' => 14];
    private const SUITS = ['clubs' => 1, 'diamonds' => 2, 'hearts' => 3, 'spades' => 4];

    // Hand type rankings
    private const TYPE_RANKING = [
        'high_card' => 1,
        'pair' => 2,
        'two_pair' => 3,
        'three_of_a_kind' => 4,
        'straight' => 5,
        'flush' => 6,
        'full_house' => 7,
        'four_of_a_kind' => 8,
        'straight_flush' => 9,
        // Special hands for 13-card games can be added later
    ];

    /**
     * Compares two hands and returns 1 if hand1 > hand2, -1 if hand1 < hand2, 0 if equal.
     * @param array $hand1
     * @param array $hand2
     * @return int
     */
    public function compareHands(array $hand1, array $hand2): int {
        $details1 = $this->getHandDetails($hand1);
        $details2 = $this->getHandDetails($hand2);

        if ($details1['type_rank'] > $details2['type_rank']) return 1;
        if ($details1['type_rank'] < $details2['type_rank']) return -1;

        // If types are the same, compare ranks
        for ($i = 0; $i < count($details1['ranks']); $i++) {
            if ($details1['ranks'][$i] > $details2['ranks'][$i]) return 1;
            if ($details1['ranks'][$i] < $details2['ranks'][$i]) return -1;
        }

        return 0; // Hands are identical
    }

    /**
     * Determines the hand's type, rank and score.
     * @param array $cards
     * @return array
     */
    public function getHandDetails(array $cards): array {
        $parsedCards = $this->parseCards($cards);
        $groups = $this->getGroups($parsedCards);
        $sets = $this->findSets($groups);
        $isStraight = (count($cards) === 5) ? $this->isStraight($parsedCards) : false;
        $isFlush = (count($cards) === 5) ? $this->isFlush($parsedCards) : false;

        $type = 'high_card';
        $ranks = array_column($parsedCards, 'rank');
        rsort($ranks);

        if ($isStraight && $isFlush) {
            $type = 'straight_flush';
        } elseif (!empty($sets[4])) {
            $type = 'four_of_a_kind';
            $kickers = array_values(array_diff($ranks, $sets[4]));
            $ranks = array_merge($sets[4], $kickers);
        } elseif (!empty($sets[3]) && !empty($sets[2])) {
            $type = 'full_house';
            $ranks = [$sets[3][0], $sets[2][0]];
        } elseif ($isFlush) {
            $type = 'flush';
        } elseif ($isStraight) {
            $type = 'straight';
        } elseif (!empty($sets[3])) {
            $type = 'three_of_a_kind';
            $kickers = array_values(array_diff($ranks, $sets[3]));
            $ranks = array_merge($sets[3], $kickers);
        } elseif (count($sets[2]) >= 2) {
            $type = 'two_pair';
            $kickers = array_values(array_diff($ranks, $sets[2]));
            $ranks = array_merge($sets[2], $kickers);
        } elseif (!empty($sets[2])) {
            $type = 'pair';
            $kickers = array_values(array_diff($ranks, $sets[2]));
            $ranks = array_merge($sets[2], $kickers);
        }

        // For high card, ranks are already sorted

        return [
            'type' => $type,
            'type_rank' => self::TYPE_RANKING[$type],
            'ranks' => $ranks
        ];
    }

    /**
     * Parses a card string (e.g., 'king_of_spades') into an object.
     * @param string $card
     * @return array
     */
    private function parseCard(string $card): array {
        list($value, $suit) = explode('_of_', $card);
        return ['value' => $value, 'suit' => $suit, 'rank' => self::VALUES[$value]];
    }

    /**
     * Parses multiple card strings into an array of card objects.
     * @param array $cards
     * @return array
     */
    private function parseCards(array $cards): array {
        return array_map([$this, 'parseCard'], $cards);
    }

    /**
     * Groups cards by their rank.
     * @param array $parsedCards
     * @return array
     */
    private function getGroups(array $parsedCards): array {
        $groups = [];
        foreach ($parsedCards as $card) {
            $groups[$card['rank']][] = $card;
        }
        return $groups;
    }

    /**
     * Checks for pairs, three-of-a-kind, four-of-a-kind.
     * @param array $groups
     * @return array
     */
    private function findSets(array $groups): array {
        $sets = [4 => [], 3 => [], 2 => []];
        foreach ($groups as $rank => $cards) {
            $count = count($cards);
            if ($count > 1) {
                $sets[$count][] = $rank;
            }
        }
        // Sort pairs and three-of-a-kind by rank descending
        rsort($sets[2]);
        rsort($sets[3]);
        return $sets;
    }

    /**
     * Checks if a hand is a straight.
     * @param array $parsedCards
     * @return bool
     */
    private function isStraight(array $parsedCards): bool {
        if (count($parsedCards) < 5) return false;
        $ranks = array_unique(array_column($parsedCards, 'rank'));
        sort($ranks);
        if (count($ranks) < 5) return false;

        // Find longest consecutive sequence
        $longest = 1;
        $current = 1;
        for ($i = 1; $i < count($ranks); $i++) {
            if ($ranks[$i] - $ranks[$i-1] === 1) {
                $current++;
            } else {
                $longest = max($longest, $current);
                $current = 1;
            }
        }
        $longest = max($longest, $current);

        // Check for wheel straight (A-2-3-4-5)
        $hasAce = in_array(14, $ranks);
        $wheelRanks = [2, 3, 4, 5];
        if ($hasAce && count(array_intersect($ranks, $wheelRanks)) === 4) {
            return true;
        }

        return $longest >= 5;
    }

    /**
     * Checks if a hand is a flush.
     * @param array $parsedCards
     * @return bool
     */
    private function isFlush(array $parsedCards): bool {
        if (count($parsedCards) < 5) return false;
        $suits = array_column($parsedCards, 'suit');
        $counts = array_count_values($suits);
        return max($counts) >= 5;
    }
}
?>