<?php
// backend/core/Logic.php

class GameLogic {
    /**
     * 生成 1-320 的随机乱序数组，截取前20个作为本场次任务
     */
    public static function generateDeckOrder() {
        // 创建 1 到 320 的数组
        $order = range(1, 320);
        // 打乱
        shuffle($order);
        // 返回前 20 个 ID
        return array_slice($order, 0, 20);
    }

    // 比牌算分逻辑 (简化版，完整版需要写很长)
    // 返回: 玩家相对于其他3人的总得分
    public static function calculateScore($playerHand, $opponentHands) {
        // $playerHand = {front:[], mid:[], back:[]}
        // 这里暂时写死用于测试流程，实际需要写比牌算法
        // 赢一墩得1分，输一墩扣1分
        $score = 0;
        foreach ($opponentHands as $opp) {
            // 模拟：50%概率输赢
            $score += (rand(0, 1) == 1) ? 1 : -1;
        }
        return $score;
    }
}
?>