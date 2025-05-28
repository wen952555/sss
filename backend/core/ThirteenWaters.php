<?php

class Card {
    public $suit; // clubs, spades, diamonds, hearts (for image name)
    public $rank; // ace, king, queen, jack, 10, 9, ..., 2 (for image name)

    public $suitInternal; // S, H, D, C (for logic)
    public $rankInternal; // A, K, Q, J, T, 9, ..., 2 (for logic)

    private static $rankMapToImage = [
        'A' => 'ace', 'K' => 'king', 'Q' => 'queen', 'J' => 'jack',
        'T' => '10', '9' => '9', '8' => '8', '7' => '7',
        '6' => '6', '5' => '5', '4' => '4', '3' => '3', '2' => '2'
    ];
    private static $suitMapToImage = [
        'S' => 'spades', 'H' => 'hearts', 'D' => 'diamonds', 'C' => 'clubs'
    ];

    // For converting image string back to Card object
    private static $rankMapFromImage = [];
    private static $suitMapFromImage = [];


    // For internal logic and comparison
    const RANK_ORDER = ['2'=>2, '3'=>3, '4'=>4, '5'=>5, '6'=>6, '7'=>7, '8'=>8, '9'=>9, 'T'=>10, 'J'=>11, 'Q'=>12, 'K'=>13, 'A'=>14];
    const SUIT_ORDER = ['C'=>1, 'D'=>2, 'H'=>3, 'S'=>4]; // Example: Clubs < Diamonds < Hearts < Spades

    public function __construct($internalSuit, $internalRank) {
        if (empty(self::$rankMapFromImage)) { // Initialize reverse maps once
            self::$rankMapFromImage = array_flip(self::$rankMapToImage);
            self::$suitMapFromImage = array_flip(self::$suitMapToImage);
        }

        if (!isset(self::$suitMapToImage[$internalSuit]) || !isset(self::$rankMapToImage[$internalRank])) {
            throw new InvalidArgumentException("Invalid internal card suit or rank: {$internalSuit}{$internalRank}");
        }
        if (!isset(self::RANK_ORDER[$internalRank]) || !isset(self::SUIT_ORDER[$internalSuit])) {
            throw new InvalidArgumentException("Invalid internal card value for ordering: {$internalSuit}{$internalRank}");
        }

        $this->suitInternal = $internalSuit;
        $this->rankInternal = $internalRank;
        $this->suit = self::$suitMapToImage[$internalSuit];
        $this->rank = self::$rankMapToImage[$internalRank];
    }

    /**
     * Creates a Card object from an image string like "spades_ace"
     */
    public static function fromImageString(string $imageString): ?Card {
        if (empty(self::$rankMapFromImage)) { // Ensure maps are initialized
            self::$rankMapFromImage = array_flip(self::$rankMapToImage);
            self::$suitMapFromImage = array_flip(self::$suitMapToImage);
        }

        $parts = explode('_', $imageString);
        if (count($parts) !== 2) {
            return null;
        }
        $suitStr = $parts[0];
        $rankStr = $parts[1];

        if (!isset(self::$suitMapFromImage[$suitStr]) || !isset(self::$rankMapFromImage[$rankStr])) {
            return null;
        }
        return new Card(self::$suitMapFromImage[$suitStr], self::$rankMapFromImage[$rankStr]);
    }


    public function toStringForImage() {
        return $this->suit . '_' . $this->rank;
    }

    public function getRankValue(): int {
        return self::RANK_ORDER[$this->rankInternal];
    }

    public function getSuitValue(): int {
        return self::SUIT_ORDER[$this->suitInternal];
    }

    // Compare this card with another card.
    // Returns >0 if this card is greater, <0 if less, 0 if equal (based on rank then suit)
    public function compareTo(Card $otherCard): int {
        $rankDiff = $this->getRankValue() - $otherCard->getRankValue();
        if ($rankDiff !== 0) {
            return $rankDiff;
        }
        return $this->getSuitValue() - $otherCard->getSuitValue(); // Suit comparison if ranks are equal
    }

    public function equals(Card $otherCard): bool {
        return $this->suitInternal === $otherCard->suitInternal && $this->rankInternal === $otherCard->rankInternal;
    }
}


