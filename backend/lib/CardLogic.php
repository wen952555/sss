<?php
/* backend/lib/CardLogic.php */
class CardLogic {
    // 牌型等级：同花顺(10) > 四条(9) > 葫芦(8) > 同花(7) > 顺子(6) > 三条(5) > 两对(4) > 对子(3) > 单张(2)
    const TYPE_STRAIGHT_FLUSH = 10;
    const TYPE_FOUR_KIND = 9;
    const TYPE_FULL_HOUSE = 8;
    const TYPE_FLUSH = 7;
    const TYPE_STRAIGHT = 6;
    const TYPE_THREE_KIND = 5;
    const TYPE_TWO_PAIR = 4;
    const TYPE_PAIR = 3;
    const TYPE_SINGLE = 2;

    // 格式化牌：把1-52转为 {val, suit}
    public static function parse($nums) {
        $res = [];
        foreach($nums as $n) {
            if($n > 52) continue; // 暂不计大小王进入普通牌型比对
            $res[] = ['val' => (($n - 1) % 13) + 2, 'suit' => floor(($n - 1) / 13)];
        }
        return $res;
    }

    // 评估一手牌（3张或5张）
    public static function evaluate($nums) {
        $cards = self::parse($nums);
        $vals = array_column($cards, 'val');
        sort($vals);
        $suits = array_column($cards, 'suit');
        $isFlush = count(array_unique($suits)) === 1;
        
        // 顺子检查
        $isStraight = true;
        for($i=0; $i<count($vals)-1; $i++) {
            if($vals[$i+1] - $vals[$i] !== 1) $isStraight = false;
        }
        // 特殊顺子 A2345
        if(!$isStraight && implode(',',$vals) === '2,3,4,5,14') $isStraight = true;

        $counts = array_count_values($vals);
        arsort($counts);
        $freq = array_values($counts);
        $keys = array_keys($counts);

        if (count($nums) === 5) {
            if ($isFlush && $isStraight) return [self::TYPE_STRAIGHT_FLUSH, $vals];
            if ($freq[0] === 4) return [self::TYPE_FOUR_KIND, $keys];
            if ($freq[0] === 3 && $freq[1] === 2) return [self::TYPE_FULL_HOUSE, $keys];
            if ($isFlush) return [self::TYPE_FLUSH, $vals];
            if ($isStraight) return [self::TYPE_STRAIGHT, $vals];
        }

        if ($freq[0] === 3) return [self::TYPE_THREE_KIND, $keys];
        if ($freq[0] === 2 && ($freq[1] ?? 0) === 2) return [self::TYPE_TWO_PAIR, $keys];
        if ($freq[0] === 2) return [self::TYPE_PAIR, $keys];
        return [self::TYPE_SINGLE, $vals];
    }

    // 比较两组牌 (1:A赢, -1:B赢, 0:平)
    public static function compareHand($handA, $handB) {
        $resA = self::evaluate($handA);
        $resB = self::evaluate($handB);
        if ($resA[0] !== $resB[0]) return $resA[0] > $resB[0] ? 1 : -1;
        // 等级相同比特征值 (从大到小比)
        $vA = $resA[1]; rsort($vA);
        $vB = $resB[1]; rsort($vB);
        for($i=0; $i<count($vA); $i++) {
            if ($vA[$i] !== $vB[$i]) return $vA[$i] > $vB[$i] ? 1 : -1;
        }
        return 0;
    }

    // 检查“相公”（头道必须 <= 中道 <= 尾道）
    public static function isXiangGong($head, $mid, $tail) {
        if (self::compareHand($head, $mid) === 1) return true;
        if (self::compareHand($mid, $tail) === 1) return true;
        return false;
    }
}
