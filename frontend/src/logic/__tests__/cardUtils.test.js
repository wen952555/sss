// frontend/src/logic/__tests__/cardUtils.test.js
import { createDeck, shuffleDeck, evaluateHand, compareEvaluatedHands, isValidArrangement } from '../cardUtils';

describe('cardUtils', () => {
  describe('createDeck', () => {
    it('should create a deck of 52 cards', () => {
      const deck = createDeck();
      expect(deck.length).toBe(52);
    });
  });

  describe('shuffleDeck', () => {
    it('should shuffle the deck', () => {
      const deck1 = createDeck();
      const deck2 = shuffleDeck([...deck1]);
      expect(deck1).not.toEqual(deck2);
    });
  });

  describe('evaluateHand', () => {
    it('should correctly evaluate a high card hand', () => {
      const hand = [{ value: 2 }, { value: 4 }, { value: 6 }];
      const result = evaluateHand(hand);
      expect(result.rank).toBe(0); // High Card
    });

    it('should correctly evaluate a pair', () => {
      const hand = [{ value: 2 }, { value: 2 }, { value: 6 }];
      const result = evaluateHand(hand);
      expect(result.rank).toBe(1); // Pair
    });
  });

  describe('compareEvaluatedHands', () => {
    it('should correctly compare two hands', () => {
      const hand1 = { rank: 1, value: 2 }; // Pair of 2s
      const hand2 = { rank: 0, value: 6 }; // High card 6
      const result = compareEvaluatedHands(hand1, hand2);
      expect(result).toBeGreaterThan(0);
    });
  });

  describe('isValidArrangement', () => {
    it('should return true for a valid arrangement', () => {
      const tou = [{ value: 2 }, { value: 3 }, { value: 4 }];
      const zhong = [{ value: 5 }, { value: 5 }, { value: 6 }, { value: 7 }, { value: 8 }];
      const wei = [{ value: 9 }, { value: 9 }, { value: 9 }, { value: 10 }, { value: 10 }];
      const result = isValidArrangement(tou, zhong, wei);
      expect(result).toBe(true);
    });

    it('should return false for an invalid arrangement', () => {
        const tou = [{ value: 9 }, { value: 9 }, { value: 9 }, { value: 10 }, { value: 10 }];
        const zhong = [{ value: 5 }, { value: 5 }, { value: 6 }, { value: 7 }, { value: 8 }];
        const wei = [{ value: 2 }, { value: 3 }, { value: 4 }];
        const result = isValidArrangement(tou, zhong, wei);
        expect(result).toBe(false);
      });
  });
});
