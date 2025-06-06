import type { Card, Suit, Rank } from '@/types';

const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king', 'ace'];

// 映射到图片文件名（小写）
const rankToFileName = (rank: Rank): string => {
  if (rank === '10') return '10';
  return rank.toLowerCase();
};

const suitToFileName = (suit: Suit): string => {
  return suit.toLowerCase();
};

export function getCardImageFilename(card: Card): string {
  return `${rankToFileName(card.rank)}_of_${suitToFileName(card.suit)}.png`;
}

export function getCardImageUrl(card: Card | null, faceUp: boolean = true): string {
  if (!faceUp || !card) {
    return `/cards/back.png`; // 确保 public/cards/back.png 存在
  }
  return `/cards/${getCardImageFilename(card)}`;
}

// 生成一副牌 (仅作示例，实际应由后端提供)
export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank, id: `${suit}_${rank}` });
    }
  }
  return deck;
}

// 洗牌 (Fisher-Yates shuffle)
export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