class PokerHandEvaluator {
    // Constants for hand types, ordered by strength (higher value is stronger)
    const HIGH_CARD = 1;
    const PAIR = 2;
    const TWO_PAIR = 3;
    const THREE_OF_A_KIND = 4;
    const STRAIGHT = 5;
    const FLUSH = 6;
    const FULL_HOUSE = 7;
    const FOUR_OF_A_KIND = 8;
    const STRAIGHT_FLUSH = 9;
    // TODO: Add special hands like Five of a Kind (with jokers, if any), Royal Flush (as a specific Straight Flush)
    // For Thirteen Waters, we also have specific "special hands" like "一条龙", "三同花顺" etc. that might be evaluated separately or integrated.

    public static $handTypeNames = [
        self::HIGH_CARD => 'High Card',
        self::PAIR => 'Pair',
        self::TWO_PAIR => 'Two Pair',
        self::THREE_OF_A_KIND => 'Three of a Kind',
        self::STRAIGHT => 'Straight',
        self::FLUSH => 'Flush',
        self::FULL_HOUSE => 'Full House',
        self::FOUR_OF_A_KIND => 'Four of a Kind',
        self::STRAIGHT_FLUSH => 'Straight Flush',
    ];

    /**
     * Evaluates a set of cards and returns its type and ranking values.
     * @param Card[] $cards
     * @return array ['type' => int, 'name' => string, 'ranks' => int[], 'hand_cards' => Card[]]
     * 'ranks' are used for tie-breaking, ordered from most significant.
     * 'hand_cards' are the cards forming the primary hand (e.g., the three cards in a Three of a Kind).
     */
    public static function evaluateHand(array $cards): array {
        if (empty($cards)) return ['type' => 0, 'name' => 'Invalid (empty)', 'ranks' => [], 'hand_cards' => []];
        
        // Sort cards by rank descending for easier processing
        usort($cards, function(Card $a, Card $b) {
            return $b->getRankValue() - $a->getRankValue();
        });

        $rankCounts = [];
        $suitCounts = [];
        $rankValues = []; // Store actual rank values for tie-breaking

        foreach ($cards as $card) {
            $rankVal = $card->getRankValue();
            $suitVal = $card->getSuitValue();
            $rankCounts[$rankVal] = ($rankCounts[$rankVal] ?? 0) + 1;
            $suitCounts[$suitVal] = ($suitCounts[$suitVal] ?? 0) + 1;
            $rankValues[] = $rankVal;
        }
        arsort($rankCounts); // Sort by count, then by rank if counts are equal

        $isFlush = false;
        foreach ($suitCounts as $count) {
            if ($count >= 5) { // For a 5-card hand, a flush needs all 5
                 if(count($cards) == 5 && $count == 5) $isFlush = true;
                 if(count($cards) == 3 && $count == 3) $isFlush = true; // For 3-card head (not standard poker, but in 13 waters)
            }
        }
        // Simplified flush check for 3-card hands (common in 13 waters head)
        if (count($cards) === 3 && count(array_unique(array_map(fn($c)=>$c->suitInternal, $cards))) === 1) {
            $isFlush = true;
        }


        $isStraight = false;
        $uniqueSortedRanks = array_unique($rankValues);
        sort($uniqueSortedRanks); // Sort ascending for straight check

        if (count($uniqueSortedRanks) >= 5) { // Need at least 5 unique ranks for a 5-card straight
            for ($i = 0; $i <= count($uniqueSortedRanks) - 5; $i++) {
                if ($uniqueSortedRanks[$i+4] - $uniqueSortedRanks[$i] === 4) {
                    $isStraight = true;
                    // $straightHighCardRank = $uniqueSortedRanks[$i+4]; // Highest card in this straight
                    break;
                }
            }
            // Ace-low straight (A-2-3-4-5)
            if (!$isStraight &&
                in_array(Card::RANK_ORDER['A'], $uniqueSortedRanks) &&
                in_array(Card::RANK_ORDER['2'], $uniqueSortedRanks) &&
                in_array(Card::RANK_ORDER['3'], $uniqueSortedRanks) &&
                in_array(Card::RANK_ORDER['4'], $uniqueSortedRanks) &&
                in_array(Card::RANK_ORDER['5'], $uniqueSortedRanks)
            ) {
                $isStraight = true;
                // $straightHighCardRank = Card::RANK_ORDER['5']; // A-5 straight is ranked by the 5
                // For A-5 straight, the ranks for comparison should be 5,4,3,2,A(as 1)
                // This needs careful handling in tie-breaking.
            }
        }
        // Simplified straight check for 3-card hands
        if (count($cards) === 3 && count($uniqueSortedRanks) === 3) {
            if ($uniqueSortedRanks[2] - $uniqueSortedRanks[0] === 2) {
                 $isStraight = true;
            }
            // A-2-3 or A-K-Q (for head)
            if (!$isStraight && $uniqueSortedRanks == [Card::RANK_ORDER['2'], Card::RANK_ORDER['3'], Card::RANK_ORDER['A']]) $isStraight = true; // A-2-3
            if (!$isStraight && $uniqueSortedRanks == [Card::RANK_ORDER['Q'], Card::RANK_ORDER['K'], Card::RANK_ORDER['A']]) $isStraight = true; // Q-K-A
        }


        $fours = [];
        $threes = [];
        $pairs = [];
        $kickers = [];

        foreach ($rankCounts as $rank => $count) {
            if ($count === 4) $fours[] = $rank;
            elseif ($count === 3) $threes[] = $rank;
            elseif ($count === 2) $pairs[] = $rank;
        }
        rsort($pairs); // Ensure pairs are sorted high to low if multiple

        // ---- Determine Hand Type ----
        if ($isStraight && $isFlush) {
            // For a 5-card hand. 3-card straight flush is also possible in 13 waters head.
            $evalRanks = $cards[0]->getRankValue(); // Highest card in straight flush
            if ($uniqueSortedRanks == [Card::RANK_ORDER['2'], Card::RANK_ORDER['3'], Card::RANK_ORDER['A']] && $isFlush){ // A-2-3 flush
                $evalRanks = Card::RANK_ORDER['A']; // Ace of A-2-3 straight flush
            }
            return ['type' => self::STRAIGHT_FLUSH, 'name' => self::$handTypeNames[self::STRAIGHT_FLUSH], 'ranks' => [$evalRanks], 'hand_cards' => $cards];
        }
        if (!empty($fours)) {
            $kickerRank = 0;
            foreach($cards as $c) if ($c->getRankValue() != $fours[0]) $kickerRank = max($kickerRank, $c->getRankValue());
            return ['type' => self::FOUR_OF_A_KIND, 'name' => self::$handTypeNames[self::FOUR_OF_A_KIND], 'ranks' => [$fours[0], $kickerRank], 'hand_cards' => array_filter($cards, fn($c)=>$c->getRankValue()==$fours[0])];
        }
        if (!empty($threes) && !empty($pairs)) {
            return ['type' => self::FULL_HOUSE, 'name' => self::$handTypeNames[self::FULL_HOUSE], 'ranks' => [$threes[0], $pairs[0]], 'hand_cards' => array_merge(array_filter($cards, fn($c)=>$c->getRankValue()==$threes[0]), array_filter($cards, fn($c)=>$c->getRankValue()==$pairs[0]))];
        }
        if ($isFlush) {
            // Ranks are all card ranks in descending order for flush tie-breaking
            return ['type' => self::FLUSH, 'name' => self::$handTypeNames[self::FLUSH], 'ranks' => $rankValues, 'hand_cards' => $cards];
        }
        if ($isStraight) {
            // Ranks: highest card of the straight. A-5 straight handled by its '5'.
            $highRank = $cards[0]->getRankValue();
            if ($uniqueSortedRanks == [Card::RANK_ORDER['2'], Card::RANK_ORDER['3'], Card::RANK_ORDER['A']]){ // A-2-3 straight
                 $highRank = Card::RANK_ORDER['A']; // Use A as high for A-2-3 straight in 13 waters
            } else if (count($uniqueSortedRanks) >=5 && $uniqueSortedRanks[0] == Card::RANK_ORDER['2'] && $uniqueSortedRanks[1] == Card::RANK_ORDER['3'] && $uniqueSortedRanks[2] == Card::RANK_ORDER['4'] && $uniqueSortedRanks[3] == Card::RANK_ORDER['5'] && $uniqueSortedRanks[count($uniqueSortedRanks)-1] == Card::RANK_ORDER['A']) {
                 $highRank = Card::RANK_ORDER['5']; // A-5 straight uses 5 as high card.
            }
            return ['type' => self::STRAIGHT, 'name' => self::$handTypeNames[self::STRAIGHT], 'ranks' => [$highRank], 'hand_cards' => $cards];
        }
        if (!empty($threes)) {
            // Get kickers
            $kickerRanks = [];
            $tempCards = array_filter($cards, fn($c)=>$c->getRankValue()!=$threes[0]);
            usort($tempCards, fn($a, $b) => $b->getRankValue() - $a->getRankValue());
            foreach(array_slice($tempCards, 0, (count($cards) == 5 ? 2 : 0)) as $k) $kickerRanks[] = $k->getRankValue();
            return ['type' => self::THREE_OF_A_KIND, 'name' => self::$handTypeNames[self::THREE_OF_A_KIND], 'ranks' => array_merge([$threes[0]], $kickerRanks), 'hand_cards' => array_filter($cards, fn($c)=>$c->getRankValue()==$threes[0])];
        }
        if (count($pairs) >= 2) {
            $kickerRank = 0;
            if (count($cards) == 5) { // Two pair only possible in 5-card hands
                foreach($cards as $c) if ($c->getRankValue() != $pairs[0] && $c->getRankValue() != $pairs[1]) $kickerRank = max($kickerRank, $c->getRankValue());
            } else { return self::evaluateHighCard($cards); /* Not two pair for 3 cards */ }
            return ['type' => self::TWO_PAIR, 'name' => self::$handTypeNames[self::TWO_PAIR], 'ranks' => [$pairs[0], $pairs[1], $kickerRank], 'hand_cards' => array_filter($cards, fn($c)=>$c->getRankValue()==$pairs[0] || $c->getRankValue()==$pairs[1])];
        }
        if (count($pairs) === 1) {
            $kickerRanks = [];
            $tempCards = array_filter($cards, fn($c)=>$c->getRankValue()!=$pairs[0]);
            usort($tempCards, fn($a, $b) => $b->getRankValue() - $a->getRankValue());
            foreach(array_slice($tempCards, 0, (count($cards) == 5 ? 3 : (count($cards) == 3 ? 1 : 0) )) as $k) $kickerRanks[] = $k->getRankValue();
            return ['type' => self::PAIR, 'name' => self::$handTypeNames[self::PAIR], 'ranks' => array_merge([$pairs[0]], $kickerRanks), 'hand_cards' => array_filter($cards, fn($c)=>$c->getRankValue()==$pairs[0])];
        }

        return self::evaluateHighCard($cards);
    }

