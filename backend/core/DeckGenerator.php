<?php
// backend/core/DeckGenerator.php

/**
 * 负责生成和预计算“十三水”游戏的牌局数据。
 * 包括生成随机牌组、提供多种AI理牌策略，并确保所有策略都符合“不倒水”规则。
 */
class DeckGenerator {
    
    // --- 牌型和对应分数 ---
    // 使用常量来定义牌型的基础分，方便比较和调整
    const SCORE_HIGH_CARD  = 100000;  // 乌龙（散牌）
    const SCORE_PAIR       = 200000;  // 一对
    const SCORE_TWO_PAIR   = 300000;  // 两对
    const SCORE_TRIPS      = 400000;  // 三条
    const SCORE_STRAIGHT   = 500000;  // 顺子
    const SCORE_FLUSH      = 600000;  // 同花
    const SCORE_FULL_HOUSE = 700000;  // 葫芦（三带二）
    const SCORE_QUADS      = 800000;  // 铁支（四条）
    const SCORE_SF         = 900000;  // 同花顺

    // 牌面值映射，用于比大小 (A最大)
    private static $rankMap = [
        '2'=>2, '3'=>3, '4'=>4, '5'=>5, '6'=>6, '7'=>7, '8'=>8, '9'=>9, '10'=>10, 
        'jack'=>11, 'queen'=>12, 'king'=>13, 'ace'=>14
    ];

    /**
     * 主函数：生成指定数量的牌局并存入数据库
     * @param PDO $pdo 数据库连接
     * @param int $count 要生成的牌局数量
     */
    public static function fill($pdo, $count) {
        $suits = ['spades', 'hearts', 'clubs', 'diamonds'];
        $ranks = ['2','3','4','5','6','7','8','9','10','jack','queen','king','ace'];
        
        $stmt = $pdo->prepare("INSERT INTO pre_decks (cards_json, solutions_json) VALUES (:cards, :solutions)");

        echo "正在使用【防倒水 AI】生成 $count 局...\n";

        for ($i = 0; $i < $count; $i++) {
            // 1. 生成一副打乱的牌
            $deck = [];
            foreach ($suits as $suit) {
                foreach ($ranks as $rank) {
                    $deck[] = [
                        'suit' => $suit, 
                        'rank' => $rank, 
                        'val'  => self::$rankMap[$rank], // 数值
                        'img'  => "{$rank}_of_{$suit}.svg" // 图片路径
                    ];
                }
            }
            shuffle($deck);

            // 2. 分成四手牌
            $hands = [
                array_slice($deck, 0, 13), 
                array_slice($deck, 13, 13), 
                array_slice($deck, 26, 13), 
                array_slice($deck, 39, 13)
            ];

            // 3. 为每一手牌生成多种理牌方案
            $solutions = [];
            foreach ($hands as $hand) {
                $solutions[] = self::getValidSolutions($hand);
            }

            // 4. 存入数据库
            $stmt->execute(['cards' => json_encode($hands), ':solutions' => json_encode($solutions)]);
            if (($i+1) % 20 == 0) echo ".";
        }
        echo "\n完成。\n";
    }

    /**
     * 为一手牌生成多种有效的理牌方案
     * @param array $hand 13张牌
     * @return array 包含多种策略的方案
     */
    private static function getValidSolutions($hand) {
        // 策略1: 进攻型 (Greedy)
        // 目标：优先凑出分数最高的牌型（如同花、铁支），放在能放的最大墩。
        $sol1 = self::solveGreedy($hand);
        $sol1['desc'] = "进攻型";

        // 策略2: 均衡型 (Balanced)
        // 目标：优先凑顺子和对子，尝试让三墩的牌力比较均衡。
        // 实现：先按牌值排序再用贪心算法，这样更容易找到顺子和对子组合。
        $handSort = $hand;
        usort($handSort, function($a, $b) { return $a['val'] - $b['val']; });
        $sol2 = self::solveGreedy($handSort); 
        $sol2['desc'] = "均衡型";

        // 策略3: 稳健防守型 (Safety)
        // 目标：绝对不倒水。优先把最大的牌组合放到尾墩，其次中墩，最后头墩。
        $sol3 = self::solveSafety($hand);
        $sol3['desc'] = "稳健防倒水";

        // 最后，对所有生成的方案进行强制“防倒水”修正，确保100%合规
        return [
            self::fixWater($sol1),
            self::fixWater($sol2),
            self::fixWater($sol3)
        ];
    }

