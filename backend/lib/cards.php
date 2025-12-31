<?php
class Cards {
    // 扑克牌映射
    private static $cardMap = [
        '2' => 'two',
        '3' => 'three',
        '4' => 'four',
        '5' => 'five',
        '6' => 'six',
        '7' => 'seven',
        '8' => 'eight',
        '9' => 'nine',
        '10' => 'ten',
        'J' => 'jack',
        'Q' => 'queen',
        'K' => 'king',
        'A' => 'ace'
    ];

    private static $suitMap = [
        'S' => 'spades',    // 黑桃
        'H' => 'hearts',    // 红桃
        'D' => 'diamonds',  // 方块
        'C' => 'clubs'      // 梅花
    ];

    // 根据牌代码获取图片文件名
    public static function getCardImage($cardCode) {
        if ($cardCode === 'RJ') return 'red_joker.svg';
        if ($cardCode === 'BJ') return 'black_joker.svg';
        
        if (strlen($cardCode) === 2) {
            $suit = $cardCode[0]; // S, H, D, C
            $rank = $cardCode[1]; // 2-9, T, J, Q, K, A
        } elseif (strlen($cardCode) === 3) {
            $suit = $cardCode[0]; // S, H, D, C
            $rank = substr($cardCode, 1, 2); // 10
        } else {
            return 'card_back.svg';
        }
        
        // 转换10为ten
        if ($rank === 'T') $rank = '10';
        
        if (!isset(self::$suitMap[$suit]) || !isset(self::$cardMap[$rank])) {
            return 'card_back.svg';
        }
        
        $suitName = self::$suitMap[$suit];
        $rankName = self::$cardMap[$rank];
        
        return $rankName . '_of_' . $suitName . '.svg';
    }

    // 验证牌代码是否有效
    public static function isValidCard($cardCode) {
        if ($cardCode === 'RJ' || $cardCode === 'BJ') return true;
        
        if (strlen($cardCode) === 2) {
            $suit = $cardCode[0];
            $rank = $cardCode[1];
        } elseif (strlen($cardCode) === 3 && $cardCode[1] === '0') {
            $suit = $cardCode[0];
            $rank = 'T'; // 代表10
        } else {
            return false;
        }
        
        $validSuits = ['S', 'H', 'D', 'C'];
        $validRanks = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
        
        return in_array($suit, $validSuits) && in_array($rank, $validRanks);
    }

    // 获取所有牌列表
    public static function getAllCards() {
        $cards = [];
        
        // 普通牌
        $suits = ['S', 'H', 'D', 'C'];
        $ranks = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
        
        foreach ($suits as $suit) {
            foreach ($ranks as $rank) {
                $cardCode = $rank === 'T' ? $suit . '10' : $suit . $rank;
                $cards[] = $cardCode;
            }
        }
        
        // 大小王
        $cards[] = 'RJ';
        $cards[] = 'BJ';
        
        return $cards;
    }

    // 生成随机牌组
    public static function generateDeck($shuffle = true) {
        $deck = self::getAllCards();
        
        if ($shuffle) {
            shuffle($deck);
        }
        
        return $deck;
    }

    // 发牌（十三水每人13张）
    public static function dealCards($playerCount = 4) {
        if ($playerCount < 2 || $playerCount > 4) {
            return false;
        }
        
        $deck = self::generateDeck(true);
        $hands = [];
        
        // 十三水每人13张牌
        $cardsPerPlayer = 13;
        
        for ($i = 0; $i < $playerCount; $i++) {
            $hands[$i] = array_slice($deck, $i * $cardsPerPlayer, $cardsPerPlayer);
        }
        
        return $hands;
    }

    // 获取牌的点数（用于排序）
    public static function getCardValue($cardCode) {
        if ($cardCode === 'RJ') return 53; // 大王最大
        if ($cardCode === 'BJ') return 52; // 小王次之
        
        $rank = strlen($cardCode) === 2 ? $cardCode[1] : substr($cardCode, 1, 2);
        if ($rank === '10' || $rank === 'T') $rank = 'T';
        
        $values = [
            '2' => 2, '3' => 3, '4' => 4, '5' => 5, '6' => 6,
            '7' => 7, '8' => 8, '9' => 9, 'T' => 10,
            'J' => 11, 'Q' => 12, 'K' => 13, 'A' => 14
        ];
        
        return isset($values[$rank]) ? $values[$rank] : 0;
    }

    // 按点数排序牌
    public static function sortCards($cards, $descending = true) {
        usort($cards, function($a, $b) use ($descending) {
            $valueA = self::getCardValue($a);
            $valueB = self::getCardValue($b);
            
            if ($descending) {
                return $valueB - $valueA;
            } else {
                return $valueA - $valueB;
            }
        });
        
        return $cards;
    }
}
?>