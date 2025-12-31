<?php

class SmartSorter {

    const RANK_ORDER = [
        '2' => 2, '3' => 3, '4' => 4, '5' => 5, '6' => 6, '7' => 7, '8' => 8, '9' => 9, '10' => 10,
        'jack' => 11, 'queen' => 12, 'king' => 13, 'ace' => 14, 'black_joker' => 98, 'red_joker' => 99
    ];

    private function parseCard($card) {
        list($rank, $of, $suit) = explode('_', $card);
        return ['rank' => self::RANK_ORDER[$rank], 'suit' => $suit, 'raw' => $card];
    }

    private function findBestFive($cards) {
        $parsed = array_map([$this, 'parseCard'], $cards);
        usort($parsed, fn($a, $b) => $b['rank'] <=> $a['rank']);

        // --- 1. Flush Check ---
        $suits = [];
        foreach ($parsed as $c) {
            $suits[$c['suit']][] = $c;
        }
        foreach ($suits as $suit => $cardsInSuit) {
            if (count($cardsInSuit) >= 5) {
                return array_map(fn($c) => $c['raw'], array_slice($cardsInSuit, 0, 5));
            }
        }

        // --- 2. Straight Check ---
        $unique = [];
        $seenRanks = new SplObjectStorage(); // Using SplObjectStorage for object keys
        foreach($parsed as $c) {
            if (!$seenRanks->contains((object)['rank' => $c['rank']])) {
                $unique[] = $c;
                $seenRanks->attach((object)['rank' => $c['rank']]);
            }
        }
        if (count($unique) >= 5) {
            for ($i = 0; $i <= count($unique) - 5; $i++) {
                if (($unique[$i]['rank'] - $unique[$i+4]['rank']) === 4) {
                    return array_map(fn($c) => $c['raw'], array_slice($unique, $i, 5));
                }
            }
        }
        
        // --- 3. Default to High Card ---
        return array_map(fn($c) => $c['raw'], array_slice($parsed, 0, 5));
    }

    public function sortHand(array $allCards): array {
        // Initial sort of all 13 cards by rank descending
        usort($allCards, function ($a, $b) {
            $rankA = self::RANK_ORDER[explode('_', $a)[0]];
            $rankB = self::RANK_ORDER[explode('_', $b)[0]];
            return $rankB <=> $rankA;
        });

        $remaining = $allCards;

        $back = $this->findBestFive($remaining);
        $remaining = array_values(array_diff($remaining, $back));

        $mid = $this->findBestFive($remaining);
        $remaining = array_values(array_diff($remaining, $mid));
        
        // Whatever is left is the head
        $head = $remaining;

        // The spec requires the sorted hand to be a single array, not 3 segments
        return array_merge($head, $mid, $back);
    }
    
    // This function will be needed for scoring later
    public static function getHandScore(array $cards): array {
        if (empty($cards)) return ['score' => 0, 'name' => ''];

        $ranks = array_map(fn($c) => self::RANK_ORDER[explode('_', $c)[0]], $cards);
        sort($ranks);
        
        $suits = array_map(fn($c) => explode('_', $c)[2], $cards);
        $isFlush = count(array_unique($suits)) === 1;

        $isStraight = false;
        $uniqueRanks = array_unique($ranks);
        if (count($uniqueRanks) === 5) {
            $isStraight = ($uniqueRanks[4] - $uniqueRanks[0] === 4);
        }

        if ($isStraight && $isFlush) return ['score' => 800, 'name' => '同花顺'];
        if ($isFlush) return ['score' => 500, 'name' => '同花'];
        if ($isStraight) return ['score' => 400, 'name' => '顺子'];

        $counts = array_count_values($ranks);
        arsort($counts);
        $values = array_values($counts);

        if ($values[0] === 4) return ['score' => 700, 'name' => '四条'];
        if ($values[0] === 3 && $values[1] === 2) return ['score' => 600, 'name' => '葫芦'];
        if ($values[0] === 3) return ['score' => 300, 'name' => '三条'];
        if ($values[0] === 2 && $values[1] === 2) return ['score' => 200, 'name' => '两对'];
        if ($values[0] === 2) return ['score' => 100, 'name' => '对子'];

        return ['score' => max($ranks), 'name' => '高牌']; // Score is the highest card rank
    }
}
?>