// frontend/src/logic/__tests__/gameLogic.test.js
import { startGame, confirmArrangement, compareAllHands, initialGameState } from '../gameLogic';

describe('gameLogic', () => {
  describe('startGame', () => {
    it('should deal 13 cards to each player', () => {
      const state = startGame(initialGameState);
      state.players.forEach(player => {
        expect(player.hand.length).toBe(13);
      });
    });
  });

  describe('confirmArrangement', () => {
    it('should confirm the arrangement for a player', () => {
      const state = startGame(initialGameState);
      const player = state.players[0];
      const arranged = {
        tou: player.hand.slice(0, 3),
        zhong: player.hand.slice(3, 8),
        wei: player.hand.slice(8, 13),
      };
      const newState = confirmArrangement(state, player.id, arranged);
      const updatedPlayer = newState.players.find(p => p.id === player.id);
      expect(updatedPlayer.confirmed).toBe(true);
      expect(updatedPlayer.evalHands).not.toBeNull();
    });
  });

  describe('compareAllHands', () => {
    it('should compare all hands and update scores', () => {
        let state = startGame(initialGameState);
        state.players.forEach((player, index) => {
            const arranged = {
                tou: player.hand.slice(0, 3),
                zhong: player.hand.slice(3, 8),
                wei: player.hand.slice(8, 13),
            };
            state = confirmArrangement(state, player.id, arranged);
        });
        const newState = compareAllHands(state);
        expect(newState.roundResults).not.toBeNull();
        let totalScore = 0;
        newState.players.forEach(p => totalScore += p.score);
        expect(totalScore).toBe(0);
    });
  });
});
