// frontend/src/logic/__tests__/cardUtils.test.js
import { createDeck, shuffleDeck, evaluateHand, compareEvaluatedHands, isValidArrangement } from '../cardUtils';

describe('cardUtils', () => {
  let deck;

  beforeEach(() => {
    deck = createDeck();
  });

  describe('createDeck', () => {
    it('should create a deck of 52 cards', () => {
      expect(deck.length).toBe(52);
      const cardIds = new Set(deck.map(c => c.id));
      expect(cardIds.size).toBe(52);
    });
  });

  describe('shuffleDeck', () => {
    it('should shuffle the deck', () => {
      const originalDeckJson = JSON.stringify(deck);
      const shuffledDeck = shuffleDeck(deck);
      expect(JSON.stringify(shuffledDeck)).not.toEqual(originalDeckJson);
      expect(shuffledDeck.length).toBe(52);
    });
  });

  describe('evaluateHand', () => {
    it('should correctly evaluate a high card hand', () => {
      const hand = [deck.find(c => c.id === '2s'), deck.find(c => c.id === '4h'), deck.find(c => c.id === '6c')];
      const result = evaluateHand(hand);
      expect(result.type).toBe('high_card_3');
      expect(result.rank).toBeGreaterThan(100);
    });

    it('should correctly evaluate a pair', () => {
      const hand = [deck.find(c => c.id === '2s'), deck.find(c => c.id === '2h'), deck.find(c => c.id === '6c')];
      const result = evaluateHand(hand);
      expect(result.type).toBe('pair_3');
      expect(result.rank).toBeGreaterThan(200);
    });

    it('should correctly evaluate a full house', () => {
      const hand = [
        deck.find(c => c.id === 'As'),
        deck.find(c => c.id === 'Ah'),
        deck.find(c => c.id === 'Ac'),
        deck.find(c => c.id === 'Ks'),
        deck.find(c => c.id === 'Kh'),
      ];
      const result = evaluateHand(hand);
      expect(result.type).toBe('full_house');
      expect(result.rank).toBeGreaterThan(700);
    });
  });

  describe('compareEvaluatedHands', () => {
    it('should correctly compare two hands of different ranks', () => {
      const pairHand = evaluateHand([deck.find(c => c.id === '2s'), deck.find(c => c.id === '2h'), deck.find(c => c.id === '6c')]);
      const highCardHand = evaluateHand([deck.find(c => c.id === 'As'), deck.find(c => c.id === '4h'), deck.find(c => c.id === '6c')]);
      const result = compareEvaluatedHands(pairHand, highCardHand);
      expect(result).toBeGreaterThan(0);
    });

    it('should handle tie-breaking with high card (kicker)', () => {
      // Both hands have a pair of 2s, but hand A has a higher kicker (Ace vs King)
      const handA = evaluateHand([deck.find(c => c.id === '2s'), deck.find(c => c.id === '2h'), deck.find(c => c.id === 'Ac')]);
      const handB = evaluateHand([deck.find(c => c.id === '2c'), deck.find(c => c.id === '2d'), deck.find(c => c.id === 'Kc')]);
      const result = compareEvaluatedHands(handA, handB);
      expect(result).toBeGreaterThan(0);
    });

    it('should handle tie-breaking for flushes', () => {
      // Both are spade flushes, but hand A has a higher high card (Ace vs King)
      const handA = evaluateHand(['As', 'Ks', 'Qs', 'Js', '9s'].map(id => deck.find(c => c.id === id)));
      const handB = evaluateHand(['Ks', 'Qs', 'Js', '9s', '8s'].map(id => deck.find(c => c.id === id)));
      const result = compareEvaluatedHands(handA, handB);
      expect(result).toBeGreaterThan(0);
    });

    it('should return 0 for identical hands', () => {
      const handA = evaluateHand([deck.find(c => c.id === '2s'), deck.find(c => c.id === '2h'), deck.find(c => c.id === 'Ac')]);
      const handB = evaluateHand([deck.find(c => c.id === '2c'), deck.find(c => c.id === '2d'), deck.find(c => c.id === 'As')]);
      // Note: Ranks are the same, kickers are the same rank. Let's make sure the cards are identical for the final suit check.
      const identicalHandA = evaluateHand(['As', 'Ks', 'Qs', 'Js', '9s'].map(id => deck.find(c => c.id === id)));
      const identicalHandB = evaluateHand(['As', 'Ks', 'Qs', 'Js', '9s'].map(id => deck.find(c => c.id === id)));
      const result = compareEvaluatedHands(identicalHandA, identicalHandB);
      expect(result).toBe(0);
    });
  });

  describe('isValidArrangement', () => {
    it('should return true for a valid arrangement', () => {
      const tou = [deck.find(c => c.id === '2s'), deck.find(c => c.id === '3h'), deck.find(c => c.id === '4c')];
      const zhong = [deck.find(c => c.id === '5s'), deck.find(c => c.id === '5h'), deck.find(c => c.id === '6c'), deck.find(c => c.id === '7s'), deck.find(c => c.id === '8d')];
      const wei = [deck.find(c => c.id === '9s'), deck.find(c => c.id === '9h'), deck.find(c => c.id === '9c'), deck.find(c => c.id === 'Ts'), deck.find(c => c.id === 'Td')];
      const result = isValidArrangement(tou, zhong, wei);
      expect(result).toBe(true);
    });

    it('should return false for an invalid arrangement (daochong)', () => {
      const wei = [deck.find(c => c.id === '2s'), deck.find(c => c.id === '3h'), deck.find(c => c.id === '4c')];
      const zhong = [deck.find(c => c.id === '5s'), deck.find(c => c.id === '5h'), deck.find(c => c.id === '6c'), deck.find(c => c.id === '7s'), deck.find(c => c.id === '8d')];
      const tou = [deck.find(c => c.id === '9s'), deck.find(c => c.id === '9h'), deck.find(c => c.id === '9c'), deck.find(c => c.id === 'Ts'), deck.find(c => c.id === 'Td')];
      const result = isValidArrangement(tou, zhong, wei);
      expect(result).toBe(false);
    });
  });
});
