// frontend/src/components/Room.js
import React from 'react';
import GameBoard from './GameBoard';
import HandDisplay from './HandDisplay';
import socket from '../socket';
import './Room.css';

// 辅助函数：从后端评估结果获取牌型名称
const getHandTypeNameFromEval = (evaluation) => {
    if (evaluation && evaluation.name) return evaluation.name;
    const localHandTypeNames = {0: '乌龙', 1: '一对', 2: '两对', 3: '三条', 4: '顺子', 5: '同花', 6: '葫芦', 7: '铁支', 8: '同花顺'};
    return evaluation && localHandTypeNames[evaluation.type] !== undefined ? localHandTypeNames[evaluation.type] : '未知';
};

// 移除了未使用的 mapAiCardIdsToObjects 函数
// const mapAiCardIdsToObjects = (cardIds, allCardsInGameDeck) => { ... };


const Room = ({ roomId, roomData, myPlayerId, onArrangementInvalid }) => {
    if (!roomData || !roomData.players || !myPlayerId) {
        return (
            <div className="room-container">
                <div className="room-header-info"><h2>十三水 AI 对战</h2></div>
                <p className="loading-text">正在加载房间信息或等待玩家ID...</p>
            </div>
        );
    }

    const { players, gameState, gameLog, isAIRoom, prompt } = roomData;
    const me = players.find(p => p.id === myPlayerId && !p.isAI);
    const aiOpponents = players.filter(p => p.isAI);

    if (!me && isAIRoom) {
        console.error("Room.js: Human player (me) not found in AI room. My ID:", myPlayerId, "Players:", players);
        return (
            <div className="room-container">
                <div className="room-header-info"><h2>十三水 AI 对战</h2></div>
                <p className="error-message">错误：无法找到您的玩家信息。请尝试刷新页面。</p>
            </div>
        );
    }
    
    if (!isAIRoom && !me) {
         return <div className="room-container"><p>错误：非AI房间缺少玩家信息。</p></div>;
    }

    return (
        <div className="room-container">
            <div className="room-header-info">
                <h2>房间号: {roomId} {isAIRoom && "(AI对战)"}</h2>
                {me && <h4>欢迎, {me.name}! 分数: {me.score}</h4>}
            </div>
            {gameState && <div className={`game-state-banner ${gameState.toLowerCase()}`}>游戏状态: {gameState}</div>}

            {isAIRoom && aiOpponents.length > 0 && (
                <div className="ai-opponents-banner">
                    {aiOpponents.map(ai => {
                        const aiFrontDunCards = ai.arrangedHands?.front || [];
                        const aiMiddleDunCards = ai.arrangedHands?.middle || [];
                        const aiBackDunCards = ai.arrangedHands?.back || [];

                        return (
                            <div key={ai.id} className="player-info opponent-info">
                                <h4>{ai.name} (AI) - 分数: {ai.score}</h4>
                                {gameState === 'waiting' && <p className="status-text">准备就绪</p>}
                                {gameState === 'arranging' && <p className="status-text">{ai.hasSubmitted ? '已提交' : 'AI思考中...'}</p>}
                                {(gameState === 'comparing' || gameState === 'ended' || (gameState === 'arranging' && ai.hasSubmitted)) && (
                                    <div className="arranged-hands-display opponent-hands">
                                        <HandDisplay title="头" cardObjects={aiFrontDunCards} handEvaluation={{name: getHandTypeNameFromEval(ai.arrangedHandsEvaluated?.front)}} cardStyle={{width: '30px', height: '45px', margin: '1px'}} />
                                        <HandDisplay title="中" cardObjects={aiMiddleDunCards} handEvaluation={{name: getHandTypeNameFromEval(ai.arrangedHandsEvaluated?.middle)}} cardStyle={{width: '30px', height: '45px', margin: '1px'}} />
                                        <HandDisplay title="尾" cardObjects={aiBackDunCards} handEvaluation={{name: getHandTypeNameFromEval(ai.arrangedHandsEvaluated?.back)}} cardStyle={{width: '30px', height: '45px', margin: '1px'}} />
                                    </div>
                                )}
                                 {gameState === 'comparing' && (!ai.arrangedHands || !ai.arrangedHands.front) && ai.hasSubmitted && <p className="status-text">等待比牌展示...</p>}
                            </div>
                        );
                    })}
                </div>
            )}

            {me && (gameState === 'arranging' || gameState === 'waiting' || gameState === 'dealing') && (
                 <div className="game-board-layout-container">
                    {gameState === 'waiting' && !me.isReady && (
                         <button onClick={() => socket.emit('playerIsReady', { roomId })} className="ready-button global-ready-button">
                             我准备好了！开始牌局
                         </button>
                    )}
                    {gameState === 'waiting' && me.isReady && (
                        <p className="status-text ready-text big-ready-text">已准备，等待游戏开始...</p>
                    )}

                    {(gameState === 'arranging' || gameState === 'dealing') && me.hand && me.hand.length > 0 && (
                        <GameBoard 
                            roomId={roomId} 
                            myPlayerId={myPlayerId} 
                            initialHand={me.hand}
                            onArrangementInvalid={onArrangementInvalid}
                        />
                    )}
                     {(gameState === 'arranging' || gameState === 'dealing') && (!me.hand || me.hand.length === 0) && (
                        <p className="status-text">等待发牌...</p>
                    )}
                 </div>
            )}
            
            {(gameState === 'comparing' || gameState === 'ended') && (
                <div className="results-and-log-area">
                    {me && me.arrangedHands && (
                         <div className="player-info my-info final-hands-display">
                            <h4>{me.name}的最终牌墩:</h4>
                            <div className="arranged-hands-display self-hands">
                               <HandDisplay title="头墩" cardObjects={me.arrangedHands.front} handEvaluation={{name: getHandTypeNameFromEval(me.arrangedHandsEvaluated?.front)}} />
                               <HandDisplay title="中墩" cardObjects={me.arrangedHands.middle} handEvaluation={{name: getHandTypeNameFromEval(me.arrangedHandsEvaluated?.middle)}} />
                               <HandDisplay title="尾墩" cardObjects={me.arrangedHands.back} handEvaluation={{name: getHandTypeNameFromEval(me.arrangedHandsEvaluated?.back)}} />
                            </div>
                        </div>
                    )}

                    {gameState === 'comparing' && roomData.comparisonDetails && (
                        <div className="comparison-results">
                            <h4>比牌结果:</h4>
                            <ul>
                                {roomData.comparisonDetails.map((detail, index) => {
                                     const playerA = players.find(p => p.id === detail.playerA_id);
                                     const playerB = players.find(p => p.id === detail.playerB_id);
                                     let message = "";
                                     if (detail.type === 'shoot') {
                                         const shooterPlayer = players.find(p => p.id === detail.shooter);
                                         const targetPlayer = players.find(p => p.id === detail.target);
                                         message = `${shooterPlayer?.name || '玩家'} 打枪 ${targetPlayer?.name || '玩家'}! (+${detail.extraPoints}水)`;
                                     } else if (detail.winner === 'Draw') {
                                         message = `${detail.dun.toUpperCase()}: 平局`;
                                     } else {
                                         const winnerPlayer = players.find(p => p.id === detail.winner);
                                         message = `${detail.dun.toUpperCase()}: ${winnerPlayer?.name || '玩家'} 胜 (+${detail.points}水)`;
                                     }
                                     if (detail.evalA && detail.evalB && detail.winner !== 'Draw') {
                                        message += ` (${getHandTypeNameFromEval(detail.evalA)} vs ${getHandTypeNameFromEval(detail.evalB)})`;
                                     } else if (detail.specialHandName) {
                                        const winnerOfSpecial = detail.winner === playerA?.id ? playerA : (detail.winner === playerB?.id ? playerB : null);
                                        message = `${winnerOfSpecial?.name || '玩家'} 特殊牌型 ${detail.specialHandName} (+${detail.waters}水)`;
                                     }
                                    return <li key={index}>{message}</li>;
                                })}
                            </ul>
                        </div>
                    )}

                    {gameLog && gameLog.length > 0 && (
                        <div className="game-log-section">
                            <h4>游戏记录 (最近{gameLog.slice(-3).length}局):</h4>
                            {gameLog.slice(-3).reverse().map((log, idx) => {
                                const playerAName = players.find(p=>p.id === log.playerA_id)?.name || '玩家A';
                                const playerBName = players.find(p=>p.id === log.playerB_id)?.name || '玩家B';
                                return (
                                    <details key={idx} className="log-entry">
                                       <summary>第 {log.round}局 - {playerAName} vs {playerBName}</summary>
                                       <div>
                                            {log.comparisonSummary?.map((d, i) => { // Changed from log.details to log.comparisonSummary
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
                                            {/* 假设 finalScoresInRound 存储了每个玩家ID和该局总分 */}
                                            {log.finalScoresInRound && Object.keys(log.finalScoresInRound).length > 0 && (
                                                <p>
                                                    当局后总分: {Object.entries(log.finalScoresInRound)
                                                        .map(([pid, score]) => `${players.find(p=>p.id===pid)?.name || '未知'}: ${score}`)
                                                        .join(', ')}
                                                </p>
                                            )}
                                       </div>
                                    </details>
                                );
                             })}
                        </div>
                    )}
                     {/* 下一局提示/按钮 */}
                     {/* 修正 Line 193 的 no-mixed-operators 错误 */}
                    {(gameState === 'ended' || (gameState === 'comparing' && !!roomData.prompt)) && ( // 使用 !!roomData.prompt 确保是布尔值
                        <div className="next-round-controls">
                            {roomData.prompt && <p className="game-prompt">{roomData.prompt}</p>}
                             <button onClick={() => socket.emit('playerIsReady', { roomId })} className="ready-button">
                                 准备开始下一局
                             </button>
                        </div>
                    )}
                </div>
            )}

            {/* 全局提示信息，修正 Line 193 的 no-mixed-operators 错误 */}
            {prompt && (!roomData.comparisonDetails && gameState !== 'ended') && ( // 使用括号明确优先级
                 <p className="game-prompt global-prompt">{prompt}</p>
            )}
        </div>
    );
};

export default Room;
