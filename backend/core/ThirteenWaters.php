<?php

// 卡牌类 (保持英文)
class Card {
    public $suit; // 花色 (用于图片名: clubs, spades, diamonds, hearts)
    public $rank; // 点数 (用于图片名: ace, king, ..., 2)

    public $suitInternal; // 内部逻辑用花色 (S, H, D, C)
    public $rankInternal; // 内部逻辑用点数 (A, K, ..., 2)

    private static $rankMapToImage = [
        'A' => 'ace', 'K' => 'king', 'Q' => 'queen', 'J' => 'jack',
        'T' => '10', '9' => '9', '8' => '8', '7' => '7',
        '6' => '6', '5' => '5', '4' => '4', '3' => '3', '2' => '2'
    ];
    private static $suitMapToImage = [
        'S' => 'spades', 'H' => 'hearts', 'D' => 'diamonds', 'C' => 'clubs'
    ];

    private static $rankMapFromImage = [];
    private static $suitMapFromImage = [];

    const RANK_ORDER = ['2'=>2, '3'=>3, '4'=>4, '5'=>5, '6'=>6, '7'=>7, '8'=>8, '9'=>9, 'T'=>10, 'J'=>11, 'Q'=>12, 'K'=>13, 'A'=>14];
    const SUIT_ORDER = ['C'=>1, 'D'=>2, 'H'=>3, 'S'=>4]; // 示例: 梅花<方块<红桃<黑桃 (比花色时用)

    public function __construct($internalSuit, $internalRank) {
        // ... (构造函数代码与之前版本相同，此处省略以减少篇幅)
        if (empty(self::$rankMapFromImage)) {
            self::$rankMapFromImage = array_flip(self::$rankMapToImage);
            self::$suitMapFromImage = array_flip(self::$suitMapToImage);
        }
        if (!isset(self::$suitMapToImage[$internalSuit]) || !isset(self::$rankMapToImage[$internalRank])) {
            throw new InvalidArgumentException("无效的内部卡牌花色或点数: {$internalSuit}{$internalRank}");
        }
        if (!isset(self::RANK_ORDER[$internalRank]) || !isset(self::SUIT_ORDER[$internalSuit])) {
            throw new InvalidArgumentException("无效的内部卡牌值用于排序: {$internalSuit}{$internalRank}");
        }
        $this->suitInternal = $internalSuit;
        $this->rankInternal = $internalRank;
        $this->suit = self::$suitMapToImage[$internalSuit];
        $this->rank = self::$rankMapToImage[$internalRank];
    }

    public static function fromImageString(string $imageString): ?Card {
        // ... (fromImageString 代码与之前版本相同)
        if (empty(self::$rankMapFromImage)) {
            self::$rankMapFromImage = array_flip(self::$rankMapToImage);
            self::$suitMapFromImage = array_flip(self::$suitMapToImage);
        }
        $parts = explode('_', $imageString);
        if (count($parts) !== 2) return null;
        $suitStr = $parts[0]; $rankStr = $parts[1];
        if (!isset(self::$suitMapFromImage[$suitStr]) || !isset(self::$rankMapFromImage[$rankStr])) return null;
        return new Card(self::$suitMapFromImage[$suitStr], self::$rankMapFromImage[$rankStr]);
    }

    public function toStringForImage() { return $this->suit . '_' . $this->rank; }
    public function getRankValue(): int { return self::RANK_ORDER[$this->rankInternal]; }
    public function getSuitValue(): int { return self::SUIT_ORDER[$this->suitInternal]; }
    public function compareTo(Card $otherCard): int {
        $rankDiff = $this->getRankValue() - $otherCard->getRankValue();
        if ($rankDiff !== 0) return $rankDiff;
        return $this->getSuitValue() - $otherCard->getSuitValue();
    }
    public function equals(Card $otherCard): bool {
        return $this->suitInternal === $otherCard->suitInternal && $this->rankInternal === $otherCard->rankInternal;
    }
}

// 扑克牌型评估器 (保持英文类名)
class PokerHandEvaluator {
    // 牌型常量，值越大牌型越大
    const HIGH_CARD = 1;        // 乌龙 (散牌)
    const PAIR = 2;             // 一对 (对子)
    const TWO_PAIR = 3;         // 两对
    const THREE_OF_A_KIND = 4;  // 三条
    const STRAIGHT = 5;         // 顺子
    const FLUSH = 6;            // 同花
    const FULL_HOUSE = 7;       // 葫芦 (三带二)
    const FOUR_OF_A_KIND = 8;   // 铁支 (四条)
    const STRAIGHT_FLUSH = 9;   // 同花顺

    // 十三水特殊牌型 (可以有更高的值，或者在计分时单独处理)
    // 注意：这些特殊牌型通常是针对整副13张牌的，而不是单墩。
    // 这里为了简化，暂时不直接集成到单墩比较中，而是在 `ThirteenWaters` 类中检查。
    // const SPECIAL_THIRTEEN_FLUSH = 10; // 至尊清龙 (同花十三水)
    // const SPECIAL_THIRTEEN_STRAIGHT = 11; // 一条龙 (十三水)
    // const SPECIAL_THREE_STRAIGHT_FLUSHES = 12; // 三同花顺
    // ... 更多特殊牌型

