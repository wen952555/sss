<?php
/* backend/lib/CardLogic.php */
class CardLogic {
    // 牌型等级
    const ROYAL_FLUSH = 10; // 同花顺
    const FOUR_KIND = 9;    // 四条
    const FULL_HOUSE = 8;   // 葫芦
    const FLUSH = 7;        // 同花
    const STRAIGHT = 6;     // 顺子
    const THREE_KIND = 5;   // 三条
    const TWO_PAIR = 4;     // 两对
    const PAIR = 3;         // 对子
    const HIGH_CARD = 2;    // 单张

    // 评估一手牌 (3张或5张)
    public static function evaluate($cards) {
        // $cards: [ {val:1-13, suit:0-3}, ... ]
        $vals = array_column($cards, 'val');
        sort($vals);
        $suits = array_column($cards, 'suit');
        $isFlush = count(array_unique($suits)) === 1;
        
        $isStraight = true;
        for($i=0; $i<count($vals)-1; $i++) {
            if($vals[$i+1] - $vals[$i] !== 1) $isStraight = false;
        }
        // 处理 A2345 顺子
        if(!$isStraight && implode(',',$vals) === '1,2,3,4,13') $isStraight = true;

        $counts = array_count_values($vals);
        arsort($counts);
        $freq = array_values($counts);

        if ($isFlush && $isStraight) return [self::ROYAL_FLUSH, $vals];
        if ($freq[0] === 4) return [self::FOUR_KIND, array_keys($counts)];
        if ($freq[0] === 3 && ($freq[1] ?? 0) === 2) return [self::FULL_HOUSE, array_keys($counts)];
        if ($isFlush) return [self::FLUSH, $vals];
        if ($isStraight) return [self::STRAIGHT, $vals];
        if ($freq[0] === 3) return [self::THREE_KIND, array_keys($counts)];
        if ($freq[0] === 2 && ($freq[1] ?? 0) === 2) return [self::TWO_PAIR, array_keys($counts)];
        if ($freq[0] === 2) return [self::PAIR, array_keys($counts)];
        return [self::HIGH_CARD, $vals];
    }

    // 比较两个玩家的一局
    public static function compare($a, $b) {
        // a, b 格式为: ['head'=>[], 'mid'=>[], 'tail'=>[]]
        $score = 0;
        foreach(['head', 'mid', 'tail'] as $pos) {
            $evalA = self::evaluate($a[$pos]);
            $evalB = self::evaluate($b[$pos]);
            if ($evalA[0] > $evalB[0]) $score++;
            elseif ($evalA[0] < $evalB[0]) $score--;
            else {
                // 等级相同时比较特征值 (简化)
                if (max($evalA[1]) > max($evalB[1])) $score++;
                elseif (max($evalA[1]) < max($evalB[1])) $score--;
            }
        }
        // 打枪逻辑: 三道全胜翻倍
        if(abs($score) === 3) $score *= 2;
        return $score;
    }
}
