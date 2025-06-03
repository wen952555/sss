// frontend/src/components/Room.js
import React from 'react';
import GameBoard from './GameBoard';
import HandDisplay from './HandDisplay';
import { sortHand, getCardImageFilename, getCardDisplayName, RANKS_VALUE, getHandTypeName } from '../utils/cardUtils'; // 确保导入RANKS_VALUE
import socket from '../socket';
import './Room.css';


const Room = ({ roomId, roomData, myPlayerId, onArrangementInvalid }) => {
    if (!roomData || !roomData.players) {
        return <div className="room-container"><p>正在加载房间信息...</p></div>;
    }

    const { players, gameState, gameLog } = roomData;
    const me = players.find(p => p.id === myPlayerId);
    const opponents = players.filter(p => p.id !== myPlayerId);

    const handleReadyClick = () => {
        socket.emit('playerIsReady', { roomId });
    };

    // Helper to get full card objects from IDs, using a player's hand
    const mapCardIdsToObjects = (cardIds, sourceHand) => {
        if (!cardIds || !sourceHand) return [];
        return cardIds.map(id => sourceHand.find(card => card.id === id) || {id, rank:'?', suit:'?'}); // Fallback for safety
    };

    // Find a player's original full hand (needed for mapCardIdsToObjects)
    // This relies on the server sending the full hand for 'me', or a cached version.
    // For opponents, we might not have their full hand unless it's the end of a round.
    // For simplicity, we assume `me.hand` is populated when needed.
    // And for opponents, `gameLog` entries will contain their `arrangedHands` (IDs)
    // and we'd need a way to get their full cards if we want to display images from just IDs.
    // The backend now sends arrangedHands with full card objects in 'showResults'
    // so player.arrangedHands should contain full card objects after results.

    const getLastRoundLogForPlayer = (playerId) => {
        if (!gameLog || gameLog.length === 0) return null;
        const lastRound = gameLog[gameLog.length - 1];
        if (!lastRound) return null;
        if (lastRound.playerA_id === playerId) {
            return {
                hands: lastRound.playerA_hands, // these are IDs
                evals: lastRound.playerA_eval,
                // We need the original hand to map IDs to full cards for display
                // This is tricky if we don't store original hands with logs
            };
        }
        if (lastRound.playerB_id === playerId) {
             return {
                hands: lastRound.playerB_hands,
                evals: lastRound.playerB_eval
            };
        }
        return null;
    };
    
    // Helper to get full card objects from the main `players` array
    // if arrangedHands contains full card objects (as sent by 'showResults')
    const getPlayerArrangedCardObjects = (player) => {
        if (player && player.arrangedHands && typeof player.arrangedHands.front?.[0] === 'object') {
            return player.arrangedHands;
        }
        return null; // or try to map from a stored full hand if only IDs are present
    }


    return (
        <div className="room-container">
            <h2>房间号: {roomId}</h2>
            <p>游戏状态: {gameState}</p>

            <div className="players-area">
                <div className="player-info my-info">
                    <h4>我的信息 ({me ? me.name : '未知'}) - 分数: {me ? me.score : 0}</h4>
                    {me && gameState === 'waiting' && !me.isReady && (
                        <button onClick={handleReadyClick} className="ready-button">准备</button>
                    )}
                    {me && me.isReady && gameState === 'waiting' && <p>已准备!</p>}
                    {me && gameState === 'arranging' && !me.hasSubmitted && (
                        <GameBoard 
                            roomId={roomId} 
                            myPlayerId={myPlayerId} 
                            initialHand={me.hand}
                            onArrangementInvalid={onArrangementInvalid} // Pass down the prop
                        />
                    )}
                    {me && me.hasSubmitted && gameState === 'arranging' && <p>已提交牌型，等待其他玩家...</p>}
                    {me && (gameState === 'comparing' || gameState === 'ended' || (gameState === 'arranging' && me.hasSubmitted)) && me.arrangedHands && (
                        <div className="arranged-hands-display">
                            <h5>我的牌墩:</h5>
                            <HandDisplay title="头墩" cardObjects={getPlayerArrangedCardObjects(me)?.front || mapCardIdsToObjects(me.arrangedHands.front, me.hand)} handEvaluation={me.arrangedHandsEvaluated?.front} />
                            <HandDisplay title="中墩" cardObjects={getPlayerArrangedCardObjects(me)?.middle || mapCardIdsToObjects(me.arrangedHands.middle, me.hand)} handEvaluation={me.arrangedHandsEvaluated?.middle} />
                            <HandDisplay title="尾墩" cardObjects={getPlayerArrangedCardObjects(me)?.back || mapCardIdsToObjects(me.arrangedHands.back, me.hand)} handEvaluation={me.arrangedHandsEvaluated?.back} />
                        </div>
                    )}
                </div>

                {opponents.map(opponent => {
                    const opponentArrangedCardObjects = getPlayerArrangedCardObjects(opponent);
                    // Opponent's hand (IDs) for display if game state allows
                    const opponentHandsForDisplay = (gameState === 'comparing' || gameState === 'ended') ? opponent.arrangedHands : null;
                    const opponentEvalsForDisplay = (gameState === 'comparing' || gameState === 'ended') ? opponent.arrangedHandsEvaluated : null;

                    return (
                        <div key={opponent.id} className="player-info opponent-info">
                            <h4>{opponent.name} - 分数: {opponent.score}</h4>
                            {gameState === 'waiting' && <p>{opponent.isReady ? '已准备' : '等待中...'}</p>}
                            {gameState === 'arranging' && <p>{opponent.hasSubmitted ? '已提交牌型' : '正在理牌...'}</p>}
                            {(gameState === 'comparing' || gameState === 'ended') && opponentArrangedCardObjects && (
                                <div className="arranged-hands-display">
                                    <h5>{opponent.name}的牌墩:</h5>
                                     {/* If opponentArrangedCardObjects are full objects: */}
                                    <HandDisplay title="头墩" cardObjects={opponentArrangedCardObjects.front} handEvaluation={opponentEvalsForDisplay?.front}/>
                                    <HandDisplay title="中墩" cardObjects={opponentArrangedCardObjects.middle} handEvaluation={opponentEvalsForDisplay?.middle}/>
                                    <HandDisplay title="尾墩" cardObjects={opponentArrangedCardObjects.back} handEvaluation={opponentEvalsForDisplay?.back}/>
                                </div>
                            )}
                             {gameState === 'comparing' && !opponentArrangedCardObjects && opponent.hasSubmitted && <p>等待比牌展示...</p>}
                        </div>
                    );
                })}
            </div>

            {gameState === 'comparing' && roomData.comparisonDetails && (
                <div className="comparison-results">
                    <h4>比牌结果:</h4>
                    <ul>
                        {roomData.comparisonDetails.map((detail, index) => (
                            <li key={index}>
                                {detail.type === 'shoot' 
                                    ? `${players.find(p=>p.id === detail.shooter)?.name} 打枪 ${players.find(p=>p.id === detail.target)?.name}! (得分 x${detail.multiplier})`
                                    : `${detail.dun.toUpperCase()}: ${detail.winner === 'Draw' ? '平局' : `${players.find(p=>p.id === detail.winner)?.name} 胜 (+${detail.points} 水)`}`
                                }
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {gameLog && gameLog.length > 0 && (
                <div className="game-log-section">
                    <h4>游戏记录:</h4>
                    {gameLog.slice(-3).reverse().map((log, index) => ( // Display last 3 rounds
                        <details key={index} className="log-entry">
                            <summary>第 {log.round}局 - {players.find(p=>p.id === log.playerA_id)?.name} vs {players.find(p=>p.id === log.playerB_id)?.name}</summary>
                            <div>
                                {log.details.map((d, i) => (
                                    <p key={i}>
                                        {d.type === 'shoot' 
                                            ? `${players.find(p=>p.id === d.shooter)?.name} 打枪 ${players.find(p=>p.id === d.target)?.name}!`
                                            : `${d.dun}: ${d.winner === 'Draw' ? '平' : (players.find(p=>p.id === d.winner)?.name + ' 胜')}`
                                        }
                                    </p>
                                ))}
                                <p>
                                    得分: {players.find(p=>p.id === log.playerA_id)?.name}: {log.scores[log.playerA_id]},
                                    {players.find(p=>p.id === log.playerB_id)?.name}: {log.scores[log.playerB_id]}
                                </p>
                                {/* Optionally display full hands from the log if needed and data is structured for it */}
                            </div>
                        </details>
                    ))}
                </div>
            )}
             {roomData.prompt && <p className="game-prompt">{roomData.prompt}</p>}

        </div>
    );
};

export default Room;
