<?php
// backend/core/CardComparator.php

class CardComparator {

    // 牌型常量 (数字越大牌型越大)
    const TYPE_HIGH_CARD = 1;
    const TYPE_PAIR = 2;
    const TYPE_TWO_PAIR = 3;
    const TYPE_TRIPS = 4;
    const TYPE_STRAIGHT = 5;
    const TYPE_FLUSH = 6;
    const TYPE_FULL_HOUSE = 7;
    const TYPE_QUADS = 8;
    const TYPE_SF = 9; // 同花顺

    // 花色权重
    const SUIT_SPADES = 4;
    const SUIT_HEARTS = 3;
    const SUIT_CLUBS = 2;
    const SUIT_DIAMONDS = 1;

    // 点数权重 (2=2 ... A=14)
    private static $rankMap = [
        '2'=>2, '3'=>3, '4'=>4, '5'=>5, '6'=>6, '7'=>7, '8'=>8, '9'=>9, '10'=>10, 
        'jack'=>11, 'queen'=>12, 'king'=>13, 'ace'=>14
    ];

    private static $suitMap = [
        'spades' => 4, 'hearts' => 3, 'clubs' => 2, 'diamonds' => 1
    ];

    /**
     * 比较两手牌
     * @param array $infoA 解析后的手牌信息
     * @param array $infoB 解析后的手牌信息
     * @return int 1(A赢), -1(B赢), 0(平)
     */
    public static function compare($infoA, $infoB) {
        // 1. 比牌型
        if ($infoA['type'] > $infoB['type']) return 1;
        if ($infoA['type'] < $infoB['type']) return -1;

        // 2. 牌型相同，比内部逻辑
        return self::compareSameType($infoA, $infoB);
    }

    /**
     * 获取牌型对应的分数 (水数)
     */
    public static function getScore($info, $lane) {
        $type = $info['type'];

        if ($lane === 'front') {
            if ($type === self::TYPE_TRIPS) return 3; // 头道三条
        } 
        elseif ($lane === 'mid') {
            if ($type === self::TYPE_SF) return 10;   // 中道同花顺
            if ($type === self::TYPE_QUADS) return 8; // 中道铁支
            if ($type === self::TYPE_FULL_HOUSE) return 2; // 中道葫芦
        } 
        elseif ($lane === 'back') {
            if ($type === self::TYPE_SF) return 5;    // 尾道同花顺
            if ($type === self::TYPE_QUADS) return 4; // 尾道铁支
        }

        return 1; // 默认为 1 水
    }

    /**
     * 公开的解析入口 (供外部调用)
     */
    public static function getHandInfo($hand) {
        return self::analyzeHand($hand);
    }

    /**
     * 核心分析逻辑 (改为 public 供 game.php 调用)
     */
    public static function analyzeHand($hand) {
        // 预处理：转为数字并排序 (大到小)
        $cards = [];
        foreach ($hand as $c) {
            $val = isset($c['val']) ? $c['val'] : self::$rankMap[$c['rank']];
            // 兼容 suit_val 或 string suit
            if (isset($c['suit_val'])) {
                $suitVal = $c['suit_val'];
            } else {
                $suitVal = isset(self::$suitMap[$c['suit']]) ? self::$suitMap[$c['suit']] : 0;
            }
            $cards[] = ['val' => $val, 'suit' => $suitVal];
        }
        usort($cards, function($a, $b) { return $b['val'] - $a['val']; }); // 默认大到小

        $isFlush = self::isFlush($cards);
        $straightRank = self::getStraightRank($cards); // 0不是顺子, >0是顺子等级
        
        // 统计点数频率
        $counts = [];
        foreach ($cards as $c) $counts[$c['val']] = ($counts[$c['val']] ?? 0) + 1;
        
        // 识别牌型
        // 1. 同花顺
        if ($isFlush && $straightRank > 0) {
            return ['type' => self::TYPE_SF, 'rank' => $straightRank, 'cards' => $cards];
        }
        // 2. 铁支
        if (max($counts) == 4) {
            $quadVal = array_search(4, $counts);
            return ['type' => self::TYPE_QUADS, 'main' => $quadVal, 'kickers' => self::getKickers($cards, [$quadVal])];
        }
        // 3. 葫芦
        if (in_array(3, $counts) && in_array(2, $counts)) {
            $tripVal = array_search(3, $counts);
            return ['type' => self::TYPE_FULL_HOUSE, 'main' => $tripVal]; 
        }
        // 4. 同花
        if ($isFlush) {
            return ['type' => self::TYPE_FLUSH, 'cards' => $cards];
        }
        // 5. 顺子
        if ($straightRank > 0) {
            return ['type' => self::TYPE_STRAIGHT, 'rank' => $straightRank, 'cards' => $cards];
        }
        // 6. 三条
        if (max($counts) == 3) {
            $tripVal = array_search(3, $counts);
            return ['type' => self::TYPE_TRIPS, 'main' => $tripVal, 'kickers' => self::getKickers($cards, [$tripVal])];
        }
        // 7. 两对
        $pairs = array_keys($counts, 2);
        if (count($pairs) == 2) {
            rsort($pairs); // 大对在前
            return ['type' => self::TYPE_TWO_PAIR, 'main' => $pairs, 'kickers' => self::getKickers($cards, $pairs)];
        }
        // 8. 一对
        if (count($pairs) == 1) {
            return ['type' => self::TYPE_PAIR, 'main' => $pairs[0], 'kickers' => self::getKickers($cards, $pairs)];
        }
        // 9. 乌龙
        return ['type' => self::TYPE_HIGH_CARD, 'cards' => $cards];
    }