    public static $handTypeNames = [
        self::HIGH_CARD => '乌龙',
        self::PAIR => '对子',
        self::TWO_PAIR => '两对',
        self::THREE_OF_A_KIND => '三条',
        self::STRAIGHT => '顺子',
        self::FLUSH => '同花',
        self::FULL_HOUSE => '葫芦',
        self::FOUR_OF_A_KIND => '铁支',
        self::STRAIGHT_FLUSH => '同花顺',
    ];

    /**
     * 评估一手牌 (3张或5张)
     * @param Card[] $cards
     * @return array ['type' => int, 'name' => string, 'ranks' => int[], 'hand_cards' => Card[]]
     * 'ranks' 用于比大小，从最主要的牌开始。
     */
    public static function evaluateHand(array $cards): array {
        if (empty($cards) || (count($cards) !== 3 && count($cards) !== 5)) { // 必须是3张或5张
            return ['type' => 0, 'name' => '无效牌数', 'ranks' => [], 'hand_cards' => []];
        }

        usort($cards, function(Card $a, Card $b) { // 按点数降序排列
            return $b->getRankValue() - $a->getRankValue();
        });

        $rankCounts = []; // [rankValue => count]
        $suitInternalToCards = []; // [suitInternal => Card[]]
        $rankValues = [];

        foreach ($cards as $card) {
            $rankVal = $card->getRankValue();
            $suitInt = $card->suitInternal;
            $rankCounts[$rankVal] = ($rankCounts[$rankVal] ?? 0) + 1;
            $suitInternalToCards[$suitInt][] = $card;
            $rankValues[] = $rankVal;
        }
        arsort($rankCounts); // 按数量降序，再按点数降序

        $isFlush = false;
        if (count($suitInternalToCards) === 1 && count(current($suitInternalToCards)) === count($cards)) {
            $isFlush = true;
        }

        $isStraight = false;
        $uniqueSortedRanksAsc = array_unique($rankValues);
        sort($uniqueSortedRanksAsc); // 点数升序排列

        if (count($uniqueSortedRanksAsc) === count($cards)) { // 没有重复点数才可能是顺子
            if (count($cards) === 5) { // 5张牌的顺子
                if ($uniqueSortedRanksAsc[4] - $uniqueSortedRanksAsc[0] === 4) { // 普通顺子 10-J-Q-K-A 或 6-7-8-9-10
                    $isStraight = true;
                } elseif ($uniqueSortedRanksAsc == [Card::RANK_ORDER['2'], Card::RANK_ORDER['3'], Card::RANK_ORDER['4'], Card::RANK_ORDER['5'], Card::RANK_ORDER['A']]) { // A-2-3-4-5 顺子
                    $isStraight = true;
                    // 对于A2345顺子，比较时以5为最大，A算1。ranks需要特殊处理
                    $rankValues = [Card::RANK_ORDER['5'], Card::RANK_ORDER['4'], Card::RANK_ORDER['3'], Card::RANK_ORDER['2'], Card::RANK_ORDER['A']]; // A作为1
                }
            } elseif (count($cards) === 3) { // 3张牌的顺子 (头墩)
                if ($uniqueSortedRanksAsc[2] - $uniqueSortedRanksAsc[0] === 2) {
                    $isStraight = true;
                } elseif ($uniqueSortedRanksAsc == [Card::RANK_ORDER['2'], Card::RANK_ORDER['3'], Card::RANK_ORDER['A']]) { // A-2-3
                    $isStraight = true;
                    $rankValues = [Card::RANK_ORDER['A'], Card::RANK_ORDER['3'], Card::RANK_ORDER['2']]; // A-2-3 头墩 A 最大
                } elseif ($uniqueSortedRanksAsc == [Card::RANK_ORDER['Q'], Card::RANK_ORDER['K'], Card::RANK_ORDER['A']]) { // Q-K-A
                     $isStraight = true; // QKA 头墩 A 最大
                }
            }
        }

        // 根据牌型组合判断
        if ($isStraight && $isFlush) {
            $primaryRank = $rankValues[0]; // A2345顺子时 $rankValues 已被特殊处理
            if ($isStraight && $uniqueSortedRanksAsc == [Card::RANK_ORDER['2'], Card::RANK_ORDER['3'], Card::RANK_ORDER['4'], Card::RANK_ORDER['5'], Card::RANK_ORDER['A']]) {
                 // A2345同花顺，比较时用5 (A算1)
                 $primaryRank = Card::RANK_ORDER['5'];
            } else if ($isStraight && $uniqueSortedRanksAsc == [Card::RANK_ORDER['2'], Card::RANK_ORDER['3'], Card::RANK_ORDER['A']]) {
                $primaryRank = Card::RANK_ORDER['A']; // A23同花顺，A是最大的
            }

            return ['type' => self::STRAIGHT_FLUSH, 'name' => self::$handTypeNames[self::STRAIGHT_FLUSH], 'ranks' => [$primaryRank], 'hand_cards' => $cards];
        }

        $fours = []; $threes = []; $pairs = [];
        foreach ($rankCounts as $rank => $count) {
            if ($count === 4) $fours[] = $rank;
            elseif ($count === 3) $threes[] = $rank;
            elseif ($count === 2) $pairs[] = $rank;
        }

        if (!empty($fours)) { // 铁支
            $kicker = 0;
            if(count($cards) === 5) foreach($rankValues as $r) if ($r !== $fours[0]) $kicker = $r; // 5张牌铁支才有踢脚牌
            return ['type' => self::FOUR_OF_A_KIND, 'name' => self::$handTypeNames[self::FOUR_OF_A_KIND], 'ranks' => [$fours[0], $kicker], 'hand_cards' => array_filter($cards, fn($c)=>$c->getRankValue()==$fours[0])];
        }

        if (!empty($threes) && !empty($pairs)) { // 葫芦
            return ['type' => self::FULL_HOUSE, 'name' => self::$handTypeNames[self::FULL_HOUSE], 'ranks' => [$threes[0], $pairs[0]], 'hand_cards' => $cards];
        }

        if ($isFlush) {
            return ['type' => self::FLUSH, 'name' => self::$handTypeNames[self::FLUSH], 'ranks' => $rankValues, 'hand_cards' => $cards];
        }

        if ($isStraight) {
            $primaryRank = $rankValues[0]; // A2345顺子时 $rankValues 已被特殊处理
             if ($uniqueSortedRanksAsc == [Card::RANK_ORDER['2'], Card::RANK_ORDER['3'], Card::RANK_ORDER['4'], Card::RANK_ORDER['5'], Card::RANK_ORDER['A']]) {
                 $primaryRank = Card::RANK_ORDER['5']; // A2345顺子，5最大
            } else if ($uniqueSortedRanksAsc == [Card::RANK_ORDER['2'], Card::RANK_ORDER['3'], Card::RANK_ORDER['A']]) {
                $primaryRank = Card::RANK_ORDER['A']; // A23顺子，A是最大的
            }
            return ['type' => self::STRAIGHT, 'name' => self::$handTypeNames[self::STRAIGHT], 'ranks' => [$primaryRank], 'hand_cards' => $cards];
        }

        if (!empty($threes)) { // 三条
            $kickers = [];
            $tempRanks = array_diff($rankValues, $threes); // 获取非三条的牌点
            rsort($tempRanks); // 降序排列踢脚牌
            if (count($cards) === 5) $kickers = array_slice($tempRanks, 0, 2);
            // 3张牌的三条没有踢脚牌
            return ['type' => self::THREE_OF_A_KIND, 'name' => self::$handTypeNames[self::THREE_OF_A_KIND], 'ranks' => array_merge([$threes[0]], $kickers), 'hand_cards' => array_filter($cards, fn($c)=>$c->getRankValue()==$threes[0])];
        }

        if (count($pairs) === 2) { // 两对
            rsort($pairs); // 确保对子按点数大小排列
            $kicker = 0;
            if(count($cards) === 5) foreach($rankValues as $r) if ($r !== $pairs[0] && $r !== $pairs[1]) $kicker = $r;
            return ['type' => self::TWO_PAIR, 'name' => self::$handTypeNames[self::TWO_PAIR], 'ranks' => [$pairs[0], $pairs[1], $kicker], 'hand_cards' => array_filter($cards, fn($c)=>$c->getRankValue()==$pairs[0] || $c->getRankValue()==$pairs[1])];
        }

        if (count($pairs) === 1) { // 一对
            $kickers = [];
            $tempRanks = array_diff($rankValues, $pairs);
            rsort($tempRanks);
            if (count($cards) === 5) $kickers = array_slice($tempRanks, 0, 3);
            elseif (count($cards) === 3) $kickers = array_slice($tempRanks, 0, 1);
            return ['type' => self::PAIR, 'name' => self::$handTypeNames[self::PAIR], 'ranks' => array_merge([$pairs[0]], $kickers), 'hand_cards' => array_filter($cards, fn($c)=>$c->getRankValue()==$pairs[0])];
        }

        // 乌龙
        return ['type' => self::HIGH_CARD, 'name' => self::$handTypeNames[self::HIGH_CARD], 'ranks' => $rankValues, 'hand_cards' => [$cards[0]]];
    }

