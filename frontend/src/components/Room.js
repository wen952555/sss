// frontend/src/components/Room.js
import React from 'react';
import GameBoard from './GameBoard';
import HandDisplay from './HandDisplay';
// 移除了未使用的 cardUtils 导入
import socket from '../socket';
import './Room.css';


const Room = ({ roomId, roomData, myPlayerId, onArrangementInvalid }) => {
    if (!roomData || !roomData.players || !myPlayerId) { // Added myPlayerId check
        return <div className="room-container"><p>正在加载房间信息或等待玩家ID...</p></div>;
    }

    const { players, gameState, gameLog } = roomData;
    const me = players.find(p => p.id === myPlayerId);
    const opponents = players.filter(p => p.id !== myPlayerId);

    // 如果 me 对象找不到，说明当前玩家不在后端发送的 players 列表中，这可能是一个同步问题或错误
    if (!me) {
        console.error("Current player (me) not found in roomData.players. My ID:", myPlayerId, "Players:", players);
        // 可以尝试请求一次房间状态更新，或者提示用户
        // socket.emit('requestRoomState', roomId); // 谨慎使用，避免循环
        return <div className="room-container"><p>错误：无法找到当前玩家信息。请尝试刷新或重新加入。</p></div>;
    }


    const handleReadyClick = () => {
        socket.emit('playerIsReady', { roomId });
    };

    const mapCardIdsToObjects = (cardIds, sourceHand) => {
        if (!cardIds || !sourceHand || sourceHand.length === 0) return [];
        return cardIds.map(id => {
            const card = sourceHand.find(card => card.id === id);
            if (!card) {
                console.warn(`Card with id ${id} not found in sourceHand for mapping.`);
                return {id, rank:'?', suit:'?', value: 0}; // Fallback placeholder
            }
            return card;
        });
    };
    
    const getPlayerArrangedCardObjects = (player) => {
        // 后端在 showResults 时会发送完整的 arrangedHands (包含牌对象)
        // 否则，它可能是牌的ID数组，需要从 player.hand 映射
        if (player && player.arrangedHands) {
            if (player.arrangedHands.front && typeof player.arrangedHands.front[0] === 'object') {
                return player.arrangedHands; // 已经是牌对象了
            } else if (player.hand && player.hand.length > 0) {
                // 是牌ID，需要映射
                return {
                    front: mapCardIdsToObjects(player.arrangedHands.front, player.hand),
                    middle: mapCardIdsToObjects(player.arrangedHands.middle, player.hand),
                    back: mapCardIdsToObjects(player.arrangedHands.back, player.hand),
                };
            }
        }
        return { front: [], middle: [], back: [] }; // 返回空墩结构避免后续访问undefined
    }

    const myArrangedCardObjects = getPlayerArrangedCardObjects(me);
    
    const getHandTypeNameFromEval = (evaluation) => {
        // 假设后端发送的 evaluation.name 是可读的牌型名称
        // 或者如果发送的是 type (数字)，我们需要一个映射表
        // 我们在 gameLogic.js 中有 HAND_TYPE_NAMES，可以考虑在前端也维护一个
        // 或者让后端直接发送 name
        if (evaluation && evaluation.name) return evaluation.name;
        // 简单的数字到名称的映射 (应与后端 gameLogic.js 中的 HAND_TYPE_NAMES 一致)
        const localHandTypeNames = {0: '乌龙', 1: '一对', 2: '两对', 3: '三条', 4: '顺子', 5: '同花', 6: '葫芦', 7: '铁支', 8: '同花顺'};
        return evaluation && localHandTypeNames[evaluation.type] ? localHandTypeNames[evaluation.type] : '未知';
    }


    return (
        <div className="room-container">
            <h2>房间号: {roomId}</h2>
            <p className={`game-state game-state-${gameState?.toLowerCase()}`}>游戏状态: {gameState || '未知'}</p>

            <div className="players-area">
                {/* 我的信息区域 */}
                <div className="player-info my-info">
                    <h4>我的信息 ({me.name}) - 分数: {me.score}</h4>
                    {gameState === 'waiting' && !me.isReady && (
                        <button onClick={handleReadyClick} className="ready-button">准备</button>
                    )}
                    {gameState === 'waiting' && me.isReady && <p className="status-text ready-text">已准备!</p>}
                    
                    {/* 理牌阶段 */}
                    {gameState === 'arranging' && !me.hasSubmitted && me.hand && me.hand.length > 0 && (
                        <GameBoard 
                            roomId={roomId} 
                            myPlayerId={myPlayerId} 
                            initialHand={me.hand}
                            onArrangementInvalid={onArrangementInvalid}
                        />
                    )}
                    {gameState === 'arranging' && !me.hasSubmitted && (!me.hand || me.hand.length === 0) && (
                        <p className="status-text">等待发牌...</p>
                    )}
                    {gameState === 'arranging' && me.hasSubmitted && <p className="status-text submitted-text">已提交牌型，等待其他玩家...</p>}

                    {/* 比牌或已提交后展示自己的牌 */}
                    {(gameState === 'comparing' || gameState === 'ended' || (gameState === 'arranging' && me.hasSubmitted)) && myArrangedCardObjects && (
                        <div className="arranged-hands-display self-hands">
                            <h5>我的牌墩:</h5>
                            <HandDisplay title="头墩" cardObjects={myArrangedCardObjects.front} handEvaluation={{type: me.arrangedHandsEvaluated?.front?.type, name: getHandTypeNameFromEval(me.arrangedHandsEvaluated?.front)}} />
                            <HandDisplay title="中墩" cardObjects={myArrangedCardObjects.middle} handEvaluation={{type: me.arrangedHandsEvaluated?.middle?.type, name: getHandTypeNameFromEval(me.arrangedHandsEvaluated?.middle)}} />
                            <HandDisplay title="尾墩" cardObjects={myArrangedCardObjects.back} handEvaluation={{type: me.arrangedHandsEvaluated?.back?.type, name: getHandTypeNameFromEval(me.arrangedHandsEvaluated?.back)}} />
                        </div>
                    )}
                </div>

                {/* 对手信息区域 */}
                {opponents.map(opponent => {
                    const opponentArrangedCardObjects = getPlayerArrangedCardObjects(opponent);
                    return (
                        <div key={opponent.id} className="player-info opponent-info">
                            <h4>{opponent.name} - 分数: {opponent.score}</h4>
                            {gameState === 'waiting' && <p className="status-text">{opponent.isReady ? '已准备' : '等待中...'}</p>}
                            {gameState === 'arranging' && <p className="status-text">{opponent.hasSubmitted ? '已提交牌型' : '正在理牌...'}</p>}
                            
                            {(gameState === 'comparing' || gameState === 'ended') && opponentArrangedCardObjects && (
                                <div className="arranged-hands-display opponent-hands">
                                    <h5>{opponent.name}的牌墩:</h5>
                                    <HandDisplay title="头墩" cardObjects={opponentArrangedCardObjects.front} handEvaluation={{type: opponent.arrangedHandsEvaluated?.front?.type, name: getHandTypeNameFromEval(opponent.arrangedHandsEvaluated?.front)}}/>
                                    <HandDisplay title="中墩" cardObjects={opponentArrangedCardObjects.middle} handEvaluation={{type: opponent.arrangedHandsEvaluated?.middle?.type, name: getHandTypeNameFromEval(opponent.arrangedHandsEvaluated?.middle)}}/>
                                    <HandDisplay title="尾墩" cardObjects={opponentArrangedCardObjects.back} handEvaluation={{type: opponent.arrangedHandsEvaluated?.back?.type, name: getHandTypeNameFromEval(opponent.arrangedHandsEvaluated?.back)}}/>
                                </div>
                            )}
                            {gameState === 'comparing' && !opponentArrangedCardObjects.front?.length && opponent.hasSubmitted && <p className="status-text">等待比牌展示...</p>}
                        </div>
                    );
                })}
            </div>

            {/* 比牌结果 */}
            {gameState === 'comparing' && roomData.comparisonDetails && (
                <div className="comparison-results">
                    <h4>比牌结果:</h4>
                    <ul>
                        {roomData.comparisonDetails.map((detail, index) => {
                             const winnerPlayer = players.find(p => p.id === detail.winner);
                             const shooterPlayer = players.find(p => p.id === detail.shooter);
                             const targetPlayer = players.find(p => p.id === detail.target);
                            return (
                                <li key={index}>
                                    {detail.type === 'shoot' 
                                        ? `${shooterPlayer?.name || '玩家'} 打枪 ${targetPlayer?.name || '玩家'}! (得分 x${detail.multiplier})`
                                        : `${detail.dun.toUpperCase()}: ${detail.winner === 'Draw' ? '平局' : `${winnerPlayer?.name || '玩家'} 胜 (+${detail.points} 水)`}`
                                    }
                                    {/* 可选: 显示双方牌型 */}
                                    {detail.evalA && detail.evalB && detail.winner !== 'Draw' && (
                                        <span className="comparison-hand-types">
                                            ({getHandTypeNameFromEval(detail.evalA)} vs {getHandTypeNameFromEval(detail.evalB)})
                                        </span>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}

            {/* 游戏记录 */}
            {gameLog && gameLog.length > 0 && (
                <div className="game-log-section">
                    <h4>游戏记录 (最近{gameLog.slice(-3).length}局):</h4>
                    {gameLog.slice(-3).reverse().map((log, index) => {
                        const playerAName = players.find(p=>p.id === log.playerA_id)?.name || '玩家A';
                        const playerBName = players.find(p=>p.id === log.playerB_id)?.name || '玩家B';
                        return (
                            <details key={index} className="log-entry">
                                <summary>第 {log.round}局 - {playerAName} vs {playerBName}</summary>
                                <div>
                                    {log.details?.map((d, i) => {
                                         const winnerPlayer = players.find(p => p.id === d.winner);
                                         const shooterPlayer = players.find(p => p.id === d.shooter);
                                         const targetPlayer = players.find(p => p.id === d.target);
                                        return (
                                            <p key={i}>
                                                {d.type === 'shoot' 
                                                    ? `${shooterPlayer?.name || '玩家'} 打枪 ${targetPlayer?.name || '玩家'}!`
                                                    : `${d.dun}: ${d.winner === 'Draw' ? '平' : ((winnerPlayer?.name || '玩家') + ' 胜')}`
                                                }
                                            </p>
                                        );
                                    })}
                                    <p>
                                        得分: {playerAName}: {log.scores[log.playerA_id]}, {playerBName}: {log.scores[log.playerB_id]}
                                    </p>
                                </div>
                            </details>
                        );
                     })}
                </div>
            )}
            {/* 提示信息 */}
             {roomData.prompt && <p className="game-prompt">{roomData.prompt}</p>}
        </div>
    );
};

export default Room;
