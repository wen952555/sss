<?php

class CardEvaluator {
    // --- 牌型等级 ---
    const HIGH_CARD = 1;
    const PAIR = 2;
    const TWO_PAIR = 3;
    const THREE_OF_A_KIND = 4;
    const STRAIGHT = 5;
    const FLUSH = 6;
    const FULL_HOUSE = 7;
    const FOUR_OF_A_KIND = 8;
    const STRAIGHT_FLUSH = 9;
    // Note: Royal Flush is just the highest Straight Flush

    // --- 牌面点数 (2-10, J, Q, K, A) ---
    // Use a map for easier lookup
    const CARD_VALUES = [
        '2' => 2, '3' => 3, '4' => 4, '5' => 5, '6' => 6, '7' => 7, '8' => 8, '9' => 9, 'T' => 10, 
        'J' => 11, 'Q' => 12, 'K' => 13, 'A' => 14
    ];

    /**
     * 评估一手5张牌的牌力
     * @param array $hand e.g., ['HA', 'SK', 'D5', 'C2', 'H9']
     * @return array ['rank' => 牌型, 'primary_value' => 主要比较值, 'secondary_value' => 次要比较值]
     */
    public static function evaluate5($hand) {
        $values = [];
        $suits = [];
        foreach ($hand as $card) {
            $values[] = self::CARD_VALUES[substr($card, 1)];
            $suits[] = substr($card, 0, 1);
        }
        rsort($values); // Sort values descending
        
        $isFlush = count(array_unique($suits)) === 1;
        $isStraight = self::isStraight($values);

        if ($isStraight && $isFlush) {
            return ['rank' => self::STRAIGHT_FLUSH, 'primary_value' => $values[0]];
        }
        
        $counts = array_count_values($values);
        $valueCounts = array_count_values($counts);
        
        if (in_array(4, $counts)) { // 四条
            $four = array_search(4, $counts);
            $kicker = array_search(1, $counts);
            return ['rank' => self::FOUR_OF_A_KIND, 'primary_value' => $four, 'secondary_value' => $kicker];
        }
        
        if (isset($valueCounts[3]) && isset($valueCounts[2])) { // 葫芦
            $three = array_search(3, $counts);
            $pair = array_search(2, $counts);
            return ['rank' => self::FULL_HOUSE, 'primary_value' => $three, 'secondary_value' => $pair];
        }

        if ($isFlush) {
            return ['rank' => self::FLUSH, 'primary_value' => $values]; // Compare all cards for flush
        }

        if ($isStraight) {
            return ['rank' => self::STRAIGHT, 'primary_value' => $values[0]];
        }
        
        if (in_array(3, $counts)) { // 三条
             $three = array_search(3, $counts);
             // Get kickers
             $kickers = [];
             foreach($values as $v){ if($v != $three) $kickers[] = $v; }
             return ['rank' => self::THREE_OF_A_KIND, 'primary_value' => $three, 'secondary_value' => $kickers];
        }
        
        if (isset($valueCounts[2]) && $valueCounts[2] == 2) { // 两对
            $pairs = [];
            $kicker = 0;
            foreach ($counts as $val => $count) {
                if ($count == 2) $pairs[] = $val;
                else $kicker = $val;
            }
            rsort($pairs);
            return ['rank' => self::TWO_PAIR, 'primary_value' => $pairs, 'secondary_value' => $kicker];
        }
        
        if (in_array(2, $counts)) { // 一对
            $pair = array_search(2, $counts);
            $kickers = [];
            foreach($values as $v){ if($v != $pair) $kickers[] = $v; }
            return ['rank' => self::PAIR, 'primary_value' => $pair, 'secondary_value' => $kickers];
        }
        
        return ['rank' => self::HIGH_CARD, 'primary_value' => $values];
    }

    /**
     * 检查一组牌是否是顺子 (A-5 and T-A)
     */
    private static function isStraight($values) {
        // Ace-low straight (A, 2, 3, 4, 5)
        if ($values == [14, 5, 4, 3, 2]) return true;
        
        for ($i = 0; $i < 4; $i++) {
            if ($values[$i] !== $values[$i+1] + 1) return false;
        }
        return true;
    }
    
    /**
     * 比较两个牌组 A 和 B
     * @return int 返回 A 相对于 B 的分数
     */
    public static function compareHands($handA, $handB) {
        // This is a placeholder. A full implementation would compare
        // front, middle, and back hands, and calculate scores, including
        // "scoops" or "打枪".
        $evalA = self::evaluate5($handA);
        $evalB = self::evaluate5($handB);

        if ($evalA['rank'] > $evalB['rank']) return 1;
        if ($evalA['rank'] < $evalB['rank']) return -1;

        // If ranks are equal, compare primary and secondary values
        // This part needs to handle array vs single value comparisons gracefully
        // ... logic omitted for brevity

        return 0; // Tie
    }
}