    /**
     * 稳健防守策略 (Safety-first)
     * 从大到小依次填充尾、中、头墩，确保力量逐级递减。
     */
    private static function solveSafety($cards) {
        // 1. 在13张牌里找出最好的5张牌给尾墩 (Back)
        $bestBack = self::findBestHand($cards, 5);
        $back = $bestBack['cards'];
        $remain = self::diffCards($cards, $back); // 剩下8张

        // 2. 在剩下的8张牌里找出最好的5张牌给中墩 (Mid)
        $bestMid = self::findBestHand($remain, 5);
        $mid = $bestMid['cards'];
        $front = self::diffCards($remain, $mid); // 最后剩下的3张给头墩 (Front)

        return ['front' => array_values($front), 'mid' => array_values($mid), 'back' => array_values($back)];
    }

    /**
     * 贪心策略 (Greedy)
     * 寻找当前牌中能凑出的最大牌型，并以此为基础构建墩。
     */
    private static function solveGreedy($cards) {
        // 在十三水里，贪心策略和稳健策略的宏观思路是一致的：
        // 都是先找出最强的组合。因此，这里可以复用 solveSafety 的逻辑。
        // 更复杂的贪心可以考虑“把大牌放中墩以冲击特殊牌型”等，但目前的实现是通用且高效的。
        return self::solveSafety($cards);
    }

    /**
     * 强制“防倒水”修正
     * 检查并修正任何可能导致倒水的理牌方案。
     */
    private static function fixWater($sol) {
        // 计算三墩的分数
        $sF = self::getScore($sol['front']);
        $sM = self::getScore($sol['mid']);
        $sB = self::getScore($sol['back']);

        // 如果 中墩 > 尾墩，或者 头墩 > 中墩，就判定为倒水
        if ($sM > $sB || $sF > $sM) {
            // 倒水发生！启用终极保险措施：
            // 将13张牌全部合并，然后调用最安全的 solveSafety 算法重新理牌。
            // 这是最可靠的修正方法，确保结果绝对不会倒水。
            $allCards = array_merge($sol['front'], $sol['mid'], $sol['back']);
            return self::solveSafety($allCards);
        }

        // 如果没有倒水，直接返回原方案
        return $sol;
    }