    // ---------------------------------------------------------
    // 核心比大小逻辑 (同牌型)
    // ---------------------------------------------------------

    private static function compareSameType($A, $B) {
        $type = $A['type'];

        // --- A. 有“主牌”的牌型 (铁支, 葫芦, 三条, 两对, 一对) ---
        if (in_array($type, [self::TYPE_QUADS, self::TYPE_FULL_HOUSE, self::TYPE_TRIPS, self::TYPE_PAIR])) {
            // 先比主牌点数
            if ($A['main'] > $B['main']) return 1;
            if ($A['main'] < $B['main']) return -1;
            
            // 主牌一样，比踢脚 (散牌)
            // 特殊规则：如果散牌都一样，比【最小散牌】的花色
            return self::compareKickers($A['kickers'], $B['kickers']);
        }

        if ($type === self::TYPE_TWO_PAIR) {
            // 先比大对
            if ($A['main'][0] > $B['main'][0]) return 1;
            if ($A['main'][0] < $B['main'][0]) return -1;
            // 再比小对
            if ($A['main'][1] > $B['main'][1]) return 1;
            if ($A['main'][1] < $B['main'][1]) return -1;
            // 比踢脚
            return self::compareKickers($A['kickers'], $B['kickers']);
        }

        // --- B. 靠单张比大小的牌型 (同花, 乌龙) ---
        if ($type === self::TYPE_FLUSH || $type === self::TYPE_HIGH_CARD) {
            return self::compareCardsOneByOne($A['cards'], $B['cards']);
        }

        // --- C. 顺子 / 同花顺 ---
        if ($type === self::TYPE_STRAIGHT || $type === self::TYPE_SF) {
            // 先比顺子等级 (特殊 A2345 处理已在 getStraightRank 做完)
            if ($A['rank'] > $B['rank']) return 1;
            if ($A['rank'] < $B['rank']) return -1;
            
            // 等级一样，比最大那张牌的花色
            // 注意：A2345 的最大牌在逻辑上是 5，不是 A
            $maxCardA = self::getStraightMaxCard($A['cards'], $A['rank']);
            $maxCardB = self::getStraightMaxCard($B['cards'], $B['rank']);
            
            return ($maxCardA['suit'] > $maxCardB['suit']) ? 1 : -1;
        }

        return 0;
    }

    // 逐张比对 (用于同花/乌龙/踢脚)
    private static function compareCardsOneByOne($cardsA, $cardsB) {
        $count = count($cardsA);
        // 1. 先比点数
        for ($i = 0; $i < $count; $i++) {
            if ($cardsA[$i]['val'] > $cardsB[$i]['val']) return 1;
            if ($cardsA[$i]['val'] < $cardsB[$i]['val']) return -1;
        }
        
        // 2. 点数全一样，比最小那张牌的花色
        $last = $count - 1;
        if ($cardsA[$last]['suit'] > $cardsB[$last]['suit']) return 1;
        if ($cardsA[$last]['suit'] < $cardsB[$last]['suit']) return -1;
        
        return 0;
    }

    private static function compareKickers($kickersA, $kickersB) {
        return self::compareCardsOneByOne($kickersA, $kickersB);
    }

    // ---------------------------------------------------------
    // 辅助工具
    // ---------------------------------------------------------

    private static function isFlush($cards) {
        if (count($cards) < 5) return false;
        $s = $cards[0]['suit'];
        foreach ($cards as $c) if ($c['suit'] != $s) return false;
        return true;
    }

    // 返回顺子等级：0=非顺子, 14=10JQKA, 13.5=A2345(第二大)
    private static function getStraightRank($cards) {
        if (count($cards) < 5) return 0;
        $vals = array_column($cards, 'val');
        
        // 检查特殊顺子 A,5,4,3,2
        // 注意数组已大到小排序，且A=14
        if ($vals[0]==14 && $vals[1]==5 && $vals[2]==4 && $vals[3]==3 && $vals[4]==2) {
            return 13.5; 
        }
        
        // 普通顺子检查
        $isStraight = true;
        for ($i=0; $i<4; $i++) {
            if ($vals[$i] != $vals[$i+1] + 1) $isStraight = false;
        }
        
        if ($isStraight) return $vals[0]; 
        return 0;
    }

    private static function getStraightMaxCard($cards, $rank) {
        // 如果是 A2345 (rank=13.5)，最大牌是 5 (数组下标1)，因为 A 在这里算小的逻辑
        if ($rank == 13.5) return $cards[1];
        return $cards[0];
    }

    private static function getKickers($cards, $excludeVals) {
        $res = [];
        foreach ($cards as $c) {
            if (!in_array($c['val'], $excludeVals)) $res[] = $c;
        }
        return $res;
    }
}
?>