    /**
     * 比较两手牌型 (已评估过的)
     * 返回 >0 如果 $handA 强, <0 如果 $handB 强, 0 如果一样大
     */
    public static function compareHands(array $handA, array $handB): int {
        // ... (compareHands 代码与之前版本相同，此处省略)
        if ($handA['type'] !== $handB['type']) {
            return $handA['type'] - $handB['type'];
        }
        for ($i = 0; $i < count($handA['ranks']); $i++) {
            if (!isset($handB['ranks'][$i])) return 1;
            if ($handA['ranks'][$i] !== $handB['ranks'][$i]) {
                return $handA['ranks'][$i] - $handB['ranks'][$i];
            }
        }
        if (count($handB['ranks']) > count($handA['ranks'])) return -1;
        return 0;
    }
}

// 十三水游戏主类
class ThirteenWaters {
    private $deck = [];
    private $players = []; // 玩家数据结构
    private $numPlayers = 0;
    private $currentPlayerId = null; // (可选) 如果需要按顺序出牌
    private $roundState = 'dealing'; // dealing, playing, scoring, finished

    // 特殊牌型常量 (用于整副13张牌)
    const SPECIAL_HAND_NONE = 0;
    const SPECIAL_HAND_THREE_FLUSHES = 1;       // 三同花
    const SPECIAL_HAND_THREE_STRAIGHTS = 2;     // 三顺子
    const SPECIAL_HAND_SIX_PAIRS_PLUS = 3;      // 六对半
    const SPECIAL_HAND_FIVE_PAIRS_PLUS_THREE = 4; // 五对冲三
    const SPECIAL_HAND_FOUR_THREES = 5;         // 四套三条
    const SPECIAL_HAND_TWO_QUADS_PLUS_THREE = 6;// 双怪冲三 (两套铁支+三条，不可能在13张牌) - 这个可能不对
    const SPECIAL_HAND_ALL_SMALL = 7;           // 全小
    const SPECIAL_HAND_ALL_BIG = 8;             // 全大
    const SPECIAL_HAND_SAME_COLOR = 9;          // 凑一色 (全红或全黑，点数不论)
    const SPECIAL_HAND_STRAIGHT_FLUSH_DRAGON = 10; // 至尊清龙 (A-K同花顺)
    const SPECIAL_HAND_DRAGON = 11;             // 一条龙 (A-K杂顺)
    const SPECIAL_HAND_TWELVE_ROYALS = 12;      // 十二皇族 (12张JQK + 任意一张)
    // ... 更多根据地方规则添加