    /**
     * 核心评分函数：计算一手牌的分数
     * @param array $cards 3张或5张牌
     * @return int 分数，由 (牌型基础分 + 牌型内最大牌的值) 构成
     */
    private static function getScore($cards) {
        usort($cards, function($a, $b) { return $b['val'] - $a['val']; }); // 从大到小排序
        $count = count($cards);
        $vals = array_column($cards, 'val');
        $highCardVal = $vals[0]; // 用于同牌型比大小

        // --- 头墩 (3张牌) ---
        if ($count == 3) {
            // 三条
            if ($vals[0] == $vals[1] && $vals[1] == $vals[2]) {
                return self::SCORE_TRIPS + $highCardVal;
            }
            // 对子
            if ($vals[0] == $vals[1] || $vals[1] == $vals[2]) {
                return self::SCORE_PAIR + ($vals[0] == $vals[1] ? $vals[0] : $vals[1]);
            }
            // 乌龙（散牌）
            return self::SCORE_HIGH_CARD + $highCardVal;
        }

        // --- 中/尾墩 (5张牌) ---
        if ($count != 5) return 0;

        // 检查同花
        $isFlush = count(array_unique(array_column($cards, 'suit'))) === 1;

        // 检查顺子 (包括 A-2-3-4-5 的特殊情况)
        $isStraight = false;
        $uniqueVals = array_unique($vals);
        if (count($uniqueVals) == 5) {
            if (($vals[0] - $vals[4]) == 4) { // 普通顺子，如 9-8-7-6-5
                $isStraight = true;
            } elseif (implode('', $vals) == '145432') { // A-2-3-4-5, 排序后是 14,5,4,3,2
                $isStraight = true;
                $highCardVal = 5; // A2345顺子以5为最大牌
            }
        }
        
        // 牌型判断
        if ($isStraight && $isFlush) return self::SCORE_SF + $highCardVal;
        if ($isFlush) return self::SCORE_FLUSH + $highCardVal;
        if ($isStraight) return self::SCORE_STRAIGHT + $highCardVal;

        // 统计牌值的出现次数，用于判断铁支、葫芦、对子等
        $counts = array_count_values($vals); // [牌值 => 数量]
        arsort($counts); // 按数量降序排
        
        $primaryCount = reset($counts); // 数量最多的牌有几张
        $primaryVal = key($counts);     // 对应的牌值

        if ($primaryCount == 4) return self::SCORE_QUADS + $primaryVal;
        if ($primaryCount == 3) {
            next($counts);
            if (current($counts) >= 2) return self::SCORE_FULL_HOUSE + $primaryVal;
            return self::SCORE_TRIPS + $primaryVal;
        }
        if ($primaryCount == 2) {
            next($counts);
            if (current($counts) == 2) return self::SCORE_TWO_PAIR + $primaryVal;
            return self::SCORE_PAIR + $primaryVal;
        }

        return self::SCORE_HIGH_CARD + $highCardVal;
    }

    /**
     * 从牌池中找出能组成的最佳N张牌组合
     * @param array $pool 牌池 (如13张手牌)
     * @param int $n 牌数 (通常是5)
     * @return array ['score' => 分数, 'cards' => 牌组]
     */
    private static function findBestHand($pool, $n) {
        $bestHand = ['score' => 0, 'cards' => []];
        if (count($pool) < $n) return $bestHand;

        // 生成所有可能的组合
        $combinations = self::getCombinations($pool, $n);

        // 遍历所有组合，找到分数最高的那一个
        foreach ($combinations as $combo) {
            $score = self::getScore($combo);
            if ($score > $bestHand['score']) {
                $bestHand['score'] = $score;
                $bestHand['cards'] = $combo;
            }
        }
        return $bestHand;
    }
    
    /**
     * 辅助函数：从数组中获取所有n个元素的组合
     * @param array $arr
     * @param int $n
     * @return Generator
     */
    private static function getCombinations($arr, $n) {
        $count = count($arr);
        if ($n > $count) yield [];
        if ($n == 0) yield [];
        
        if ($n == 1) {
            foreach ($arr as $item) {
                yield [$item];
            }
        } else {
            for ($i = 0; $i < $count - $n + 1; $i++) {
                $first = $arr[$i];
                $remaining = array_slice($arr, $i + 1);
                foreach (self::getCombinations($remaining, $n - 1) as $combo) {
                    yield array_merge([$first], $combo);
                }
            }
        }
    }


    /**
     * 辅助函数：计算两组牌的差集 (从$all中移除$sub)
     * @param array $all 全体牌
     * @param array $sub 要移除的牌
     * @return array 剩余的牌
     */
    private static function diffCards($all, $sub) {
        // 使用一个map来快速查找，比循环嵌套高效
        $subMap = [];
        foreach ($sub as $s) {
            $key = $s['suit'] . '_' . $s['rank'];
            $subMap[$key] = true;
        }

        $res = [];
        foreach ($all as $c) {
            $key = $c['suit'] . '_' . $c['rank'];
            if (!isset($subMap[$key])) {
                $res[] = $c;
            }
        }
        return $res;
    }
}
?>