<?php
/* backend/lib/CardLogic.php */

class CardLogic {
    // 公共方法：检查牌面是否有效（是否相公）
    public static function isXiangGong($head, $mid, $tail) {
        if (count($head) !== 3 || count($mid) !== 5 || count($tail) !== 5) {
            return true; // 墩数错误
        }

        $allCards = array_merge($head, $mid, $tail);
        if (count(array_unique($allCards)) !== 13) {
            return true; // 有重复的牌
        }

        // 比较大小：尾墩 > 中墩 > 头墩
        if (self::compareHands($mid, $tail) > 0) {
            return true; // 中墩比尾墩大
        }
        if (self::compareHands($head, $mid) > 0) {
            return true; // 头墩比中墩大
        }

        return false; // 牌型有效
    }

    // 比较两手牌的大小
    public static function compareHands($handA, $handB) {
        $typeA = self::getHandType($handA);
        $typeB = self::getHandType($handB);

        if ($typeA['type'] !== $typeB['type']) {
            return $typeA['type'] - $typeB['type'];
        }

        // 类型相同，则比较牌的点数
        for ($i = 0; $i < count($typeA['ranks']); $i++) {
            if ($typeA['ranks'][$i] !== $typeB['ranks'][$i]) {
                return $typeA['ranks'][$i] - $typeB['ranks'][$i];
            }
        }
        return 0; // 完全相同
    }

    // 获取一手牌的牌型和用于比较的点数
    public static function getHandType($hand) {
        if (count($hand) === 3) {
            return self::getHeadType($hand);
        } elseif (count($hand) === 5) {
            return self::getMidTailType($hand);
        }
        return ['type' => 0, 'ranks' => []]; // 不应该发生
    }

    // 辅助函数：获取已排序的点数数组 (A最大)
    private static function getSortedRanks($hand) {
        $ranks = array_map(function($c) { return ($c - 1) % 13; }, $hand); // 2->0, A->12
        rsort($ranks);
        return $ranks;
    }

    // 辅助函数：判断是否为顺子，并处理A-2-3-4-5的特殊情况
    private static function isStraight(&$ranks) { // 注意：引用传递
        // A-2-3-4-5 (12, 3, 2, 1, 0)
        if ($ranks === [12, 3, 2, 1, 0]) {
            $ranks = [3, 2, 1, 0, -1]; // 将A视为最小, 用于比较
            return true;
        }
        // 普通顺子
        for ($i = 0; $i < count($ranks) - 1; $i++) {
            if ($ranks[$i] !== $ranks[$i+1] + 1) {
                return false;
            }
        }
        return true;
    }

    // 获取头墩（3张）的牌型
    private static function getHeadType($hand) {
        $ranks = self::getSortedRanks($hand);
        $rankCounts = array_count_values($ranks);

        // 冲三 (三条)
        if (in_array(3, $rankCounts)) return ['type' => 4, 'ranks' => $ranks];
        // 对子
        if (in_array(2, $rankCounts)) {
            $pairRank = array_search(2, $rankCounts);
            $kicker = array_search(1, $rankCounts);
            return ['type' => 2, 'ranks' => [$pairRank, $kicker]];
        }
        // 散牌
        return ['type' => 1, 'ranks' => $ranks];
    }
    
    // 获取中墩/尾墩（5张）的牌型
    private static function getMidTailType($hand) {
        $ranks = self::getSortedRanks($hand);
        $suits = array_map(function($c) { return floor(($c - 1) / 13); }, $hand);
        
        $rankCounts = array_count_values($ranks);
        $isFlush = count(array_unique($suits)) === 1;
        
        $straightRanks = $ranks;
        $isStraight = self::isStraight($straightRanks);

        if ($isFlush && $isStraight) return ['type' => 9, 'ranks' => $straightRanks]; // 同花顺
        if (in_array(4, $rankCounts)) { // 铁支
            $quadRank = array_search(4, $rankCounts);
            $kicker = array_search(1, $rankCounts);
            return ['type' => 8, 'ranks' => [$quadRank, $kicker]];
        }
        if (in_array(3, $rankCounts) && in_array(2, $rankCounts)) { // 葫芦
            $tripleRank = array_search(3, $rankCounts);
            $pairRank = array_search(2, $rankCounts);
            return ['type' => 7, 'ranks' => [$tripleRank, $pairRank]];
        }
        if ($isFlush) return ['type' => 6, 'ranks' => $ranks]; // 同花
        if ($isStraight) return ['type' => 5, 'ranks' => $straightRanks]; // 顺子
        if (in_array(3, $rankCounts)) { // 三条
            $tripleRank = array_search(3, $rankCounts);
            $kickers = [];
            foreach($ranks as $r) if($r !== $tripleRank) $kickers[] = $r;
            return ['type' => 4, 'ranks' => array_merge([$tripleRank], $kickers)];
        }
        if (count($rankCounts) === 3) { // 两对
            $pairs = []; $kicker = -1;
            foreach($rankCounts as $rank => $count) {
                if($count == 2) $pairs[] = $rank; else $kicker = $rank;
            }
            rsort($pairs);
            return ['type' => 3, 'ranks' => array_merge($pairs, [$kicker])];
        }
        if (count($rankCounts) === 4) { // 对子
            $pairRank = array_search(2, $rankCounts);
            $kickers = [];
            foreach($ranks as $r) if($r !== $pairRank) $kickers[] = $r;
            return ['type' => 2, 'ranks' => array_merge([$pairRank], $kickers)];
        }
        return ['type' => 1, 'ranks' => $ranks]; // 散牌
    }
}
