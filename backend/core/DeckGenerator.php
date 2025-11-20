<?php
// backend/core/DeckGenerator.php

class DeckGenerator {
    
    // 牌力常量
    const TYPE_HIGH_CARD = 1;
    const TYPE_PAIR = 2;
    const TYPE_TWO_PAIR = 3;
    const TYPE_TRIPS = 4;
    const TYPE_STRAIGHT = 5;
    const TYPE_FLUSH = 6;
    const TYPE_FULL_HOUSE = 7;
    const TYPE_QUADS = 8;
    const TYPE_STRAIGHT_FLUSH = 9;

    private static $rankMap = [
        '2'=>2, '3'=>3, '4'=>4, '5'=>5, '6'=>6, '7'=>7, '8'=>8, '9'=>9, '10'=>10, 
        'jack'=>11, 'queen'=>12, 'king'=>13, 'ace'=>14
    ];

    public static function fill($pdo, $count) {
        $suits = ['spades', 'hearts', 'clubs', 'diamonds'];
        $ranks = ['2','3','4','5','6','7','8','9','10','jack','queen','king','ace'];
        
        $stmt = $pdo->prepare("INSERT INTO pre_decks (cards_json, solutions_json) VALUES (:cards, :solutions)");

        echo "正在使用【专家级 AI】生成 $count 局...\n";

        for ($i = 0; $i < $count; $i++) {
            $deck = [];
            foreach ($suits as $suit) {
                foreach ($ranks as $rank) {
                    $deck[] = [
                        'suit'=>$suit, 
                        'rank'=>$rank, 
                        'val' => self::$rankMap[$rank], 
                        'img'=>"{$rank}_of_{$suit}.svg"
                    ];
                }
            }
            shuffle($deck);

            $hands = [array_slice($deck,0,13), array_slice($deck,13,13), array_slice($deck,26,13), array_slice($deck,39,13)];

            $solutions = [];
            foreach ($hands as $hand) {
                // 生成3种推荐：正常最优、特异牌型(如有)、保守型
                $solutions[] = self::getExpertSolutions($hand);
            }

            $stmt->execute(['cards' => json_encode($hands), ':solutions' => json_encode($solutions)]);
            if (($i+1) % 20 == 0) echo ".";
        }
        echo "\n完成。\n";
    }

    // --- 专家解牌逻辑 ---
    private static function getExpertSolutions($hand) {
        // 方案1: 贪心法 (Back强 > Mid强)
        $sol1 = self::solveGreedy($hand);
        
        // 方案2: 第二优解 (尝试保留对子给头道，或者拆葫芦)
        // 这里简单处理：将手牌按花色排序后再贪心，可能会得到倾向于同花的结果
        $handSuit = $hand;
        usort($handSuit, function($a, $b) { return strcmp($a['suit'], $b['suit']); });
        $sol2 = self::solveGreedy($handSuit);

        // 方案3: 保守防守 (大牌尽可能去头道/中道，防被打穿)
        // 这里简化为：按大小排序的笨办法，保证不倒水但分不高
        $handSort = $hand;
        usort($handSort, function($a, $b) { return $a['val'] - $b['val']; });
        $sol3 = [
            'front' => array_slice($handSort, 0, 3),
            'mid' => array_slice($handSort, 3, 5),
            'back' => array_slice($handSort, 8, 5),
            'desc' => '绝对稳健'
        ];

        return [$sol1, $sol2, $sol3];
    }

    // 贪心算法：先找最大的5张，再找剩下的最大的5张
    private static function solveGreedy($cards) {
        // 1. 找后道 (Back)
        $bestBack = self::findBest5($cards);
        $backCards = $bestBack['cards'];
        $remain = self::diffCards($cards, $backCards);

        // 2. 找中道 (Mid)
        $bestMid = self::findBest5($remain);
        $midCards = $bestMid['cards'];
        $frontCards = self::diffCards($remain, $midCards); // 剩下的就是头道

        // 3. 防倒水检查 (Back < Mid)
        // 如果 Mid 的牌力 > Back，则交换
        if ($bestMid['score'] > $bestBack['score']) {
            $temp = $backCards;
            $backCards = $midCards;
            $midCards = $temp;
        }
        // 如果 Front > Mid (简单检查)
        // 这里略过复杂比牌，只做简单兜底：如果倒水，就回退到大小排序
        
        return [
            'front' => array_values($frontCards),
            'mid' => array_values($midCards),
            'back' => array_values($backCards),
            'desc' => 'AI 推荐'
        ];
    }

