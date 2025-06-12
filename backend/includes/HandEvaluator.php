<?php
require_once 'Card.php';

class HandEvaluator {
    // Constants for hand types (与前端JS版保持一致)
    const TYPE_HIGH_CARD = 0;
    const TYPE_ONE_PAIR = 1;
    // ... all other hand types ...
    const TYPE_STRAIGHT_FLUSH = 8;
    const TYPE_ROYAL_FLUSH = 9;


    /**
     * Evaluates a given set of cards (3 or 5) and returns its type and kickers.
     * @param Card[] $cards Array of Card objects
     * @return array ['type' => int, 'kickers' => int[], 'handCards' => Card[]]
     */
    public static function evaluateHand(array $cards_input): array {
        $cards = [];
        foreach($cards_input as $ci) {
            if (is_string($ci)) $cards[] = Card::fromId($ci);
            else if ($ci instanceof Card) $cards[] = $ci;
        }

        if (empty($cards)) return ['type' => self::TYPE_HIGH_CARD, 'kickers' => [], 'handCards' => []];

        usort($cards, fn(Card $a, Card $b) => $b->rank <=> $a->rank); // Sort by rank desc

        $n = count($cards);
        $type = self::TYPE_HIGH_CARD;
        $kickers = array_map(fn(Card $c) => $c->rank, $cards);

        if ($n !== 3 && $n !== 5) {
            // Or throw error, depending on usage context
            return ['type' => $type, 'kickers' => $kickers, 'handCards' => $cards];
        }

        // ---牌型判断逻辑 (与之前 Hand.php 中 evaluate() 类似) ---
        // isFlush, isStraight, rankCounts etc.
        // ... (详细逻辑省略，参考之前PHP Hand类中的evaluate方法) ...
        // 最终会确定 $type 和 $kickers

        // Example for a pair (simplified)
        $ranks = array_map(fn(Card $c) => $c->rank, $cards);
        $rankCounts = array_count_values($ranks);
        arsort($rankCounts);

        $isPair = false; $pairRank = 0; $otherKickers = [];
        foreach ($rankCounts as $rank => $count) {
            if ($count == 2) {
                $isPair = true; $pairRank = $rank;
                foreach($ranks as $r) if($r != $rank) $otherKickers[] = $r;
                sort($otherKickers); $otherKickers = array_reverse($otherKickers); // Kicker desc
                break;
            }
        }
        if($isPair) {
            $type = self::TYPE_ONE_PAIR;
            $kickers = array_merge([$pairRank], $otherKickers);
        }
        // --- 结束牌型判断逻辑 ---

        return ['type' => $type, 'kickers' => $kickers, 'handCards' => $cards];
    }

    /**
     * Compares two evaluated hands.
     * @param array $handA Result from evaluateHand for hand A
     * @param array $handB Result from evaluateHand for hand B
     * @return int 1 if handA > handB, -1 if handA < handB, 0 if equal
     */
    public static function compareEvaluatedHands(array $handA, array $handB): int {
        if ($handA['type'] > $handB['type']) return 1;
        if ($handA['type'] < $handB['type']) return -1;

        // Same type, compare kickers
        for ($i = 0; $i < count($handA['kickers']); $i++) {
            if (!isset($handB['kickers'][$i])) return 1;
            if ($handA['kickers'][$i] > $handB['kickers'][$i]) return 1;
            if ($handA['kickers'][$i] < $handB['kickers'][$i]) return -1;
        }
        if (count($handB['kickers']) > count($handA['kickers'])) return -1;
        return 0;
    }
}
