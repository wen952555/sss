// frontend/src/App.js
import React, { useState, useEffect, useCallback } from 'react';
import { DragDropContext } from 'react-beautiful-dnd';
import HandArea from './components/HandArea';
import TopBanner from './components/TopBanner';
import ComparisonModal from './components/ComparisonModal';
import { API_BASE_URL } from './config';
import { mapBackendCardsToFrontendCards } from './logic/card';
import { evaluateHand, compareEvaluatedHands, HAND_TYPE_NAMES } from './logic/handEvaluator';
import { findBestThirteenWaterArrangement } from './logic/thirteenWaterAI';
import { calculateAllPlayerScores } from './logic/scoreCalculator';
import './App.css';

const DROPPABLE_IDS_PLAYER_PREFIX = "player_";
const HAND_FIXED_CAPACITIES = { TOP: 3, MIDDLE: 5, BOTTOM: 5 };
const createInitialPlayerState = (id, name, isAI = false) => ({ id, name, isAI, cards: { TOP: [], MIDDLE: [], BOTTOM: [] }, initial13Cards: [], isArranged: false, isThinking: false, finalArrangement: null, isMisArranged: false, score: 0, roundScore: 0, comparisonResults: {}, confirmedThisRound: false });
const HUMAN_PLAYER_ID = 'human_player_0';

