// frontend/src/components/Room.js
import React from 'react';
import GameBoard from './GameBoard'; // GameBoard 将负责中间的主要操作区域
import HandDisplay from './HandDisplay'; // AI对手的牌墩也用HandDisplay展示
import socket from '../socket';
import './Room.css'; // 引入我们修改后的 Room.css

// 辅助函数：从后端评估结果获取牌型名称
const getHandTypeNameFromEval = (evaluation) => {
    if (evaluation && evaluation.name) return evaluation.name;
    const localHandTypeNames = {0: '乌龙', 1: '一对', 2: '两对', 3: '三条', 4: '顺子', 5: '同花', 6: '葫芦', 7: '铁支', 8: '同花顺'};
    return evaluation && localHandTypeNames[evaluation.type] !== undefined ? localHandTypeNames[evaluation.type] : '未知';
};

// 辅助函数：将牌ID数组映射回牌对象（用于AI牌墩展示）
// 注意：这个函数需要能访问到AI玩家的完整手牌，如果后端不直接提供AI的原始手牌给前端
// 那么在展示AI牌墩时，如果只有ID，就无法显示图片。
// 假设后端在 'showResults' 或 'roomStateUpdate' 的 players 对象中，
// AI的 arrangedHands 已经是包含完整牌对象的了（或者有一个单独的字段）。
// 如果不是，这里的映射逻辑需要调整，或者让后端直接发送AI的牌墩对象。
// 为简化，我们假设后端在适当的时候会提供AI的完整牌墩对象。
const mapAiCardIdsToObjects = (cardIds, allCardsInGameDeck) => { // allCardsInGameDeck 可以是一个包含所有可能牌的查找表
    if (!cardIds || !allCardsInGameDeck) return [];
    // 这个实现比较粗糙，理想情况下后端应该直接提供AI摆好的牌墩对象
    // 或者前端在收到AI的牌墩ID时，能从某个地方（如一个完整的牌库副本）查到牌对象
    // 暂时我们假设 cardIds 里的元素已经是牌对象，或者需要一种方式从ID转换
    // 如果后端发送的AI.arrangedHands已经是对象数组，则这个函数用不上
    return cardIds.map(idOrCard => {
        if (typeof idOrCard === 'object' && idOrCard.id) return idOrCard; // 已经是对象
        const card = allCardsInGameDeck.find(c => c.id === idOrCard);
        return card || { id: idOrCard, rank: '?', suit: '?', value: 0 }; // 未找到则返回占位符
    });
};


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
    const me = players.find(p => p.id === myPlayerId && !p.isAI); // 确保 me 是真人玩家
    const aiOpponents = players.filter(p => p.isAI);

    if (!me && isAIRoom) { // 如果是AI房但找不到真人玩家（可能ID还未同步或出错）
        console.error("Room.js: Human player (me) not found in AI room. My ID:", myPlayerId, "Players:", players);
        return (
            <div className="room-container">
                <div className="room-header-info"><h2>十三水 AI 对战</h2></div>
                <p className="error-message">错误：无法找到您的玩家信息。请尝试刷新页面。</p>
            </div>
        );
    }
    
    // 如果不是AI房，或者没有真人玩家且不是AI房（理论上不应该发生），可以显示不同的UI或错误
    if (!isAIRoom && !me) {
         return <div className="room-container"><p>错误：非AI房间缺少玩家信息。</p></div>;
    }


    return (
        <div className="room-container">
            {/* 房间号和游戏状态显示 */}
            <div className="room-header-info">
                <h2>房间号: {roomId} {isAIRoom && "(AI对战)"}</h2>
                {me && <h4>欢迎, {me.name}! 分数: {me.score}</h4>}
            </div>
            {gameState && <div className={`game-state-banner ${gameState.toLowerCase()}`}>游戏状态: {gameState}</div>}


            {/* 第1道横幅：AI对手区域 */}
            {isAIRoom && aiOpponents.length > 0 && (
                <div className="ai-opponents-banner">
                    {aiOpponents.map(ai => {
                        // 假设 ai.arrangedHands 已经是包含牌对象的墩了（由后端处理好）
                        // 或者我们需要一种方式将 ai.arrangedHands (如果是ID数组) 转换为对象数组
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
                                        {/* AI的牌墩通常在比牌时才完全展示，或者只展示背面/张数 */}
                                        {/* 这里我们假设后端在适当的时候会填充 ai.arrangedHands 和 ai.arrangedHandsEvaluated */}
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

            {/* 包裹 GameBoard 的容器，GameBoard 内部实现第2、3、4、5道横幅 */}
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
                            initialHand={me.hand} // 传递真人玩家的手牌
                            onArrangementInvalid={onArrangementInvalid}
                        />
                    )}
                     {(gameState === 'arranging' || gameState === 'dealing') && (!me.hand || me.hand.length === 0) && (
                        <p className="status-text">等待发牌...</p>
                    )}
                 </div>
            )}
            
            {/* 比牌结果和游戏日志区 (可以放在 GameBoard 外部，占据下方空间) */}
            {/* 如果希望这些也在横幅中，需要调整 GameBoard 或这里的结构 */}
            {(gameState === 'comparing' || gameState === 'ended') && (
                <div className="results-and-log-area">
                    {/* 真人玩家的最终牌墩展示 (比牌时) */}
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

                    {/* 比牌结果 */}
                    {gameState === 'comparing' && roomData.comparisonDetails && (
                        <div className="comparison-results">
                            <h4>比牌结果:</h4>
                            <ul>
                                {roomData.comparisonDetails.map((detail, index) => {
                                    // ... (比牌细节的渲染逻辑保持不变) ...
                                     const playerA = players.find(p => p.id === detail.playerA_id); // 可能是真人
                                     const playerB = players.find(p => p.id === detail.playerB_id); // 可能是AI
                                     let message = "";
                                     if (detail.type === 'shoot') {
                                         message = `${playerA?.name} 打枪 ${playerB?.name}! (+${detail.extraPoints}水)`;
                                     } else if (detail.winner === 'Draw') {
                                         message = `${detail.dun.toUpperCase()}: 平局`;
                                     } else {
                                         const winnerPlayer = players.find(p => p.id === detail.winner);
                                         message = `${detail.dun.toUpperCase()}: ${winnerPlayer?.name} 胜 (+${detail.points}水)`;
                                     }
                                     if (detail.evalA && detail.evalB && detail.winner !== 'Draw') {
                                        message += ` (${getHandTypeNameFromEval(detail.evalA)} vs ${getHandTypeNameFromEval(detail.evalB)})`;
                                     } else if (detail.specialHandName) {
                                        message = `${detail.winner === playerA?.id ? playerA?.name : playerB?.name} 特殊牌型 ${detail.specialHandName} (+${detail.waters}水)`;
                                     }


                                    return <li key={index}>{message}</li>;
                                })}
                            </ul>
                        </div>
                    )}

                    {/* 游戏日志 */}
                    {gameLog && gameLog.length > 0 && (
                        <div className="game-log-section">
                            <h4>游戏记录 (最近{gameLog.slice(-3).length}局):</h4>
                            {/* ... (游戏日志渲染逻辑保持不变) ... */}
                            {gameLog.slice(-3).reverse().map((log, idx) => (
                                <details key={idx} className="log-entry">
                                   {/* ... */}
                                </details>
                            ))}
                        </div>
                    )}
                     {/* 下一局提示/按钮 */}
                    {gameState === 'ended' || (gameState === 'comparing' && roomData.prompt) && (
                        <div className="next-round-controls">
                            {roomData.prompt && <p className="game-prompt">{roomData.prompt}</p>}
                             <button onClick={() => socket.emit('playerIsReady', { roomId })} className="ready-button">
                                 准备开始下一局
                             </button>
                        </div>
                    )}

                </div>
            )}

            {/* 全局提示信息，例如等待AI */}
            {prompt && (!roomData.comparisonDetails && gameState !== 'ended') && <p className="game-prompt global-prompt">{prompt}</p>}
        </div>
    );
};

export default Room;
