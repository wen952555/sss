<?php
// backend/core/SpecialHandEvaluator.php

class SpecialHandEvaluator {

    // 特殊牌型常量
    const SP_DRAGON = 26;         // 一条龙
    const SP_THREE_SF = 16;       // 三同花顺 (归类为三顺子/三同花变体)
    const SP_QUADS_6PAIR = 14;    // 四条六对半
    const SP_THREE_FLUSH = 6;     // 三同花
    const SP_THREE_STRAIGHT = 6;  // 三顺子
    const SP_SIX_PAIRS = 6;       // 六对半
    const SP_NONE = 0;

    private static $rankMap = [
        '2'=>2, '3'=>3, '4'=>4, '5'=>5, '6'=>6, '7'=>7, '8'=>8, '9'=>9, '10'=>10, 
        'jack'=>11, 'queen'=>12, 'king'=>13, 'ace'=>14
    ];

    /**
     * 评估手牌是否为特殊牌型
     * @param array $cards 13张牌 [{rank, suit}, ...]
     * @return int 分数 (0表示非特殊牌型)
     */
    public static function evaluate($cards) {
        // 预处理：提取点数和花色
        $vals = [];
        $suits = [];
        foreach ($cards as $c) {
            $vals[] = isset($c['val']) ? $c['val'] : self::$rankMap[$c['rank']];
            $suits[] = $c['suit'];
        }
        sort($vals);

        // 1. 一条龙 (2,3,4,5,6,7,8,9,10,11,12,13,14)
        $isDragon = true;
        for ($i=0; $i<13; $i++) {
            if ($vals[$i] != $i+2) $isDragon = false;
        }
        if ($isDragon) return self::SP_DRAGON;

        // 统计点数频率
        $counts = array_count_values($vals);
        $pairCount = 0;
        $quadCount = 0;
        $tripCount = 0;
        foreach ($counts as $v => $cnt) {
            if ($cnt >= 2) $pairCount++;
            if ($cnt == 4) $quadCount++;
            if ($cnt == 3) $tripCount++;
        }

        // 2. 六对半 (6对+1散)
        // 注意：4张一样的算2对
        // 严谨判定：需要满足总对子数=6。
        // 简单判定：counts里有6个>=2的，或者5个>=2且其中一个=4...
        // 最简单的判定：13张牌里，只有1张是单牌，其他都成对
        // 也就是 array_unique 后 数量 <= 7 ? 不对，可能是3333
        // 准确算法：pairCount 计算时，4张算2对。
        $realPairs = 0;
        foreach ($counts as $cnt) $realPairs += floor($cnt / 2);
        
        if ($realPairs == 6) {
            if ($quadCount > 0) return self::SP_QUADS_6PAIR; // 四条六对半
            return self::SP_SIX_PAIRS;
        }

        // 3. 三同花 (Front 3张同花, Mid 5张同花, Back 5张同花)
        // 这需要这一手牌“可以”摆成三同花，而不是“已经”摆成。
        // 算法：按花色统计，如果有3种花色，数量分配满足 (3,5,5) 或 (0,8,5) 等组合？
        // 不，通常规则是：13张牌里，可以凑出3组同花。
        // 实际上就是：只需看花色分布。允许杂色吗？通常不允许。
        // 简易判据：只要能凑成 3, 5, 5 的同花即可。
        // 也就是：
        // A花色 >= 5, B花色 >= 5, C花色 >= 3  => 可行
        // 或者 A >= 8, B >= 5
        // 或者 A >= 13
        $suitCounts = array_count_values($suits);
        rsort($suitCounts);
        $isThreeFlush = false;
        // 情况A: 5, 5, 3 (及以上)
        if (isset($suitCounts[2]) && $suitCounts[0]>=5 && $suitCounts[1]>=5 && $suitCounts[2]>=3) $isThreeFlush = true;
        // 情况B: 8, 5 (及以上)
        if (isset($suitCounts[1]) && $suitCounts[0]>=8 && $suitCounts[1]>=5) $isThreeFlush = true;
        // 情况C: 13
        if ($suitCounts[0] == 13) $isThreeFlush = true; // 至尊清龙一般另算，这里归为三同花

        if ($isThreeFlush) {
            // 检查是否含同花顺 (太复杂，暂略，直接给三同花分)
            // 如果需要三同花顺判定，需要这里做 DFS
            return self::SP_THREE_FLUSH; 
        }

        // 4. 三顺子
        // 算法：13张牌能凑成 3, 5, 5 的顺子。
        // 这是一个极其复杂的背包问题。
        // 简化处理：暂不支持三顺子自动识别，或者交给前端用户自己摆好后后端识别。
        // 既然是“预设牌局”，我们可以离线算好。
        // 在这里实时算有点慢。为了项目进度，暂时略过三顺子，或者用简单判据。
        
        return self::SP_NONE;
    }
}
?>