    private static function evaluateHighCard(array $cards): array {
        // Ranks are all card ranks in descending order
        $rankValues = [];
        foreach ($cards as $card) $rankValues[] = $card->getRankValue();
        rsort($rankValues);
        return ['type' => self::HIGH_CARD, 'name' => self::$handTypeNames[self::HIGH_CARD], 'ranks' => $rankValues, 'hand_cards' => [$cards[0]]];
    }

    /**
     * Compares two evaluated hands.
     * Returns > 0 if $handA is stronger, < 0 if $handB is stronger, 0 if equal.
     */
    public static function compareHands(array $handA, array $handB): int {
        if ($handA['type'] !== $handB['type']) {
            return $handA['type'] - $handB['type'];
        }
        // Same type, compare by ranks (kickers)
        for ($i = 0; $i < count($handA['ranks']); $i++) {
            if (!isset($handB['ranks'][$i])) return 1; // handA has more kickers, so stronger (should not happen if evaluation is correct)
            if ($handA['ranks'][$i] !== $handB['ranks'][$i]) {
                return $handA['ranks'][$i] - $handB['ranks'][$i];
            }
        }
        if (count($handB['ranks']) > count($handA['ranks'])) return -1; // handB has more kickers
        return 0; // Hands are identical
    }
}


class ThirteenWaters {
    private $deck = [];
    private $players = []; // ['playerId' => ['hand' => Card[], 'score' => int, 'played_hands' => ['front'=>HandEval, 'middle'=>HandEval, 'back'=>HandEval], 'has_submitted' => bool]]
    private $numPlayers = 0;

