import React from 'react';
import CardArea from './CardArea';
import './GameTable.css';

const GameTable = ({ playerArrangement, opponentHands, onCardClick, selectedCards }) => {
    const { head, middle, tail, unassigned } = playerArrangement;

    return (
        <div className="game-table">

            {/* Opponent Areas */}
            <div className="opponents-container">
                {opponentHands.map((opp, index) => (
                    <div key={index} className="opponent-area">
                         <div className="player-info">
                            <div className="avatar-placeholder"></div>
                            <span>{opp.name || `Player ${index + 2}`}</span>
                        </div>
                        <CardArea cardCount={13} cards={[]} />
                    </div>
                ))}
            </div>

            {/* Player's Card Arrangement Area */}
            <div className="player-arrangement-area">
                <CardArea
                    title="头道"
                    cardCount={3}
                    cards={head}
                    className="arrangement-head"
                    onCardClick={onCardClick}
                    selectedCards={selectedCards}
                />
                 <CardArea
                    title="中道"
                    cardCount={5}
                    cards={middle}
                    className="arrangement-middle"
                    onCardClick={onCardClick}
                    selectedCards={selectedCards}
                />
                 <CardArea
                    title="尾道"
                    cardCount={5}
                    cards={tail}
                    className="arrangement-tail"
                    onCardClick={onCardClick}
                    selectedCards={selectedCards}
                />
            </div>

             {/* Player's Unassigned Cards */}
            <div className="player-hand-area">
                <CardArea
                    title="我的手牌"
                    cardCount={13}
                    cards={unassigned}
                    onCardClick={onCardClick}
                    selectedCards={selectedCards}
                />
            </div>
        </div>
    );
};

export default GameTable;
