<?php

class Card {
    public $suit; // H, D, C, S (Hearts, Diamonds, Clubs, Spades)
    public $rank; // 2-10, J, Q, K, A
    public $value; // 用于比较大小，A=14, K=13, Q=12, J=11, 10=10 ... 2=2
    public $suitValue; // H=4, D=3, C=2, S=1 (用于同花等比较花色)

    public function __construct($suit, $rank) {
        $this->suit = $suit;
        $this->rank = $rank;
        $rankValues = ['2'=>2, '3'=>3, '4'=>4, '5'=>5, '6'=>6, '7'=>7, '8'=>8, '9'=>9, 'T'=>10, 'J'=>11, 'Q'=>12, 'K'=>13, 'A'=>14];
        $this->value = $rankValues[strtoupper($rank)];

        $suitValues = ['S'=>1, 'C'=>2, 'D'=>3, 'H'=>4]; // 黑桃<梅花<方块<红桃 (可自定义)
        $this->suitValue = $suitValues[strtoupper($suit)];
    }

    public function toString() {
        return $this->rank . $this->suit;
    }
}

class GameLogic {
    const HAND_TYPE_HIGH_CARD = 1;
    const HAND_TYPE_PAIR = 2;
    const HAND_TYPE_TWO_PAIR = 3;
    const HAND_TYPE_THREE_OF_A_KIND = 4;
    const HAND_TYPE_STRAIGHT = 5;
    const HAND_TYPE_FLUSH = 6;
    const HAND_TYPE_FULL_HOUSE = 7;
    const HAND_TYPE_FOUR_OF_A_KIND = 8;
    const HAND_TYPE_STRAIGHT_FLUSH = 9;
    // ... 更多十三水特殊牌型

    // 特殊牌型分数 (示例)
    const SCORE_TONG_HUA_SHUN = 10; // 同花顺(尾墩)
    const SCORE_TIE_ZHI = 8;       // 铁支(尾墩)
    // ...

    private $deck = [];

    public function __construct() {
        $this->createDeck();
    }

    private function createDeck() {
        $this->deck = [];
        $suits = ['H', 'D', 'C', 'S'];
        $ranks = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
        foreach ($suits as $suit) {
            foreach ($ranks as $rank) {
                $this->deck[] = new Card($suit, $rank);
            }
        }
    }

    public function shuffleDeck() {
        shuffle($this->deck);
    }

    public function dealHand($numCards = 13) {
        return array_splice($this->deck, 0, $numCards);
    }

    // --- 核心牌型判断逻辑 ---
    // (这里仅作简化示例，真实十三水牌型判断非常复杂)

    private function sortCardsByValue(&$cards) {
        usort($cards, function($a, $b) {
            if ($a->value == $b->value) {
                return $a->suitValue < $b->suitValue ? 1 : -1;
            }
            return $a->value < $b->value ? 1 : -1;
        });
    }

