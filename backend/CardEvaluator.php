<?php
class CardEvaluator {
    // 简单的相公校验：确保头道 <= 中道 <= 尾道 (基于牌型等级)
    // 注意：这里需要一套完整的牌型判断，先提供框架
    public static function isInvalid($head, $mid, $tail) {
        // 1. 校验张数
        if (count($head) != 3 || count($mid) != 5 || count($tail) != 5) return true;
        
        // 2. 校验牌是否重复（防作弊）
        $all = array_merge($head, $mid, $tail);
        if (count(array_unique($all)) != 13) return true;

        return false; // 暂时放行，实际应加入牌型强度比对
    }
}