    public static $specialHandNames = [
        self::SPECIAL_HAND_NONE => '无特殊牌型',
        self::SPECIAL_HAND_THREE_FLUSHES => '三同花',
        self::SPECIAL_HAND_THREE_STRAIGHTS => '三顺子',
        // ...
        self::SPECIAL_HAND_DRAGON => '一条龙',
        self::SPECIAL_HAND_STRAIGHT_FLUSH_DRAGON => '至尊清龙',
    ];


    public function __construct() {
        $this->initializeDeck();
    }

    private function initializeDeck() { /* ... 与之前相同 ... */ }
    public function shuffleDeck() { /* ... 与之前相同 ... */ }

    public function dealCards($numPlayers = 2) {
        // ... (dealCards 代码与之前版本基本相同, 玩家数据结构初始化调整)
        if ($numPlayers < 2 || $numPlayers > 4) $numPlayers = 2;
        $this->numPlayers = $numPlayers;
        $this->shuffleDeck();
        $this->players = [];
        $this->roundState = 'dealing';

        for ($i = 0; $i < $numPlayers; $i++) {
            $playerId = 'player' . ($i + 1);
            $this->players[$playerId] = [
                'id' => $playerId,
                'hand' => [], // Card[]
                'score' => 0,
                'round_score' => 0, // 本局得分变化
                'special_hand_type' => self::SPECIAL_HAND_NONE, // 本局特殊牌型
                'played_hands_eval' => null, // 三墩评估结果 {front, middle, back}
                'played_hands_cards_str' => null, // 三墩的卡牌字符串 {front:string[], middle:string[], back:string[]}
                'has_submitted' => false,
                'is_dao_san' => false, // 是否倒三 (相公)
                'comparison_details' => [], // 与其他玩家的比牌详情
            ];
        }
        // ... (发牌逻辑)
        $deckCopy = $this->deck;
        for ($i = 0; $i < 13; $i++) {
            for ($p = 0; $p < $numPlayers; $p++) {
                $playerId = 'player' . ($p + 1);
                if (!empty($deckCopy)) $this->players[$playerId]['hand'][] = array_shift($deckCopy);
            }
        }
        $this->roundState = 'playing';
    }

