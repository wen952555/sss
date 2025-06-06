export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'jack' | 'queen' | 'king' | 'ace';

export interface Card {
  suit: Suit;
  rank: Rank;
  id: string; // e.g., "spades_ace" for uniqueness
}

export interface Player {
  id: string;
  name: string;
  hand: Card[];
}

export interface GameState {
  deck: Card[];
  players: Player[];
  currentPlayerId: string | null;
  // ...其他游戏状态
}