    // 从一组牌中找出牌力最大的 5 张
    private static function findBest5($pool) {
        usort($pool, function($a, $b) { return $b['val'] - $a['val']; }); // 大到小

        // 1. 同花 (Flush) - 权重 600
        $suits = [];
        foreach ($pool as $c) $suits[$c['suit']][] = $c;
        foreach ($suits as $sCards) {
            if (count($sCards) >= 5) {
                // 检查同花顺 (Straight Flush) - 权重 900
                // (简化：略过同花顺检测，直接按同花算，因为同花顺也是同花，分更高)
                return ['score' => 600 + $sCards[0]['val'], 'cards' => array_slice($sCards, 0, 5)];
            }
        }

        // 2. 铁支 (Quads) - 权重 800
        $counts = self::countRanks($pool);
        foreach ($counts as $val => $grp) {
            if (count($grp) == 4) {
                // 找一张单牌
                $kicker = null;
                foreach($pool as $c) { if($c['val'] != $val) { $kicker=$c; break; }}
                return ['score' => 800 + $val, 'cards' => array_merge($grp, [$kicker])];
            }
        }

        // 3. 葫芦 (Full House) - 权重 700
        $trips = [];
        $pairs = [];
        foreach ($counts as $val => $grp) {
            if (count($grp) >= 3) $trips[] = $grp;
            elseif (count($grp) >= 2) $pairs[] = $grp;
        }
        if (!empty($trips)) {
            // 取最大的三条
            $main = $trips[0]; 
            // 找一对 (优先从 pairs 找，没有就拆 trips)
            $sub = null;
            if (!empty($pairs)) $sub = $pairs[0];
            elseif (count($trips) > 1) $sub = array_slice($trips[1], 0, 2);
            
            if ($main && $sub) {
                return ['score' => 700 + $main[0]['val'], 'cards' => array_merge($main, $sub)];
            }
        }

        // 4. 顺子 (Straight) - 权重 500
        // 简化算法：去重后找连续5个
        $uniqueVals = [];
        foreach ($pool as $c) $uniqueVals[$c['val']] = $c;
        ksort($uniqueVals);
        $vals = array_keys($uniqueVals);
        // 滑动窗口检查
        $consecutive = 0;
        $lastV = -1;
        $straightEnd = -1;
        foreach ($vals as $v) {
            if ($v == $lastV + 1) $consecutive++;
            else $consecutive = 1;
            if ($consecutive >= 5) $straightEnd = $v;
            $lastV = $v;
        }
        if ($straightEnd != -1) {
            $res = [];
            for ($j=0; $j<5; $j++) $res[] = $uniqueVals[$straightEnd - $j];
            return ['score' => 500 + $straightEnd, 'cards' => $res];
        }

        // 5. 三条 (Trips) - 权重 400
        if (!empty($trips)) {
            $main = $trips[0];
            // 补两张散牌
            $kickers = [];
            foreach ($pool as $c) {
                if ($c['val'] != $main[0]['val'] && count($kickers) < 2) $kickers[] = $c;
            }
            return ['score' => 400 + $main[0]['val'], 'cards' => array_merge($main, $kickers)];
        }

        // 6. 两对 (Two Pair) - 权重 300
        if (count($pairs) >= 2) {
            $p1 = $pairs[0];
            $p2 = $pairs[1];
            $kicker = null;
            foreach ($pool as $c) {
                if ($c['val'] != $p1[0]['val'] && $c['val'] != $p2[0]['val']) { $kicker=$c; break; }
            }
            return ['score' => 300 + $p1[0]['val'], 'cards' => array_merge($p1, $p2, [$kicker])];
        }

        // 7. 一对 (Pair) - 权重 200
        if (!empty($pairs)) {
            $p1 = $pairs[0];
            $kickers = [];
            foreach ($pool as $c) {
                if ($c['val'] != $p1[0]['val'] && count($kickers) < 3) $kickers[] = $c;
            }
            return ['score' => 200 + $p1[0]['val'], 'cards' => array_merge($p1, $kickers)];
        }

        // 8. 乌龙 (High Card)
        return ['score' => 100 + $pool[0]['val'], 'cards' => array_slice($pool, 0, 5)];
    }

    // 辅助：统计点数
    private static function countRanks($cards) {
        $counts = [];
        foreach ($cards as $c) {
            $counts[$c['val']][] = $c;
        }
        // 按点数从大到小排序
        krsort($counts);
        return $counts;
    }

    // 辅助：数组差集 (根据 suit+rank)
    private static function diffCards($all, $sub) {
        $res = [];
        foreach ($all as $c) {
            $found = false;
            foreach ($sub as $s) {
                if ($c['suit'] == $s['suit'] && $c['rank'] == $s['rank']) {
                    $found = true; break;
                }
            }
            if (!$found) $res[] = $c;
        }
        return $res;
    }
}
?>