    public function getGameState() {
        $state = ['players' => [], 'game_info' => ['round_state' => $this->roundState]];
        foreach ($this->players as $playerId => $playerData) {
            $displayHand = [];
            if ($this->roundState === 'scoring' || ($playerData['has_submitted'] && $this->allPlayersSubmitted())) {
                // 结算时或所有人都出完牌后，显示所有人的牌墩
                 $displayHand = $playerData['played_hands_cards_str'] ?? [
                    'front' => array_fill(0,3,'card_back'), // 默认显示牌背
                    'middle' => array_fill(0,5,'card_back'),
                    'back' => array_fill(0,5,'card_back'),
                ];
            } elseif ($playerData['has_submitted']) {
                // 自己已出牌，但其他人未出完，显示自己的牌墩，其他人牌背
                 $displayHand = $playerData['played_hands_cards_str'];
            }


            $state['players'][$playerId] = [
                'id' => $playerData['id'],
                'hand_count' => count($playerData['hand']), // 只发手牌数量，不直接发手牌内容给其他玩家
                // 自己的手牌只发给自己 (这需要在API层面处理，此处简化)
                'my_hand_str' => array_map(fn(Card $card) => $card->toStringForImage(), $playerData['hand']), // 假设API会过滤此字段
                'score' => $playerData['score'],
                'round_score_display' => ($playerData['round_score'] > 0 ? '+' : '') . $playerData['round_score'],
                'has_submitted' => $playerData['has_submitted'],
                'is_dao_san' => $playerData['is_dao_san'],
                'special_hand_display' => self::$specialHandNames[$playerData['special_hand_type']] ?? '',
                'played_hands_eval_display' => $playerData['has_submitted'] ? [
                    'front' => $playerData['played_hands_eval']['front']['name'] ?? '未设置',
                    'middle' => $playerData['played_hands_eval']['middle']['name'] ?? '未设置',
                    'back' => $playerData['played_hands_eval']['back']['name'] ?? '未设置',
                ] : null,
                'submitted_cards_display' => $displayHand, // 用于前端展示的已出牌墩
                'comparison_details_display' => $playerData['comparison_details'],
            ];
        }
        $state['game_info']['all_submitted'] = $this->allPlayersSubmitted();
        return $state;
    }

    private function allPlayersSubmitted(): bool { /* ... 与之前相同 ... */ }

    /**
     * 玩家提交牌墩
     */
    public function submitHand(string $playerId, array $frontStrings, array $middleStrings, array $backStrings): array {
        if (!isset($this->players[$playerId])) {
            return ['status' => 'error', 'message' => "无效的玩家ID: {$playerId}"];
        }
        if ($this->players[$playerId]['has_submitted']) {
            return ['status' => 'error', 'message' => "玩家 {$playerId} 已经提交过牌了。"];
        }

        // ... (牌数验证与之前相同) ...
        if (count($frontStrings) !== 3) return ['status' => 'error', 'message' => '头墩必须是3张牌。'];
        // ...

        $playerOriginalHandCards = $this->players[$playerId]['hand'];
        $usedOriginalHandIndices = []; // 记录原始手牌中哪些已被用于本次提交

        $frontCards = $this->validateAndConvertCards($frontStrings, $playerOriginalHandCards, $usedOriginalHandIndices, '头墩');
        if (is_string($frontCards)) return ['status' => 'error', 'message' => $frontCards];

        $middleCards = $this->validateAndConvertCards($middleStrings, $playerOriginalHandCards, $usedOriginalHandIndices, '中墩');
        if (is_string($middleCards)) return ['status' => 'error', 'message' => $middleCards];

        $backCards = $this->validateAndConvertCards($backStrings, $playerOriginalHandCards, $usedOriginalHandIndices, '尾墩');
        if (is_string($backCards)) return ['status' => 'error', 'message' => $backCards];

        // 确保13张牌都来自玩家手牌且不重复
        if (count($usedOriginalHandIndices) !== 13) {
            return ['status' => 'error', 'message' => '提交的牌与手牌不符或有重复用牌。'];
        }

        $frontEval = PokerHandEvaluator::evaluateHand($frontCards);
        $middleEval = PokerHandEvaluator::evaluateHand($middleCards);
        $backEval = PokerHandEvaluator::evaluateHand($backCards);

        // 验证墩位大小: 头 <= 中 <= 尾
        $isDaoSan = false;
        if (PokerHandEvaluator::compareHands($frontEval, $middleEval) > 0) $isDaoSan = true;
        if (!$isDaoSan && PokerHandEvaluator::compareHands($middleEval, $backEval) > 0) $isDaoSan = true;

        $this->players[$playerId]['is_dao_san'] = $isDaoSan;
        $this->players[$playerId]['played_hands_eval'] = [
            'front' => $frontEval, 'middle' => $middleEval, 'back' => $backEval,
        ];
        $this->players[$playerId]['played_hands_cards_str'] = [ // 存储字符串形式，方便前端展示
            'front' => $frontStrings, 'middle' => $middleStrings, 'back' => $backStrings
        ];
        $this->players[$playerId]['has_submitted'] = true;
        // 从玩家手牌中"移除"已出的牌 (逻辑上，不清空，只是标记)
        // $this->players[$playerId]['hand'] = []; // 或者标记已出牌

        // 检查13张牌的特殊牌型 (在墩位验证之后，相公了也可能依然有特殊牌型，但通常相公会影响特殊牌型得分)
        if (!$isDaoSan) {
            $allSubmittedCards = array_merge($frontCards, $middleCards, $backCards);
            $this->players[$playerId]['special_hand_type'] = $this->evaluateSpecialThirteenHand($allSubmittedCards, $frontEval, $middleEval, $backEval);
        }


        if ($this->allPlayersSubmitted()) {
            $this->roundState = 'scoring';
            $this->performComparisonsAndScoring();
        }

        return ['status' => 'success', 'message' => "玩家 {$playerId} 交牌成功。" . ($isDaoSan ? " (注意: 你的牌是相公！)" : "")];
    }