    public function __construct() {
        $this->initializeDeck();
    }

    private function initializeDeck() {
        $this->deck = [];
        $internalSuits = ['S', 'H', 'D', 'C'];
        $internalRanks = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
        foreach ($internalSuits as $suit) {
            foreach ($internalRanks as $rank) {
                $this->deck[] = new Card($suit, $rank);
            }
        }
    }

    public function shuffleDeck() {
        shuffle($this->deck);
    }

    public function dealCards($numPlayers = 2) {
        if ($numPlayers < 2 || $numPlayers > 4) $numPlayers = 2;
        $this->numPlayers = $numPlayers;
        $this->shuffleDeck();
        $this->players = [];

        for ($i = 0; $i < $numPlayers; $i++) {
            $playerId = 'player' . ($i + 1);
            $this->players[$playerId] = [
                'hand' => [],
                'score' => 0,
                'played_hands_eval' => null, // Stores evaluated hands {front, middle, back}
                'played_hands_cards' => null, // Stores Card objects of played hands
                'has_submitted' => false,
                'last_comparison_result' => [] // Stores results against other players
            ];
        }

        $cardsToDeal = $numPlayers * 13;
        if (count($this->deck) < $cardsToDeal) {
            // Should not happen with a standard 52-card deck and up to 4 players.
            throw new Exception("Not enough cards in deck to deal for {$numPlayers} players.");
        }
        
        $deckCopy = $this->deck; // Work with a copy for dealing

        for ($i = 0; $i < 13; $i++) { // Deal 13 rounds of cards
            for ($p = 0; $p < $numPlayers; $p++) {
                $playerId = 'player' . ($p + 1);
                if (!empty($deckCopy)) {
                    $this->players[$playerId]['hand'][] = array_shift($deckCopy);
                }
            }
        }
    }

