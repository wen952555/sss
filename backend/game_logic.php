<?php
// backend/game_logic.php

class Shisanshui {
    private static $valueMap = ['2'=>2, '3'=>3, '4'=>4, '5'=>5, '6'=>6, '7'=>7, '8'=>8, '9'=>9, '10'=>10, 'jack'=>11, 'queen'=>12, 'king'=>13, 'ace'=>14];

    // 获取牌组的分值（简单粗暴用于理牌排序）
    public static function getHandScore($cards) {
        if (empty($cards)) return 0;
        $analysis = self::analyzeHand($cards);
        // 分值 = 等级 * 100 + 最高牌值
        $power = is_array($analysis['power']) ? max($analysis['power']) : $analysis['power'];
        return ($analysis['rank'] * 100) + $power;
    }

    public static function analyzeHand($cards) {
        $parsed = [];
        foreach ($cards as $c) {
            if (preg_match('/(.*)_of_(.*)\.svg/', $c, $m)) {
                $parsed[] = ['v' => self::$valueMap[$m[1]], 's' => $m[2]];
            }
        }
        usort($parsed, function($a, $b) { return $b['v'] - $a['v']; });
        
        $values = array_column($parsed, 'v');
        $suits = array_column($parsed, 's');
        $counts = array_count_values($values);
        arsort($counts);

        $isFlush = count(array_unique($suits)) === 1 && count($cards) >= 5;
        $isStraight = count($cards) >= 5 && (max($values) - min($values) === 4) && count(array_unique($values)) === 5;

        if ($isFlush && $isStraight) return ['rank' => 9, 'power' => max($values)];
        if (reset($counts) === 4) return ['rank' => 8, 'power' => key($counts)];
        if (reset($counts) === 3 && next($counts) === 2) return ['rank' => 7, 'power' => key($counts)];
        if ($isFlush) return ['rank' => 6, 'power' => $values];
        if ($isStraight) return ['rank' => 5, 'power' => max($values)];
        if (reset($counts) === 3) return ['rank' => 4, 'power' => key($counts)];
        if (reset($counts) === 2 && next($counts) === 2) return ['rank' => 3, 'power' => array_keys($counts)];
        if (reset($counts) === 2) return ['rank' => 2, 'power' => key($counts)];
        return ['rank' => 1, 'power' => $values];
    }
}