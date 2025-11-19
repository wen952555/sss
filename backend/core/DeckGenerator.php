<?php
// backend/core/DeckGenerator.php

class DeckGenerator {
    public static function fill($pdo, $count) {
        $suits = ['spades', 'hearts', 'clubs', 'diamonds'];
        $ranks = ['2','3','4','5','6','7','8','9','10','jack','queen','king','ace'];
        
        $stmt = $pdo->prepare("INSERT INTO pre_decks (cards_json, solutions_json) VALUES (:cards, :solutions)");

        for ($i = 0; $i < $count; $i++) {
            $deck = [];
            foreach ($suits as $suit) {
                foreach ($ranks as $rank) {
                    $deck[] = ['suit'=>$suit, 'rank'=>$rank, 'img'=>"{$rank}_of_{$suit}.svg"];
                }
            }
            shuffle($deck);

            $hands = [
                array_slice($deck, 0, 13),
                array_slice($deck, 13, 13),
                array_slice($deck, 26, 13),
                array_slice($deck, 39, 13)
            ];

            // 简单的模拟最优解 (同花顺/铁支/六对半)
            $solutions = [];
            foreach ($hands as $hand) {
                // 这里只是演示，实际可以做算法变体
                $solutions[] = [
                    ['front'=>array_slice($hand,0,3), 'mid'=>array_slice($hand,3,5), 'back'=>array_slice($hand,8,5), 'type'=>'推荐一'],
                    ['front'=>array_slice($hand,2,3), 'mid'=>array_slice($hand,7,5), 'back'=>array_slice($hand,0,5), 'type'=>'推荐二 (测试用)'], // 注意这里数组越界风险，仅示意
                    ['front'=>array_slice($hand,0,3), 'mid'=>array_slice($hand,3,5), 'back'=>array_slice($hand,8,5), 'type'=>'推荐三']
                ];
            }

            $stmt->execute([
                ':cards' => json_encode($hands),
                ':solutions' => json_encode($solutions)
            ]);
        }
    }
}
?>