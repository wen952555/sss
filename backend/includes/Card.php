<?php
class Card {
    public string $id; // e.g., "AS", "TC"
    public int $rank; // 2-14 (A=14)
    public string $suit; // s, h, d, c
    public string $rankSymbol;
    public string $suitSymbol;

    const RANK_TO_SYMBOL = [
        2 => '2', 3 => '3', 4 => '4', 5 => '5', 6 => '6', 7 => '7', 8 => '8', 9 => '9',
        10 => 'T', 11 => 'J', 12 => 'Q', 13 => 'K', 14 => 'A'
    ];
    const SYMBOL_TO_RANK = [
        '2' => 2, '3' => 3, '4' => 4, '5' => 5, '6' => 6, '7' => 7, '8' => 8, '9' => 9,
        'T' => 10, 'J' => 11, 'Q' => 12, 'K' => 13, 'A' => 14
    ];
    const SUITS = ['s', 'h', 'd', 'c'];

    public function __construct(string $idOrRankSymbol, ?string $suitSymbolOrSuit = null) {
        if (strlen($idOrRankSymbol) >= 2 && $suitSymbolOrSuit === null) { // Assume $idOrRankSymbol is like "AS", "TC"
            $this->id = strtoupper($idOrRankSymbol);
            $this->rankSymbol = substr($this->id, 0, -1);
            $this->suitSymbol = substr($this->id, -1);

            if (!isset(self::SYMBOL_TO_RANK[$this->rankSymbol])) {
                throw new Exception("Invalid rank symbol in ID: {$this->rankSymbol}");
            }
            $this->rank = self::SYMBOL_TO_RANK[$this->rankSymbol];
            $this->suit = strtolower($this->suitSymbol);
            if (!in_array($this->suit, self::SUITS)) {
                throw new Exception("Invalid suit symbol in ID: {$this->suitSymbol}");
            }
        } elseif (is_numeric($idOrRankSymbol) && $suitSymbolOrSuit !== null) { // Assume rank (number) and suit ('s', 'h', 'd', 'c')
            $this->rank = (int)$idOrRankSymbol;
            $this->suit = strtolower($suitSymbolOrSuit);
             if (!isset(self::RANK_TO_SYMBOL[$this->rank])) {
                throw new Exception("Invalid numeric rank: {$this->rank}");
            }
            $this->rankSymbol = self::RANK_TO_SYMBOL[$this->rank];
            $this->suitSymbol = strtoupper($this->suit);
            $this->id = $this->rankSymbol . $this->suitSymbol;
            if (!in_array($this->suit, self::SUITS)) {
                throw new Exception("Invalid suit: {$this->suit}");
            }
        } else {
            throw new Exception("Invalid Card constructor arguments.");
        }
    }

    public static function fromId(string $id): Card {
        return new Card($id);
    }

    public function toString(): string {
        return $this->id;
    }

    public function toArray(): array { // For sending to frontend
        return [
            'id' => $this->id, // e.g., TC, AS
            // Frontend will use its own getCardDataFromFilename or similar to get image etc.
            // Or backend can also map to filename if needed, but simpler if frontend handles it with ID.
            'rank' => $this->rank,
            'suit' => $this->suit,
            'rankSymbol' => $this->rankSymbol,
            'suitSymbol' => $this->suitSymbol,
        ];
    }
}