    /**
     * 验证并转换卡牌字符串 (辅助函数)
     * @param Card[] &$usedOriginalHandIndices 引用传递，记录原始手牌中已被使用的牌的索引
     */
    private function validateAndConvertCards(array $cardStrings, array $playerOriginalHandCards, array &$usedOriginalHandIndices, string $handName): array|string {
        $convertedCards = [];
        foreach ($cardStrings as $str) {
            $cardObj = Card::fromImageString($str);
            if (!$cardObj) return "{$handName} 包含无效卡牌字符串: {$str}";

            $foundIdx = -1;
            foreach ($playerOriginalHandCards as $idx => $originalCard) {
                if ($originalCard->equals($cardObj) && !in_array($idx, $usedOriginalHandIndices)) {
                    $foundIdx = $idx;
                    break;
                }
            }
            if ($foundIdx === -1) return "{$handName} 包含手牌中没有的牌或重复使用的牌: {$str}";

            $convertedCards[] = $cardObj;
            $usedOriginalHandIndices[] = $foundIdx;
        }
        return $convertedCards;
    }

    /**
     * 评估13张牌的特殊大牌型
     * @param Card[] $allCards (13张，已按玩家意愿摆放)
     * @param array $frontEval, $middleEval, $backEval (三墩已评估的结果)
     * @return int 特殊牌型常量
     */
    private function evaluateSpecialThirteenHand(array $allCards, array $frontEval, array $middleEval, array $backEval): int {
        // 示例：判断一条龙 (A-K杂顺)
        $ranks = [];
        foreach($allCards as $card) $ranks[] = $card->getRankValue();
        $uniqueRanks = array_unique($ranks);
        sort($uniqueRanks);
        if (count($uniqueRanks) === 13 && $uniqueRanks[0] === Card::RANK_ORDER['2'] && $uniqueRanks[12] === Card::RANK_ORDER['A']) {
            // 检查是否同花 (至尊清龙)
            $suits = [];
            foreach($allCards as $card) $suits[] = $card->suitInternal;
            if (count(array_unique($suits)) === 1) {
                return self::SPECIAL_HAND_STRAIGHT_FLUSH_DRAGON;
            }
            return self::SPECIAL_HAND_DRAGON;
        }

        // 示例：三同花
        if ($frontEval['type'] === PokerHandEvaluator::FLUSH &&
            $middleEval['type'] === PokerHandEvaluator::FLUSH &&
            $backEval['type'] === PokerHandEvaluator::FLUSH) {
            return self::SPECIAL_HAND_THREE_FLUSHES;
        }

        // 示例：三顺子
        if ($frontEval['type'] === PokerHandEvaluator::STRAIGHT &&
            $middleEval['type'] === PokerHandEvaluator::STRAIGHT &&
            $backEval['type'] === PokerHandEvaluator::STRAIGHT) {
            // 还要确保是A23, 234这种有效顺子，而不是PokerHandEvaluator误判的
            // 这个判断需要更严谨，这里简化
            return self::SPECIAL_HAND_THREE_STRAIGHTS;
        }

        // TODO: 实现其他所有特殊牌型的判断逻辑
        // - 六对半
        // - 五对冲三
        // - 四套三条
        // - 全大/全小/凑一色
        // - 十二皇族
        // ...

        return self::SPECIAL_HAND_NONE;
    }