    public function getGameState() {
        $state = [];
        foreach ($this->players as $playerId => $playerData) {
            $state[$playerId] = [
                'hand' => array_map(fn(Card $card) => $card->toStringForImage(), $playerData['hand']),
                'score' => $playerData['score'],
                'has_submitted' => $playerData['has_submitted'],
                // Optionally send evaluated hands if they exist and game state requires it
                'played_hands_display' => $playerData['played_hands_eval'] ? [
                    'front' => $playerData['played_hands_eval']['front']['name'] ?? 'Not Set',
                    'middle' => $playerData['played_hands_eval']['middle']['name'] ?? 'Not Set',
                    'back' => $playerData['played_hands_eval']['back']['name'] ?? 'Not Set',
                ] : null,
                'last_comparison_result' => $playerData['last_comparison_result'] ?? []
            ];
        }
        // Add game-wide state if needed, e.g., current turn, all_players_submitted
        $state['game_status'] = [
            'all_submitted' => $this->allPlayersSubmitted(),
            'num_players' => $this->numPlayers
        ];
        return $state;
    }

    private function allPlayersSubmitted(): bool {
        if (empty($this->players)) return false;
        foreach ($this->players as $playerData) {
            if (!$playerData['has_submitted']) {
                return false;
            }
        }
        return true;
    }

