<?php
/**
 * 智能理牌模块 (Level 1: 基础版)
 * @param array $cards 13张牌的数组
 * @return array 理好的三墩牌
 */
function get_ai_sorted_cards(array $cards) {
    // TODO: 实现基础的智能理牌算法
    // 1. 识别所有可能的牌型组合
    // 2. 贪心算法：优先把最大的牌型放入尾道，次大的放入中道
    // 3. 确保最终结果符合 头 < 中 < 尾 的规则
    
    // 这是一个非常简化的占位实现
    return [
        'front' => array_slice($cards, 0, 3),
        'middle' => array_slice($cards, 3, 5),
        'back' => array_slice($cards, 8, 5)
    ];
}
?>