    /**
     * 比牌与计分 (当所有玩家都提交后)
     */
    private function performComparisonsAndScoring() {
        $playerIds = array_keys($this->players);
        if (count($playerIds) < 2) return;

        // 重置本局得分变化
        foreach ($playerIds as $pid) $this->players[$pid]['round_score'] = 0;

        // 1. 处理特殊牌型得分 (通常特殊牌型会覆盖普通墩比牌，或者有额外加分)
        foreach ($playerIds as $pid) {
            $specialType = $this->players[$pid]['special_hand_type'];
            if ($specialType !== self::SPECIAL_HAND_NONE && !$this->players[$pid]['is_dao_san']) {
                $specialScore = $this->getSpecialHandBaseScore($specialType);
                // 特殊牌型通常是赢其他所有未相公且无更大特殊牌型的玩家
                foreach ($playerIds as $oid) {
                    if ($pid === $oid) continue;
                    if (!$this->players[$oid]['is_dao_san']) {
                        // 如果对方也有特殊牌型，需要比较特殊牌型大小
                        $opponentSpecialType = $this->players[$oid]['special_hand_type'];
                        if ($specialType > $opponentSpecialType) { // 假设常量值越大牌型越大
                            $this->players[$pid]['round_score'] += $specialScore;
                            $this->players[$oid]['round_score'] -= $specialScore;
                            $this->players[$pid]['comparison_details'][$oid]['special_win'] = self::$specialHandNames[$specialType] . " 胜";
                        } elseif ($specialType < $opponentSpecialType) {
                            // 对方特殊牌型更大，这里由对方的循环处理
                        } else {
                            // 特殊牌型一样大，平手 (或按规则处理)
                        }
                    }
                }
            }
        }


        // 2. 普通墩比牌 (如果玩家没有因为特殊牌型通杀或被通杀)
        for ($i = 0; $i < count($playerIds); $i++) {
            for ($j = $i + 1; $j < count($playerIds); $j++) {
                $p1Id = $playerIds[$i];
                $p2Id = $playerIds[$j];

                // 如果一方或双方已因特殊牌型结算，可能跳过普通比牌，或普通比牌结果作废
                // 这里简化：如果一方是相公，另一方自动赢所有未相公的墩
                $p1IsDaoSan = $this->players[$p1Id]['is_dao_san'];
                $p2IsDaoSan = $this->players[$p2Id]['is_dao_san'];

                if ($p1IsDaoSan && $p2IsDaoSan) { // 双方都相公，平局或按规则处理
                    $this->players[$p1Id]['comparison_details'][$p2Id]['result'] = "双方相公";
                    $this->players[$p2Id]['comparison_details'][$p1Id]['result'] = "双方相公";
                    continue;
                }
                
                $p1WinsSeg = 0;
                $p2WinsSeg = 0;
                $segmentResults = [];

                if ($p1IsDaoSan) { // P1相公，P2赢三墩 (每墩1分基础)
                    $p2WinsSeg = 3;
                    $segmentResults = ['front' => "{$p2Id}_胜(对方相公)", 'middle' => "{$p2Id}_胜(对方相公)", 'back' => "{$p2Id}_胜(对方相公)"];
                } elseif ($p2IsDaoSan) { // P2相公，P1赢三墩
                    $p1WinsSeg = 3;
                    $segmentResults = ['front' => "{$p1Id}_胜(对方相公)", 'middle' => "{$p1Id}_胜(对方相公)", 'back' => "{$p1Id}_胜(对方相公)"];
                } else {
                    // 双方都未相公，正常比墩
                    $p1HandsEval = $this->players[$p1Id]['played_hands_eval'];
                    $p2HandsEval = $this->players[$p2Id]['played_hands_eval'];

                    foreach (['front', 'middle', 'back'] as $segment) {
                        $cmp = PokerHandEvaluator::compareHands($p1HandsEval[$segment], $p2HandsEval[$segment]);
                        if ($cmp > 0) { $p1WinsSeg++; $segmentResults[$segment] = "{$p1Id}_胜"; }
                        elseif ($cmp < 0) { $p2WinsSeg++; $segmentResults[$segment] = "{$p2Id}_胜"; }
                        else { $segmentResults[$segment] = "平"; }
                    }
                }

                // 计算基础墩分和打枪
                $scoreChangeP1 = 0;
                $scoreChangeP2 = 0;

                if ($p1WinsSeg === 3 && $p2WinsSeg === 0) { // P1打枪P2
                    $scoreChangeP1 = 3 * 2; // 打枪通常翻倍，即赢6道
                    $scoreChangeP2 = -3 * 2;
                    $this->players[$p1Id]['comparison_details'][$p2Id]['result'] = "打枪！";
                } elseif ($p2WinsSeg === 3 && $p1WinsSeg === 0) { // P2打枪P1
                    $scoreChangeP2 = 3 * 2;
                    $scoreChangeP1 = -3 * 2;
                    $this->players[$p1Id]['comparison_details'][$p2Id]['result'] = "被打枪！";
                } else { // 普通比分
                    $scoreChangeP1 = $p1WinsSeg - $p2WinsSeg;
                    $scoreChangeP2 = $p2WinsSeg - $p1WinsSeg;
                    $this->players[$p1Id]['comparison_details'][$p2Id]['result'] = "P1 {$p1WinsSeg}墩 : P2 {$p2WinsSeg}墩";
                }
                
                // 叠加冲三、铁支等在墩位上的额外加分 (如果规则有)
                // 例如：尾墩铁支额外加 X 分，中墩葫芦额外加 Y 分
                if (!$p1IsDaoSan && !$p2IsDaoSan) {
                     list($extraP1, $extraP2) = $this->calculateSegmentExtraScores($this->players[$p1Id]['played_hands_eval'], $this->players[$p2Id]['played_hands_eval'], $segmentResults);
                     $scoreChangeP1 += $extraP1;
                     $scoreChangeP2 += $extraP2;
                }


                $this->players[$p1Id]['round_score'] += $scoreChangeP1;
                $this->players[$p2Id]['round_score'] += $scoreChangeP2;
                $this->players[$p1Id]['comparison_details'][$p2Id]['segments'] = $segmentResults;
                $this->players[$p1Id]['comparison_details'][$p2Id]['score_change_vs_player'] = $scoreChangeP1;
                // 对称记录
                $this->players[$p2Id]['comparison_details'][$p1Id]['segments'] = $segmentResults; // (结果对于双方视角是一样的)
                $this->players[$p2Id]['comparison_details'][$p1Id]['score_change_vs_player'] = $scoreChangeP2;
                 $this->players[$p2Id]['comparison_details'][$p1Id]['result'] = $this->players[$p1Id]['comparison_details'][$p2Id]['result']; // 同样对称
            }
        }

        // 3. 将本局得分变化累加到总分
        foreach ($playerIds as $pid) {
            $this->players[$pid]['score'] += $this->players[$pid]['round_score'];
        }
        $this->roundState = 'finished'; // 或者 'scoring_done'
    }