    public function evaluateHand(array $cards) {
        $this->sortCardsByValue($cards);
        $n = count($cards);
        $values = array_map(function($c){ return $c->value; }, $cards);
        $suits = array_map(function($c){ return $c->suit; }, $cards);
        $rankCounts = array_count_values($values);
        arsort($rankCounts); // Sort by count, then by rank for tie-breaking pairs etc.

        $isFlush = count(array_unique($suits)) === 1;
        $isStraight = false;
        // Check for straight (A2345 and TJQKA)
        $uniqueValues = array_unique($values);
        sort($uniqueValues);
        if (count($uniqueValues) >= 5) { // Minimum for a 5-card straight
            $straightCheck = true;
            for ($i = 0; $i < count($uniqueValues) - 1; $i++) {
                if ($uniqueValues[$i+1] - $uniqueValues[$i] !== 1) {
                    $straightCheck = false;
                    break;
                }
            }
            if (!$straightCheck && count($uniqueValues) == 5 && $uniqueValues == [2,3,4,5,14]) { // A-5 Straight (A,2,3,4,5)
                $isStraight = true;
                // For A-5 straight, A is low, so primary rank is 5
                $values = [5,4,3,2,1]; // Adjust values for comparison
            } else {
                 $isStraight = $straightCheck;
            }
        }
         if (count($uniqueValues) == 3 && $n == 3) { // 3-card straight
            $straightCheck = true;
            for ($i = 0; $i < count($uniqueValues) - 1; $i++) {
                if ($uniqueValues[$i+1] - $uniqueValues[$i] !== 1) {
                    $straightCheck = false;
                    break;
                }
            }
             if (!$straightCheck && $uniqueValues == [2,3,14]) { // A-2-3 Straight
                $isStraight = true;
                $values = [3,2,1];
            } else {
                 $isStraight = $straightCheck;
            }
        }


        // Simplified Evaluation
        if ($isStraight && $isFlush) return ['type' => self::HAND_TYPE_STRAIGHT_FLUSH, 'name' => '同花顺', 'primary_rank' => $values[0], 'kickers' => $values];
        
        $rankCountsValues = array_values($rankCounts);
        $rankCountsKeys = array_keys($rankCounts);

        if (isset($rankCountsValues[0]) && $rankCountsValues[0] == 4) return ['type' => self::HAND_TYPE_FOUR_OF_A_KIND, 'name' => '铁支', 'primary_rank' => $rankCountsKeys[0], 'kickers' => $values];
        if (isset($rankCountsValues[0]) && $rankCountsValues[0] == 3 && isset($rankCountsValues[1]) && $rankCountsValues[1] >= 2) return ['type' => self::HAND_TYPE_FULL_HOUSE, 'name' => '葫芦', 'primary_rank' => $rankCountsKeys[0], 'secondary_rank' => $rankCountsKeys[1], 'kickers' => $values];
        if ($isFlush) return ['type' => self::HAND_TYPE_FLUSH, 'name' => '同花', 'primary_rank' => $values[0], 'kickers' => $values]; // Use all cards for flush tie-breaking
        if ($isStraight) return ['type' => self::HAND_TYPE_STRAIGHT, 'name' => '顺子', 'primary_rank' => $values[0], 'kickers' => $values];
        if (isset($rankCountsValues[0]) && $rankCountsValues[0] == 3) return ['type' => self::HAND_TYPE_THREE_OF_A_KIND, 'name' => '三条', 'primary_rank' => $rankCountsKeys[0], 'kickers' => $values];
        if (isset($rankCountsValues[0]) && $rankCountsValues[0] == 2 && isset($rankCountsValues[1]) && $rankCountsValues[1] == 2) return ['type' => self::HAND_TYPE_TWO_PAIR, 'name' => '两对', 'primary_rank' => $rankCountsKeys[0], 'secondary_rank' => $rankCountsKeys[1], 'kickers' => $values];
        if (isset($rankCountsValues[0]) && $rankCountsValues[0] == 2) return ['type' => self::HAND_TYPE_PAIR, 'name' => '对子', 'primary_rank' => $rankCountsKeys[0], 'kickers' => $values];
        
        return ['type' => self::HAND_TYPE_HIGH_CARD, 'name' => '散牌', 'primary_rank' => $values[0], 'kickers' => $values];
    }

    /**
     * 比较两个已评估的牌型
     * @return int 1 if hand1 > hand2, -1 if hand1 < hand2, 0 if equal
     */
    public function compareEvaluatedHands($eval1, $eval2) {
        if ($eval1['type'] !== $eval2['type']) {
            return $eval1['type'] > $eval2['type'] ? 1 : -1;
        }
        // 类型相同，比较主要点数
        if ($eval1['primary_rank'] !== $eval2['primary_rank']) {
            return $eval1['primary_rank'] > $eval2['primary_rank'] ? 1 : -1;
        }
        // 特殊处理两对和葫芦的次要点数
        if (in_array($eval1['type'], [self::HAND_TYPE_TWO_PAIR, self::HAND_TYPE_FULL_HOUSE])) {
            if ($eval1['secondary_rank'] !== $eval2['secondary_rank']) {
                return $eval1['secondary_rank'] > $eval2['secondary_rank'] ? 1 : -1;
            }
        }
        // 比较Kickers (从大到小)
        for ($i = 0; $i < count($eval1['kickers']); $i++) {
            if (!isset($eval2['kickers'][$i])) return 1; // hand1 has more kickers (should not happen with same hand type and primary/secondary ranks)
            if ($eval1['kickers'][$i] !== $eval2['kickers'][$i]) {
                return $eval1['kickers'][$i] > $eval2['kickers'][$i] ? 1 : -1;
            }
        }
        return 0; // 完全相同
    }

