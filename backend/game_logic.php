<?php
// backend/game_logic.php
class Shisanshui {
    // 牌值权重
    private static $weights = ['2'=>2, '3'=>3, '4'=>4, '5'=>5, '6'=>6, '7'=>7, '8'=>8, '9'=>9, '10'=>10, 'jack'=>11, 'queen'=>12, 'king'=>13, 'ace'=>14];

    public static function getHandRank($cards) {
        // 分析同花、顺子、对子数量等
        // 返回 rank: 9(同花顺), 8(四条)... 1(散牌)
    }

    public static function compare($handA, $handB) {
        // 比较两组牌的大小
    }
}