// frontend/src/components/Room.js
import React from 'react';
import GameBoard from './GameBoard';
import HandDisplay from './HandDisplay';
import socket from '../socket';
import './Room.css'; // 确保引入了Room.css

// 辅助函数：从后端评估结果获取牌型名称 (保持不变)
const getHandTypeNameFromEval = (evaluation) => {
    if (evaluation && evaluation.name) return evaluation.name;
    const localHandTypeNames = {0: '乌龙', 1: '一对', 2: '两对', 3: '三条', 4: '顺子', 5: '同花', 6: '葫芦', 7: '铁支', 8: '同花顺'};
    return evaluation && localHandTypeNames[evaluation.type] !== undefined ? localHandTypeNames[evaluation.type] : '未知';
};

const Room = ({ roomId, roomData, myPlayerId, onArrangementInvalid, isInitiallyLoading, connectionInfo }) => {

    // 初始加载状态或关键数据缺失时的显示
    if (isInitiallyLoading) {
        return (
            <div className="room-container room-loading-container"> {/* 添加特定类名方便样式 */}
                <div className="room-header-info"><h2>十三水 AI 对战</h2></div>
                <p className="loading-text">正在连接牌局，请稍候...</p>
                {/* 即使在加载时也显示连接状态栏 */}
                {connectionInfo && (
                    <div className="room-connection-status-bar">
                        <p>后端: {connectionInfo.backendHost}</p>
                        <p>状态: {connectionInfo.isConnected ? '已连接' : '未连接'}</p>
                    </div>
                )}
            </div>
        );
    }

    if (!roomData || !roomData.players || !myPlayerId) {
        // 非初始加载，但数据仍然无效，可能是连接后获取数据失败
        return (
            <div className="room-container room-error-container">
                <div className="room-header-info"><h2>十三水 AI 对战</h2></div>
                <p className="error-message">无法加载牌局信息。请检查网络连接或尝试刷新页面。</p>
                <button onClick={() => window.location.reload()} style={{padding: '10px 20px', fontSize: '1em', marginTop: '20px'}}>刷新页面</button>
                {connectionInfo && (
                    <div className="room-connection-status-bar">
                        <p>后端: {connectionInfo.backendHost}</p>
                        <p>状态: {connectionInfo.isConnected ? '已连接' : '正在尝试连接...'}</p>
                    </div>
                )}
            </div>
        );
    }

    // 正常获取到数据后的渲染逻辑
    const { players, gameState, gameLog, isAIRoom, prompt } = roomData;
    const me = players.find(p => p.id === myPlayerId && !p.isAI);
    const aiOpponents = players.filter(p => p.isAI);

    if (!me && isAIRoom) {
        console.error("Room.js: Human player (me) not found in AI room. My ID:", myPlayerId, "Players:", players);
        return (
            <div className="room-container room-error-container">
                <div className="room-header-info"><h2>十三水 AI 对战</h2></div>
                <p className="error-message">错误：无法找到您的玩家信息。请尝试刷新页面。</p>
                {connectionInfo && (
                    <div className="room-connection-status-bar">
                        <p>后端: {connectionInfo.backendHost}</p>
                        <p>状态: {connectionInfo.isConnected ? '已连接' : '连接中断'}</p>
                    </div>
                )}
            </div>
        );
    }
    
    if (!isAIRoom && !me) { // 这个分支理论上在当前AI对战模式下不会走到
         return (
            <div className="room-container room-error-container">
                <div className="room-header-info"><h2>十三水</h2></div>
                <p className="error-message">错误：非AI房间缺少玩家信息。</p>
                 {connectionInfo && (
                    <div className="room-connection-status-bar">
                        <p>后端: {connectionInfo.backendHost}</p>
                        <p>状态: {connectionInfo.isConnected ? '已连接' : '连接中断'}</p>
                    </div>
                )}
            </div>
        );
    }

    // --- 以下是正常的牌桌渲染逻辑 ---
    return (
        <div className="room-container">
            <div className="room-header-info">
                <h2>房间号: {roomId} {isAIRoom && "(AI对战)"}</h2>
                {me && <h4>欢迎, {me.name}! 总分: {me.score}</h4>}
            </div>
            {gameState && <div className={`game-state-banner ${gameState.toLowerCase()}`}>游戏状态: {gameState}</div>}

            {isAIRoom && aiOpponents.length > 0 && (
                <div className="ai-opponents-banner">
                    {aiOpponents.map(ai => {
                        const aiFrontDunCards = ai.arrangedHands?.front || [];
                        const aiMiddleDunCards = ai.arrangedHands?.middle || [];
                        const aiBackDunCards = ai.arrangedHands?.back || [];
                        const aiIsSubmitted = ai.hasSubmitted;
                        const aiIsReady = ai.isReady; // AI 通常总是 ready

                        return (
                            <div key={ai.id} className="player-info opponent-info">
                                <h4>{ai.name} (AI) - 分数: {ai.score}</h4>
                                {gameState === 'waiting' && aiIsReady && <p className="status-text ready-text">准备就绪</p>}
                                {gameState === 'arranging' && <p className="status-text">{aiIsSubmitted ? '已提交' : 'AI思考中...'}</p>}
                                {(gameState === 'comparing' || gameState === 'ended' || (gameState === 'arranging' && aiIsSubmitted)) && 
                                 (aiFrontDunCards.length > 0 || aiMiddleDunCards.length > 0 || aiBackDunCards.length > 0) && ( // 确保有牌才显示墩
                                    <div className="arranged-hands-display opponent-hands">
                                        <HandDisplay title="头" cardObjects={aiFrontDunCards} handEvaluation={{name: getHandTypeNameFromEval(ai.arrangedHandsEvaluated?.front)}} cardStyle={{width: '30px', height: '45px', margin: '1px', fontSize: '0.7em'}} />
                                        <HandDisplay title="中" cardObjects={aiMiddleDunCards} handEvaluation={{name: getHandTypeNameFromEval(ai.arrangedHandsEvaluated?.middle)}} cardStyle={{width: '30px', height: '45px', margin: '1px', fontSize: '0.7em'}} />
                                        <HandDisplay title="尾" cardObjects={aiBackDunCards} handEvaluation={{name: getHandTypeNameFromEval(ai.arrangedHandsEvaluated?.back)}} cardStyle={{width: '30px', height: '45px', margin: '1px', fontSize: '0.7em'}} />
                                    </div>
                                )}
                                 {gameState === 'comparing' && !ai.arrangedHands?.front?.length && aiIsSubmitted && <p className="status-text">等待比牌展示...</p>}
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
                     {(gameState === 'arranging' || gameState === 'dealing') && (!me.hand || me.hand.length === 0) && 
                      (gameState !== 'waiting') && /* 不在waiting时才显示等待发牌 */
                        <p className="status-text">等待发牌...</p>
                    }
                 </div>
            )}
            
            {(gameState === 'comparing' || gameState === 'ended') && (
                <div className="results-and-log-area">
                    {me && me.arrangedHands && me.arrangedHands.front && ( // 确保 arrangedHands 和 front 存在
                         <div className="player-info my-info final-hands-display">
                            <h4>{me.name}的最终牌墩 (总分: {me.score}):</h4>
                            <div className="arranged-hands-display self-hands">
                               <HandDisplay title="头墩" cardObjects={me.arrangedHands.front} handEvaluation={{name: getHandTypeNameFromEval(me.arrangedHandsEvaluated?.front)}} />
                               <HandDisplay title="中墩" cardObjects={me.arrangedHands.middle} handEvaluation={{name: getHandTypeNameFromEval(me.arrangedHandsEvaluated?.middle)}} />
                               <HandDisplay title="尾墩" cardObjects={me.arrangedHands.back} handEvaluation={{name: getHandTypeNameFromEval(me.arrangedHandsEvaluated?.back)}} />
                            </div>
                        </div>
                    )}

                    {gameState === 'comparing' && roomData.comparisonDetails && roomData.comparisonDetails.length > 0 && (
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
                                     } else if (detail.type === 'special_hand_win') {
                                         const winnerPlayer = players.find(p => p.id === detail.winner);
                                         message = `${winnerPlayer?.name || '玩家'} 特殊牌型 (${detail.specialHandName}) +${detail.waters}水`;
                                     } else if (detail.winner === 'Draw') {
                                         message = `${detail.dun?.toUpperCase() || '墩'}: 平局`;
                                     } else {
                                         const winnerPlayer = players.find(p => p.id === detail.winner);
                                         message = `${detail.dun?.toUpperCase() || '墩'}: ${winnerPlayer?.name || '玩家'} 胜 (+${detail.points}水)`;
                                     }

                                     if (detail.evalA && detail.evalB && detail.winner !== 'Draw' && detail.type !== 'special_hand_win' && detail.type !== 'shoot') {
                                        message += ` (${getHandTypeNameFromEval(detail.evalA)} vs ${getHandTypeNameFromEval(detail.evalB)})`;
                                     }
                                    return <li key={index}>{message}</li>;
                                })}
                            </ul>
                        </div>
                    )}

                    {gameLog && gameLog.length > 0 && (
                        <div className="game-log-section">
                            <h4>游戏记录 (最近{gameLog.slice(-Math.min(3, gameLog.length)).length}局):</h4>
                            {gameLog.slice(-Math.min(3, gameLog.length)).reverse().map((log, idx) => {
                                const playersInvolvedNames = log.playersInvolved?.map(pid => players.find(p=>p.id === pid)?.name || `玩家${pid.slice(0,2)}`).join(' vs ') || "未知对局";
                                return (
                                    <details key={idx} className="log-entry">
                                       <summary>第 {log.round}局 - {playersInvolvedNames}</summary>
                                       <div>
                                            {log.comparisonSummary?.map((d, i) => {
                                                 const winnerPlayer = players.find(p => p.id === d.winner);
                                                 const shooterPlayer = players.find(p => p.id === d.shooter);
                                                 const targetPlayer = players.find(p => p.id === d.target);
                                                 let logDetailMsg = "";
                                                 if (d.type === 'shoot') {
                                                     logDetailMsg = `${shooterPlayer?.name || '玩家'} 打枪 ${targetPlayer?.name || '玩家'}!`;
                                                 } else if (d.type === 'special_hand_win') {
                                                     logDetailMsg = `${winnerPlayer?.name || '玩家'} 特殊牌型 (${d.specialHandName})`;
                                                 } else if (d.winner === 'Draw') {
                                                     logDetailMsg = `${d.dun?.toUpperCase()}: 平局`;
                                                 } else {
                                                     logDetailMsg = `${d.dun?.toUpperCase()}: ${(winnerPlayer?.name || '玩家') + ' 胜'}`;
                                                 }
                                                return <p key={i}>{logDetailMsg}</p>;
                                            })}
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
                    {(gameState === 'ended' || (gameState === 'comparing' && roomData.prompt)) && (
                        <div className="next-round-controls">
                            {roomData.prompt && <p className="game-prompt">{roomData.prompt}</p>}
                             <button onClick={() => socket.emit('playerIsReady', { roomId })} className="ready-button">
                                 准备开始下一局
                             </button>
                        </div>
                    )}
                </div>
            )}
            
            {prompt && (!roomData.comparisonDetails && gameState !== 'ended' && gameState !== 'comparing') && 
                <p className="game-prompt global-prompt">{prompt}</p>
            }

            {/* 新增：在房间底部显示连接状态栏 */}
            {connectionInfo && (
                <div className="room-connection-status-bar">
                    <p>后端: {connectionInfo.backendHost}</p>
                    <p>连接: {connectionInfo.isConnected ? '已连接' : '断开连接 - 尝试重连...'}</p>
                </div>
            )}
        </div>
    );
};

export default Room;
