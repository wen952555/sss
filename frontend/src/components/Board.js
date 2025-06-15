// frontend_react/src/components/Board.js
import React from 'react';
import PlayerHand from './PlayerHand';
import AIPanel from './AIPanel';
import './Board.css';

const Board = ({ players, onConfirmArrangement, onAiArrangeRequest, humanPlayerId, onSelectCard, selectedCards, onArrangeDun, arrangedHumanHand }) => {
  const humanPlayer = players.find(p => p.id === humanPlayerId);

  return (
    <div className="game-board">
      <h3>十三水牌桌</h3>
      {players.map(player => (
        <PlayerHand
          key={player.id}
          player={player}
          onConfirmArrangement={onConfirmArrangement}
          isHumanPlayer={player.id === humanPlayerId}
          onSelectCard={player.id === humanPlayerId ? onSelectCard : null}
          selectedCards={player.id === humanPlayerId ? selectedCards : []}
          onArrangeDun={player.id === humanPlayerId ? onArrangeDun : null}
          arrangedPlayerHand={player.id === humanPlayerId ? arrangedHumanHand : player.arranged} // AI的牌直接用player.arranged
        />
      ))}
      {humanPlayer && !humanPlayer.confirmed && (
        <AIPanel 
            onAiArrangeRequest={onAiArrangeRequest}
            disabled={!humanPlayer || humanPlayer.confirmed}
        />
      )}
    </div>
  );
};

export default Board;