    /**
     * Player submits their three hands.
     * @param string $playerId
     * @param string[] $frontStrings Card image strings for front hand (3 cards)
     * @param string[] $middleStrings Card image strings for middle hand (5 cards)
     * @param string[] $backStrings Card image strings for back hand (5 cards)
     * @return array ['status' => 'success'|'error', 'message' => string]
     */
    public function submitHand(string $playerId, array $frontStrings, array $middleStrings, array $backStrings): array {
        if (!isset($this->players[$playerId])) {
            return ['status' => 'error', 'message' => "Invalid player ID: {$playerId}"];
        }
        if ($this->players[$playerId]['has_submitted']) {
            return ['status' => 'error', 'message' => "Player {$playerId} has already submitted their hand."];
        }

        // Validate card counts
        if (count($frontStrings) !== 3) return ['status' => 'error', 'message' => 'Front hand must have 3 cards.'];
        if (count($middleStrings) !== 5) return ['status' => 'error', 'message' => 'Middle hand must have 5 cards.'];
        if (count($backStrings) !== 5) return ['status' => 'error', 'message' => 'Back hand must have 5 cards.'];

        // Convert strings to Card objects and validate ownership
        $playerHand = $this->players[$playerId]['hand'];
        $usedPlayerHandCards = []; // Keep track of which cards from player's hand are used

        $frontCards = $this->validateAndConvertCards($frontStrings, $playerHand, $usedPlayerHandCards, 'Front');
        if (is_string($frontCards)) return ['status' => 'error', 'message' => $frontCards]; // Error message returned

        $middleCards = $this->validateAndConvertCards($middleStrings, $playerHand, $usedPlayerHandCards, 'Middle');
        if (is_string($middleCards)) return ['status' => 'error', 'message' => $middleCards];

        $backCards = $this->validateAndConvertCards($backStrings, $playerHand, $usedPlayerHandCards, 'Back');
        if (is_string($backCards)) return ['status' => 'error', 'message' => $backCards];

        // Ensure all 13 cards were used exactly once
        $totalSubmittedCards = count($frontStrings) + count($middleStrings) + count($backStrings);
        if ($totalSubmittedCards !== 13) { // Should be caught by individual counts, but double check
            return ['status' => 'error', 'message' => 'Total submitted cards must be 13.'];
        }
        // Further check if all submitted cards are unique among themselves (implicitly handled if they must come from player's hand)


        // Evaluate each hand
        $frontEval = PokerHandEvaluator::evaluateHand($frontCards);
        $middleEval = PokerHandEvaluator::evaluateHand($middleCards);
        $backEval = PokerHandEvaluator::evaluateHand($backCards);

        // Validate hand strengths: Front <= Middle <= Back
        // Note: For Thirteen Waters, "乌龙" (High Card) is the weakest.
        // If Middle is weaker than Front, or Back is weaker than Middle, it's a "相公" (dao san/misplayed hand).
        $cmpFrontMiddle = PokerHandEvaluator::compareHands($frontEval, $middleEval);
        $cmpMiddleBack = PokerHandEvaluator::compareHands($middleEval, $backEval);

        if ($cmpFrontMiddle > 0) { // Front hand is stronger than Middle hand
            return ['status' => 'error', 'message' => 'Invalid hand: Front hand cannot be stronger than Middle hand. (相公)'];
        }
        if ($cmpMiddleBack > 0) { // Middle hand is stronger than Back hand
            return ['status' => 'error', 'message' => 'Invalid hand: Middle hand cannot be stronger than Back hand. (相公)'];
        }

        // Store evaluated hands and original cards
        $this->players[$playerId]['played_hands_eval'] = [
            'front' => $frontEval,
            'middle' => $middleEval,
            'back' => $backEval,
        ];
        $this->players[$playerId]['played_hands_cards'] = [ // Store actual Card objects
            'front' => $frontCards,
            'middle' => $middleCards,
            'back' => $backCards,
        ];
        $this->players[$playerId]['has_submitted'] = true;

        // Check if all players have submitted
        if ($this->allPlayersSubmitted()) {
            $this->performComparisonsAndScoring();
        }

        return ['status' => 'success', 'message' => "Player {$playerId} submitted hand successfully."];
    }

    /**
     * Helper to convert card strings to Card objects and validate against player's hand.
     * @param string[] $cardStrings
     * @param Card[] $playerHandCards
     * @param Card[] &$usedPlayerHandCards (passed by reference to track usage across all three submitted hands)
     * @param string $handName For error messages
     * @return Card[]|string Array of Card objects on success, error message string on failure.
     */
    private function validateAndConvertCards(array $cardStrings, array $playerHandCards, array &$usedPlayerHandCards, string $handName): array|string {
        $convertedCards = [];
        $currentHandUsedIndices = []; // Track indices from player's hand used for *this* specific submitted hand (front/middle/back)

        foreach ($cardStrings as $str) {
            $cardObj = Card::fromImageString($str);
            if (!$cardObj) {
                return "{$handName} hand contains invalid card string: {$str}";
            }

            $foundInPlayerHand = false;
            $foundIndex = -1;
            foreach ($playerHandCards as $idx => $playerCard) {
                if ($playerCard->equals($cardObj)) {
                    // Check if this card (from original hand) has already been used for *any* of the submitted hands
                    $alreadyUsedOverall = false;
                    foreach($usedPlayerHandCards as $usedCard) {
                        if ($usedCard->equals($playerCard)) {
                            $alreadyUsedOverall = true;
                            break;
                        }
                    }
                    if (!$alreadyUsedOverall) {
                         // Check if this card (from original hand) has already been used *for this specific submitted hand*
                        if (!in_array($idx, $currentHandUsedIndices)) {
                            $foundInPlayerHand = true;
                            $foundIndex = $idx;
                            break;
                        }
                    }
                }
            }

            if (!$foundInPlayerHand) {
                return "{$handName} hand contains card '{$str}' not in player's original hand or already used.";
            }
            
            $convertedCards[] = $cardObj;
            $usedPlayerHandCards[] = $playerHandCards[$foundIndex]; // Add to overall used list
            $currentHandUsedIndices[] = $foundIndex; // Mark as used for this specific hand
        }
        return $convertedCards;
    }