function App() {
  const [players, setPlayers] = useState(() => [ /* ... (玩家初始化) ... */ ]);
  const humanPlayer = players.find(p => p.id === HUMAN_PLAYER_ID);
  const aiPlayers = players.filter(p => p.isAI);

  const [humanMiddleHandLabel, setHumanMiddleHandLabel] = useState('手牌');
  const [isLoadingDeal, setIsLoadingDeal] = useState(false);
  const [gameMessage, setGameMessage] = useState(''); // 关键：初始化为空字符串
  const [allPlayersArranged, setAllPlayersArranged] = useState(false);
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);

  // --- (Helper functions: getPlayerDroppableId, checkPlayerFullyArranged, evaluateAndSetPlayerArrangement - 保持不变) ---
  const getPlayerDroppableId = (playerId, areaKey) => `${DROPPABLE_IDS_PLAYER_PREFIX}${playerId}_${areaKey}`;
  const checkPlayerFullyArranged = useCallback((player) => { if (!player) return false; return player.cards.TOP.length === HAND_FIXED_CAPACITIES.TOP && player.cards.MIDDLE.length === HAND_FIXED_CAPACITIES.MIDDLE && player.cards.BOTTOM.length === HAND_FIXED_CAPACITIES.BOTTOM; }, []);
  const evaluateAndSetPlayerArrangement = useCallback((playerId, newCards) => { setPlayers(prevPlayers => prevPlayers.map(p => { if (p.id === playerId) { const isFullyArrangedNow = checkPlayerFullyArranged({cards: newCards}); let finalEval = null; let misArranged = false; if (isFullyArrangedNow) { const topEval = evaluateHand(newCards.TOP); const middleEval = evaluateHand(newCards.MIDDLE); const bottomEval = evaluateHand(newCards.BOTTOM); finalEval = { topEval, middleEval, bottomEval }; if (!p.isAI && (compareEvaluatedHands(topEval, middleEval) > 0 || compareEvaluatedHands(middleEval, bottomEval) > 0)) { misArranged = true; } } return { ...p, cards: newCards, isArranged: isFullyArrangedNow, finalArrangement: finalEval, isMisArranged: misArranged, isThinking: false, }; } return p; })); }, [checkPlayerFullyArranged]);


  // useEffect for game messages and human player UI updates
  useEffect(() => {
    // 规则1: 如果模态框打开，不显示任何主界面 gameMessage
    if (showComparisonModal) {
      setGameMessage(''); 
      return;
    }

    // 规则2: 如果游戏未开始且不在加载中，不显示任何消息
    if (!gameStarted && !isLoadingDeal) {
      setGameMessage(''); 
      return;
    }
    
    if (!humanPlayer) return;

    const isHumanArranged = checkPlayerFullyArranged(humanPlayer);
    setHumanMiddleHandLabel(isHumanArranged ? '中道' : '手牌');

    // 规则3: 游戏进行中的消息
    let newMessage = '';
    if (isHumanArranged) {
      if (humanPlayer.isMisArranged) {
        newMessage = "注意：你的牌型组合错误（倒水）！";
      } else {
        const allDone = players.every(p => p.isArranged);
        if (allDone) {
            newMessage = "所有玩家已准备好！"; // 当所有人都准备好，显示这个，"开始比牌"按钮会出现
        } else {
            newMessage = "你的牌已摆好！等待AI...";
        }
      }
    } else if (gameStarted && humanPlayer.initial13Cards && humanPlayer.initial13Cards.length > 0) {
        newMessage = "请你理牌，AI正在理牌...";
    } else if (isLoadingDeal) { // 确保在加载时有提示
        newMessage = "正在为所有玩家发牌...";
    }
    setGameMessage(newMessage);

  }, [humanPlayer, players, checkPlayerFullyArranged, showComparisonModal, isLoadingDeal, gameStarted]);

  useEffect(() => {
    const allArranged = players.every(p => p.isArranged);
    setAllPlayersArranged(allArranged);
  }, [players]);

  // --- (handleDealNewHand, autoArrangeAIHand, onDragEnd, handleHumanPlayerAISort, handleConfirmHand, handleStartCompare - 主要调整内部 setGameMessage 调用) ---
  const handleDealNewHand = async () => { 
    setIsLoadingDeal(true); 
    // setGameMessage('正在为所有玩家发牌...'); // 这条消息现在由useEffect处理
    setAllPlayersArranged(false); 
    setShowComparisonModal(false); 
    setGameStarted(true); 
    try { 
      const dealPromises = players.map(player => fetch(`${API_BASE_URL}/api/deal_cards.php`).then(res => { if (!res.ok) throw new Error(`API error for ${player.name}! status: ${res.status}`); return res.json(); })); 
      const results = await Promise.all(dealPromises); 
      const updatedPlayersData = players.map((player, index) => { const dealResult = results[index]; const baseState = createInitialPlayerState(player.id, player.name, player.isAI); if (dealResult.success && dealResult.hand) { const dealtCards = mapBackendCardsToFrontendCards(dealResult.hand); return { ...baseState, score: player.score, initial13Cards: [...dealtCards], cards: { ...baseState.cards, MIDDLE: player.isAI ? [] : dealtCards }, isThinking: player.isAI, }; } console.error(`Failed to deal cards for ${player.name}`, dealResult.message); return {...baseState, score: player.score }; }); 
      setPlayers(updatedPlayersData); 
      // 发牌完毕后的消息现在由上面的useEffect根据新状态自动更新
      // setGameMessage('发牌完毕！请你理牌，AI正在理牌...'); // 移除，让useEffect处理
      updatedPlayersData.filter(p => p.isAI).forEach(aiPlayer => { if (aiPlayer.initial13Cards.length === 13) { autoArrangeAIHand(aiPlayer.id, aiPlayer.initial13Cards); } }); 
    } catch (error) { 
      console.error("Deal New Hand Error:", error); 
      setGameMessage(`发牌请求错误: ${error.message}`); 
      setGameStarted(false); 
    } 
    setIsLoadingDeal(false); 
  };

  const autoArrangeAIHand = useCallback((aiPlayerId, cardsForAI) => { setPlayers(prev => prev.map(p => p.id === aiPlayerId ? { ...p, isThinking: true } : p)); setTimeout(() => { const arrangement = findBestThirteenWaterArrangement(cardsForAI); if (arrangement) { evaluateAndSetPlayerArrangement(aiPlayerId, { TOP: arrangement.top, MIDDLE: arrangement.middle, BOTTOM: arrangement.bottom, }); } else { console.error(`AI ${aiPlayerId} failed to arrange hand.`); setPlayers(prev => prev.map(p => p.id === aiPlayerId ? { ...p, isThinking: false, isArranged: false } : p)); } }, 300 + Math.random() * 1200); }, [evaluateAndSetPlayerArrangement]);
  
  useEffect(() => { // 这个useEffect现在只用于确保游戏未开始时消息为空
    if (!gameStarted && !isLoadingDeal && !showComparisonModal ) {
      setGameMessage(''); 
    }
  }, [gameStarted, isLoadingDeal, showComparisonModal]);

  const onDragEnd = (result) => { const { source, destination } = result; if (!destination || !humanPlayer || showComparisonModal) return; const sourceDroppableId = source.droppableId; const destDroppableId = destination.droppableId; if (!sourceDroppableId.startsWith(`${DROPPABLE_IDS_PLAYER_PREFIX}${HUMAN_PLAYER_ID}_`) || !destDroppableId.startsWith(`${DROPPABLE_IDS_PLAYER_PREFIX}${HUMAN_PLAYER_ID}_`)) { return; } const parseAreaFromPlayerId = (idStr) => idStr.substring(idStr.lastIndexOf('_') + 1); const sourceAreaKey = parseAreaFromPlayerId(sourceDroppableId); const destAreaKey = parseAreaFromPlayerId(destDroppableId); const newHumanCards = { ...humanPlayer.cards }; const sourceList = [...newHumanCards[sourceAreaKey]]; const [movedCard] = sourceList.splice(source.index, 1); if (sourceAreaKey === destAreaKey) { sourceList.splice(destination.index, 0, movedCard); newHumanCards[sourceAreaKey] = sourceList; } else { const destList = [...newHumanCards[destAreaKey]]; let destCapacity = (destAreaKey === 'MIDDLE' && !checkPlayerFullyArranged(humanPlayer)) ? 13 : HAND_FIXED_CAPACITIES[destAreaKey]; if (destList.length >= destCapacity) { setGameMessage(`此道 (${destAreaKey}) 已满 (${destList.length}/${destCapacity})！`); return; } destList.splice(destination.index, 0, movedCard); newHumanCards[sourceAreaKey] = sourceList; newHumanCards[destAreaKey] = destList; } evaluateAndSetPlayerArrangement(HUMAN_PLAYER_ID, newHumanCards); };
  const handleHumanPlayerAISort = () => { if (!humanPlayer || !gameStarted || humanPlayer.isArranged || humanPlayer.isThinking || showComparisonModal) return; const currentCardsInPlay = [ ...humanPlayer.cards.TOP, ...humanPlayer.cards.MIDDLE, ...humanPlayer.cards.BOTTOM, ].filter(Boolean); let cardsToArrange = currentCardsInPlay; if (currentCardsInPlay.length !== 13) { const initialCards = humanPlayer.initial13Cards; if (!initialCards || initialCards.length !== 13) { setGameMessage("AI辅助理牌失败：未找到完整的13张初始牌。"); return; } cardsToArrange = [...initialCards]; } setPlayers(prev => prev.map(p => p.id === HUMAN_PLAYER_ID ? { ...p, isThinking: true, cards: {TOP:[], MIDDLE:[], BOTTOM:[]} } : p)); setGameMessage('AI 正在帮你理牌...'); autoArrangeAIHand(HUMAN_PLAYER_ID, cardsToArrange); };
  const handleConfirmHand = () => { if (!humanPlayer || !gameStarted || !humanPlayer.isArranged || showComparisonModal) { if (!showComparisonModal && gameStarted) setGameMessage("请先将您的13张牌按3-5-5的组合摆好。"); return; } if (humanPlayer.isMisArranged) { setGameMessage("您的牌型组合错误（倒水），请调整！"); return; } setPlayers(prev => prev.map(p => p.id === HUMAN_PLAYER_ID ? {...p, confirmedThisRound: true} : p)); if(!showComparisonModal && !players.every(p => p.isArranged)) setGameMessage("你的牌已确认！等待AI..."); };
  const handleStartCompare = () => { if (!allPlayersArranged) { setGameMessage("尚有玩家未完成理牌！"); return; } const playersAfterComparison = calculateAllPlayerScores(players, HAND_TYPE_NAMES); const updatedPlayersWithTotalScore = playersAfterComparison.map(p => ({ ...p, score: (players.find(op => op.id === p.id)?.score || 0) + (p.roundScore || 0), })); setPlayers(updatedPlayersWithTotalScore); setShowComparisonModal(true); setGameMessage(''); }; // 比牌时清空主界面消息
  
  if (!humanPlayer) return <div className="app-container"><p>正在加载玩家数据...</p></div>;

  // ... (计算 humanMiddleCurrentCount 等逻辑保持不变) ...
  const humanMiddleCurrentCount = humanPlayer.cards.MIDDLE.length;
  const humanTopCurrentCount = humanPlayer.cards.TOP.length;
  const humanBottomCurrentCount = humanPlayer.cards.BOTTOM.length;
  const humanMiddleExpectedCount = !checkPlayerFullyArranged(humanPlayer) ? (13 - humanTopCurrentCount - humanBottomCurrentCount) : HAND_FIXED_CAPACITIES.MIDDLE;

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="app-container">
        <TopBanner 
            humanPlayer={humanPlayer}
            aiPlayers={aiPlayers}
        />
        
        <h1 className="game-title">十三水</h1>
        
        {/* 核心修改：只有当 gameMessage 非空且模态框未打开时才渲染 */}
        {gameMessage && !showComparisonModal && 
             <p className={`game-message ${humanPlayer.isMisArranged && humanPlayer.isArranged && !showComparisonModal ? 'error' : ''}`}>
                {gameMessage}
            </p>
        }
        
        <div className={`game-board ${humanPlayer.isMisArranged && humanPlayer.isArranged && !showComparisonModal ? 'misarranged-board' : ''}`}>
          {/* ... (HandArea components) ... */}
          <HandArea droppableId={getPlayerDroppableId(HUMAN_PLAYER_ID, 'TOP')} title={`头道 (${humanTopCurrentCount}/${HAND_FIXED_CAPACITIES.TOP})`} cards={humanPlayer.cards.TOP} evaluatedHandType={humanPlayer.finalArrangement?.topEval} allowWrap={false} />
          <HandArea droppableId={getPlayerDroppableId(HUMAN_PLAYER_ID, 'MIDDLE')} title={`${humanMiddleHandLabel} (${humanMiddleCurrentCount}/${Math.max(0, humanMiddleExpectedCount)})`} cards={humanPlayer.cards.MIDDLE} evaluatedHandType={humanPlayer.isArranged ? humanPlayer.finalArrangement?.middleEval : null} allowWrap={!humanPlayer.isArranged} />
          <HandArea droppableId={getPlayerDroppableId(HUMAN_PLAYER_ID, 'BOTTOM')} title={`尾道 (${humanBottomCurrentCount}/${HAND_FIXED_CAPACITIES.BOTTOM})`} cards={humanPlayer.cards.BOTTOM} evaluatedHandType={humanPlayer.finalArrangement?.bottomEval} allowWrap={false} />
        </div>

        <div className="controls">
          {/* ... (Buttons) ... */}
          <button className="game-button" onClick={handleDealNewHand} disabled={isLoadingDeal}> {isLoadingDeal ? '发牌中...' : '重新发牌'} </button>
          <button className="game-button" onClick={handleHumanPlayerAISort} disabled={isLoadingDeal || !gameStarted || humanPlayer.isArranged || humanPlayer.isThinking || showComparisonModal}> {humanPlayer.isThinking && humanPlayer.id === HUMAN_PLAYER_ID ? 'AI理牌中...' : 'AI帮我理牌'} </button>
          <button className="game-button" onClick={handleConfirmHand} disabled={isLoadingDeal || !gameStarted || !humanPlayer.isArranged || (humanPlayer.isMisArranged && humanPlayer.isArranged) || allPlayersArranged || showComparisonModal}> 确定牌型 </button>
        </div>

        {gameStarted && allPlayersArranged && !showComparisonModal && (
            <button className="game-button compare-all-button" onClick={handleStartCompare}>
                开始比牌！
            </button>
        )}

        <ComparisonModal 
            isOpen={showComparisonModal}
            onClose={() => {setShowComparisonModal(false); setGameMessage('');}} // 关闭模态框后也清空消息
            players={players}
            humanPlayerId={HUMAN_PLAYER_ID}
        />
      </div>
    </DragDropContext>
  );
}

export default App;