    /**
     * 验证玩家摆的三墩牌是否符合规则 (头道<=中道<=尾道)
     */
    public function validateArrangement($front, $middle, $back) {
        if (count($front) !== 3 || count($middle) !== 5 || count($back) !== 5) {
            return false; // 牌数不对
        }
        $evalFront = $this->evaluateHand($front);
        $evalMiddle = $this->evaluateHand($middle);
        $evalBack = $this->evaluateHand($back);

        // 中道不能小于头道
        if ($this->compareEvaluatedHands($evalMiddle, $evalFront) === -1) {
            return false;
        }
        // 尾道不能小于中道
        if ($this->compareEvaluatedHands($evalBack, $evalMiddle) === -1) {
            return false;
        }
        return true;
    }

    /**
     * 计算两组牌的得分
     * 返回 player1相对于player2的得分
     */
    public function calculateScores($player1Arrangement, $player2Arrangement) {
        $p1Score = 0;
        $isDaQiang = true; // 是否打枪

        // 假设 $player1Arrangement 和 $player2Arrangement 都是包含 'front', 'middle', 'back' 的数组，每个值是Card对象数组
        $p1EvalFront = $this->evaluateHand($player1Arrangement['front']);
        $p1EvalMiddle = $this->evaluateHand($player1Arrangement['middle']);
        $p1EvalBack = $this->evaluateHand($player1Arrangement['back']);

        $p2EvalFront = $this->evaluateHand($player2Arrangement['front']);
        $p2EvalMiddle = $this->evaluateHand($player2Arrangement['middle']);
        $p2EvalBack = $this->evaluateHand($player2Arrangement['back']);

        // 头道比牌
        $frontCompare = $this->compareEvaluatedHands($p1EvalFront, $p2EvalFront);
        if ($frontCompare === 1) $p1Score++; else if ($frontCompare === -1) { $p1Score--; $isDaQiang = false; } else { $isDaQiang = false; }

        // 中道比牌
        $middleCompare = $this->compareEvaluatedHands($p1EvalMiddle, $p2EvalMiddle);
        if ($middleCompare === 1) $p1Score++; else if ($middleCompare === -1) { $p1Score--; $isDaQiang = false; } else { $isDaQiang = false; }

        // 尾道比牌
        $backCompare = $this->compareEvaluatedHands($p1EvalBack, $p2EvalBack);
        if ($backCompare === 1) $p1Score++; else if ($backCompare === -1) { $p1Score--; $isDaQiang = false; } else { $isDaQiang = false; }

        // TODO: 实现特殊牌型加分逻辑
        // 例如：冲三 (头道三条) +3分, 中墩葫芦 +2分, 尾墩同花顺 +10分 等等

        if ($isDaQiang) {
            $p1Score *= 2; // 打枪翻倍 (简单示例)
        }

        return [
            'player1_score_change' => $p1Score,
            'player1_hands' => ['front' => $p1EvalFront, 'middle' => $p1EvalMiddle, 'back' => $p1EvalBack],
            'player2_hands' => ['front' => $p2EvalFront, 'middle' => $p2EvalMiddle, 'back' => $p2EvalBack],
            'comparisons' => ['front' => $frontCompare, 'middle' => $middleCompare, 'back' => $backCompare],
            'is_da_qiang' => $isDaQiang
        ];
    }

    // 辅助函数：将Card对象数组转换为纯数据数组，方便JSON序列化
    public static function cardsToSimpleArray(array $cards) {
        return array_map(function(Card $card) {
            return ['suit' => $card->suit, 'rank' => $card->rank, 'value' => $card->value];
        }, $cards);
    }

    public static function simpleArrayToCards(array $simpleCards) {
        return array_map(function($cardData) {
            return new Card($cardData['suit'], $cardData['rank']);
        }, $simpleCards);
    }
}
?>