    /**
     * This function is called when all players have submitted their hands.
     * It performs comparisons between players and calculates scores.
     * THIS IS A SIMPLIFIED SCORING - THIRTEEN WATERS SCORING IS COMPLEX.
     */
    private function performComparisonsAndScoring() {
        $playerIds = array_keys($this->players);
        if (count($playerIds) < 2) return; // Need at least 2 players

        // Reset scores or carry over from previous rounds if game design requires
        // For simplicity here, we assume scores are per-round and add to existing player scores.

        for ($i = 0; $i < count($playerIds); $i++) {
            for ($j = $i + 1; $j < count($playerIds); $j++) {
                $p1Id = $playerIds[$i];
                $p2Id = $playerIds[$j];

                $p1Hands = $this->players[$p1Id]['played_hands_eval'];
                $p2Hands = $this->players[$p2Id]['played_hands_eval'];

                if (!$p1Hands || !$p2Hands) continue; // Should not happen if all submitted

                $p1RoundScore = 0;
                $p2RoundScore = 0;

                // Compare Front, Middle, Back
                $results = [];
                foreach (['front', 'middle', 'back'] as $segment) {
                    $comparison = PokerHandEvaluator::compareHands($p1Hands[$segment], $p2Hands[$segment]);
                    if ($comparison > 0) { // p1 wins segment
                        $p1RoundScore++;
                        $results[$segment] = "{$p1Id}_wins";
                    } elseif ($comparison < 0) { // p2 wins segment
                        $p2RoundScore++;
                        $results[$segment] = "{$p2Id}_wins";
                    } else {
                        $results[$segment] = "draw";
                    }
                }
                
                // Basic scoring: +1 for each winning segment.
                // TODO: Implement "打枪" (da qiang / scoop) and other special scoring.
                // If one player wins all 3 segments against another, it's a scoop (usually *2 score).
                $p1FinalScoreAdjustment = 0;
                $p2FinalScoreAdjustment = 0;

                if ($p1RoundScore === 3 && $p2RoundScore === 0) { // P1 scoops P2
                    $p1FinalScoreAdjustment = 3 * 2; // Standard scoop might be total 6 points (3 normal + 3 bonus)
                    $p2FinalScoreAdjustment = -3 * 2;
                } elseif ($p2RoundScore === 3 && $p1RoundScore === 0) { // P2 scoops P1
                    $p2FinalScoreAdjustment = 3 * 2;
                    $p1FinalScoreAdjustment = -3 * 2;
                } else {
                    $p1FinalScoreAdjustment = $p1RoundScore - $p2RoundScore;
                    $p2FinalScoreAdjustment = $p2RoundScore - $p1RoundScore;
                }

                $this->players[$p1Id]['score'] += $p1FinalScoreAdjustment;
                $this->players[$p2Id]['score'] += $p2FinalScoreAdjustment;

                // Store comparison details for display (optional)
                 $this->players[$p1Id]['last_comparison_result'][$p2Id] = [
                    'segments' => $results,
                    'score_change' => $p1FinalScoreAdjustment
                ];
                $this->players[$p2Id]['last_comparison_result'][$p1Id] = [
                    'segments' => $results, // results are symmetric view
                    'score_change' => $p2FinalScoreAdjustment
                ];
            }
        }
        // TODO: Handle special hands (一条龙, 全垒打, etc.) that might override normal scoring or give large bonuses.
        // This would typically be checked before or during the pairwise comparisons.
    }
}

?>
