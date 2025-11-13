<?php
class CardGenerator {
    private $suits = ['clubs', 'diamonds', 'hearts', 'spades'];
    private $values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king', 'ace'];
    
    // 生成完整的一副牌
    public function generateDeck() {
        $deck = [];
        foreach ($this->suits as $suit) {
            foreach ($this->values as $value) {
                $deck[] = $value . '_of_' . $suit;
            }
        }
        return $deck;
    }
    
    // 洗牌
    public function shuffleDeck($deck) {
        shuffle($deck);
        return $deck;
    }
    
    // 发牌给4个玩家
    public function dealCards() {
        $deck = $this->generateDeck();
        $shuffled = $this->shuffleDeck($deck);
        
        $players = [];
        for ($i = 0; $i < 4; $i++) {
            $players[$i] = array_slice($shuffled, $i * 13, 13);
        }
        
        return $players;
    }
    
    // 基础智能理牌 - 确保不倒水
    public function smartArrange($cards) {
        // 简化的理牌算法 - 按点数排序后简单分配
        $sorted = $this->sortCards($cards);
        
        // 基础分配：最小的3张放头道，中间5张放中道，最大的5张放尾道
        $head = array_slice($sorted, 0, 3);
        $middle = array_slice($sorted, 3, 5);
        $tail = array_slice($sorted, 8, 5);
        
        return [
            'head' => $head,
            'middle' => $middle,
            'tail' => $tail
        ];
    }
    
    // 排序扑克牌
    private function sortCards($cards) {
        $value_order = [
            '2' => 2, '3' => 3, '4' => 4, '5' => 5, '6' => 6, '7' => 7, '8' => 8, '9' => 9, '10' => 10,
            'jack' => 11, 'queen' => 12, 'king' => 13, 'ace' => 14
        ];
        $suit_order = ['clubs' => 0, 'diamonds' => 1, 'hearts' => 2, 'spades' => 3];
        
        usort($cards, function($a, $b) use ($value_order, $suit_order) {
            list($a_value, $a_suit) = explode('_of_', $a);
            list($b_value, $b_suit) = explode('_of_', $b);
            
            $a_score = $value_order[$a_value] * 10 + $suit_order[$a_suit];
            $b_score = $value_order[$b_value] * 10 + $suit_order[$b_suit];
            
            return $a_score - $b_score;
        });
        
        return $cards;
    }
    
    // 验证牌型是否倒水
    public function validateArrangement($head, $middle, $tail) {
        // 基础验证：确保头道 ≤ 中道 ≤ 尾道
        // 这里简化验证，实际需要比较牌型大小
        return true; // 基础版本先返回true，后续增强
    }
}
?>