    /**
     * 获取特殊牌型的基础奖励分数 (道数)
     * TODO: 根据实际规则填写每种特殊牌型的奖励
     */
    private function getSpecialHandBaseScore(int $specialType): int {
        switch ($specialType) {
            case self::SPECIAL_HAND_DRAGON: return 13; // 一条龙通常13道
            case self::SPECIAL_HAND_STRAIGHT_FLUSH_DRAGON: return 26; // 至尊清龙翻倍或更高
            case self::SPECIAL_HAND_THREE_FLUSHES: return 6; // 示例
            case self::SPECIAL_HAND_THREE_STRAIGHTS: return 6; // 示例
            // ... 其他特殊牌型
            default: return 0;
        }
    }
    
    /**
     * 计算墩位上特殊牌型（如冲三、铁支在中尾墩）的额外加分
     * @return array [$extraScoreP1, $extraScoreP2]
     */
    private function calculateSegmentExtraScores(array $p1Evals, array $p2Evals, array $segmentWinResults) : array {
        $extraP1 = 0;
        $extraP2 = 0;
        // 规则示例:
        // - 中墩三条(非葫芦): +1道 (如果赢了该墩)
        // - 尾墩三条(非葫芦): +2道 (如果赢了该墩)
        // - 中墩葫芦: +2道 (如果赢了该墩)
        // - 尾墩铁支: +4道 (如果赢了该墩)
        // - 头墩三条(冲三): +3道 (如果赢了该墩)

        // 头墩冲三 (Player 1)
        if ($p1Evals['front']['type'] === PokerHandEvaluator::THREE_OF_A_KIND && str_contains($segmentWinResults['front'], 'player1')) { // 假设player1赢了头墩
            $extraP1 += 3;
        }
        // 头墩冲三 (Player 2)
        if ($p2Evals['front']['type'] === PokerHandEvaluator::THREE_OF_A_KIND && str_contains($segmentWinResults['front'], 'player2')) {
            $extraP2 += 3;
        }
        
        // 中墩 (Player 1)
        if (str_contains($segmentWinResults['middle'], 'player1')) {
            if ($p1Evals['middle']['type'] === PokerHandEvaluator::FULL_HOUSE) $extraP1 += 2; // 葫芦
            elseif ($p1Evals['middle']['type'] === PokerHandEvaluator::THREE_OF_A_KIND) $extraP1 += 1; // 三条
            // 铁支在中墩比较少见，但如果规则有也可以加
        }
        // 中墩 (Player 2)
         if (str_contains($segmentWinResults['middle'], 'player2')) {
            if ($p2Evals['middle']['type'] === PokerHandEvaluator::FULL_HOUSE) $extraP2 += 2;
            elseif ($p2Evals['middle']['type'] === PokerHandEvaluator::THREE_OF_A_KIND) $extraP2 += 1;
        }
        
        // 尾墩 (Player 1)
        if (str_contains($segmentWinResults['back'], 'player1')) {
            if ($p1Evals['back']['type'] === PokerHandEvaluator::FOUR_OF_A_KIND) $extraP1 += 4; // 铁支
            elseif ($p1Evals['back']['type'] === PokerHandEvaluator::STRAIGHT_FLUSH) $extraP1 += 5; // 同花顺 (如果规则有单独加分)
            elseif ($p1Evals['back']['type'] === PokerHandEvaluator::THREE_OF_A_KIND) $extraP1 += 2; // 三条
        }
        // 尾墩 (Player 2)
        if (str_contains($segmentWinResults['back'], 'player2')) {
            if ($p2Evals['back']['type'] === PokerHandEvaluator::FOUR_OF_A_KIND) $extraP2 += 4;
            elseif ($p2Evals['back']['type'] === PokerHandEvaluator::STRAIGHT_FLUSH) $extraP2 += 5;
            elseif ($p2Evals['back']['type'] === PokerHandEvaluator::THREE_OF_A_KIND) $extraP2 += 2;
        }

        return [$extraP1, $extraP2];
    }
}
?>
