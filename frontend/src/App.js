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
  const [players, setPlayers] = useState(() => [
    createInitialPlayerState(HUMAN_PLAYER_ID, '你'),
    createInitialPlayerState('ai_player_1', 'AI 悟空', true),
    createInitialPlayerState('ai_player_2', 'AI 八戒', true),
    createInitialPlayerState('ai_player_3', 'AI 沙僧', true),
  ]);

  const humanPlayer = players.find(p => p.id === HUMAN_PLAYER_ID);
  const aiPlayers = players.filter(p => p.isAI);

  const [humanMiddleHandLabel, setHumanMiddleHandLabel] = useState('手牌');
  const [isLoadingDeal, setIsLoadingDeal] = useState(false);
  const [allPlayersArranged, setAllPlayersArranged] = useState(false);
  const [showComparisonView, setShowComparisonView] = useState(false); 
  const [gameStarted, setGameStarted] = useState(false); 

  const getPlayerDroppableId = (playerId, areaKey) => `${DROPPABLE_IDS_PLAYER_PREFIX}${playerId}_${areaKey}`;
  const checkPlayerFullyArranged = useCallback((player) => { if (!player) return false; return player.cards.TOP.length === HAND_FIXED_CAPACITIES.TOP && player.cards.MIDDLE.length === HAND_FIXED_CAPACITIES.MIDDLE && player.cards.BOTTOM.length === HAND_FIXED_CAPACITIES.BOTTOM; }, []);
  const evaluateAndSetPlayerArrangement = useCallback((playerId, newCards) => { setPlayers(prevPlayers => prevPlayers.map(p => { if (p.id === playerId) { const isFullyArrangedNow = checkPlayerFullyArranged({cards: newCards}); let finalEval = null; let misArranged = false; if (isFullyArrangedNow) { const topEval = evaluateHand(newCards.TOP); const middleEval = evaluateHand(newCards.MIDDLE); const bottomEval = evaluateHand(newCards.BOTTOM); finalEval = { topEval, middleEval, bottomEval }; if (!p.isAI && (compareEvaluatedHands(topEval, middleEval) > 0 || compareEvaluatedHands(middleEval, bottomEval) > 0)) { misArranged = true; if (misArranged && playerId === HUMAN_PLAYER_ID) setTimeout(()=>alert("注意：你的牌型组合错误（倒水）！"),0); } } return { ...p, cards: newCards, isArranged: isFullyArrangedNow, finalArrangement: finalEval, isMisArranged: misArranged, isThinking: false, }; } return p; })); }, [checkPlayerFullyArranged]);
  useEffect(() => { if (showComparisonView) return; if (!gameStarted && !isLoadingDeal) return; if (!humanPlayer) return; const isHumanArranged = checkPlayerFullyArranged(humanPlayer); setHumanMiddleHandLabel(isHumanArranged ? '中道' : '手牌'); }, [humanPlayer, checkPlayerFullyArranged, players, showComparisonView, isLoadingDeal, gameStarted]);
  useEffect(() => { const allArranged = players.every(p => p.isArranged); setAllPlayersArranged(allArranged); }, [players]);
  const handleDealNewHand = async () => { setIsLoadingDeal(true); setAllPlayersArranged(false); setShowComparisonView(false); setGameStarted(true); try { const dealPromises = players.map(player => fetch(`${API_BASE_URL}/api/deal_cards.php`).then(res => { if (!res.ok) throw new Error(`API error for ${player.name}! status: ${res.status}`); return res.json(); })); const results = await Promise.all(dealPromises); const updatedPlayersData = players.map((player, index) => { const dealResult = results[index]; const baseState = createInitialPlayerState(player.id, player.name, player.isAI); if (dealResult.success && dealResult.hand) { const dealtCards = mapBackendCardsToFrontendCards(dealResult.hand); return { ...baseState, score: player.score, initial13Cards: [...dealtCards], cards: { ...baseState.cards, MIDDLE: player.isAI ? [] : dealtCards }, isThinking: player.isAI, confirmedThisRound: false }; } console.error(`Failed to deal cards for ${player.name}`, dealResult.message); return {...baseState, score: player.score, confirmedThisRound: false }; }); setPlayers(updatedPlayersData); updatedPlayersData.filter(p => p.isAI).forEach(aiPlayer => { if (aiPlayer.initial13Cards.length === 13) { autoArrangeAIHand(aiPlayer.id, aiPlayer.initial13Cards); } }); } catch (error) { console.error("Deal New Hand Error:", error); alert(`发牌请求错误: ${error.message}`); setGameStarted(false); } setIsLoadingDeal(false); };
  const autoArrangeAIHand = useCallback((aiPlayerId, cardsForAI) => { setPlayers(prev => prev.map(p => p.id === aiPlayerId ? { ...p, isThinking: true } : p)); setTimeout(() => { const arrangement = findBestThirteenWaterArrangement(cardsForAI); if (arrangement) { evaluateAndSetPlayerArrangement(aiPlayerId, { TOP: arrangement.top, MIDDLE: arrangement.middle, BOTTOM: arrangement.bottom, }); } else { console.error(`AI ${aiPlayerId} failed to arrange hand.`); setPlayers(prev => prev.map(p => p.id === aiPlayerId ? { ...p, isThinking: false, isArranged: false } : p)); } }, 300 + Math.random() * 1200); }, [evaluateAndSetPlayerArrangement]);
  useEffect(() => { /* 初始不执行任何操作 */ }, []);
  const onDragEnd = (result) => { const { source, destination } = result; if (!destination || !humanPlayer || showComparisonView) return; const sourceDroppableId = source.droppableId; const destDroppableId = destination.droppableId; if (!sourceDroppableId.startsWith(`${DROPPABLE_IDS_PLAYER_PREFIX}${HUMAN_PLAYER_ID}_`) || !destDroppableId.startsWith(`${DROPPABLE_IDS_PLAYER_PREFIX}${HUMAN_PLAYER_ID}_`)) { return; } const parseAreaFromPlayerId = (idStr) => idStr.substring(idStr.lastIndexOf('_') + 1); const sourceAreaKey = parseAreaFromPlayerId(sourceDroppableId); const destAreaKey = parseAreaFromPlayerId(destDroppableId); const newHumanCards = { ...humanPlayer.cards }; const sourceList = [...newHumanCards[sourceAreaKey]]; const [movedCard] = sourceList.splice(source.index, 1); if (sourceAreaKey === destAreaKey) { sourceList.splice(destination.index, 0, movedCard); newHumanCards[sourceAreaKey] = sourceList; } else { const destList = [...newHumanCards[destAreaKey]]; let destCapacity = (destAreaKey === 'MIDDLE' && !checkPlayerFullyArranged(humanPlayer)) ? 13 : HAND_FIXED_CAPACITIES[destAreaKey]; if (destList.length >= destCapacity) { alert(`此道 (${destAreaKey}) 已满!`); return; } destList.splice(destination.index, 0, movedCard); newHumanCards[sourceAreaKey] = sourceList; newHumanCards[destAreaKey] = destList; } evaluateAndSetPlayerArrangement(HUMAN_PLAYER_ID, newHumanCards); };
  const handleHumanPlayerAISort = () => { if (!humanPlayer || !gameStarted || humanPlayer.isArranged || humanPlayer.isThinking || showComparisonView) return; const currentCardsInPlay = [ ...humanPlayer.cards.TOP, ...humanPlayer.cards.MIDDLE, ...humanPlayer.cards.BOTTOM, ].filter(Boolean); let cardsToArrange = currentCardsInPlay; if (currentCardsInPlay.length !== 13) { const initialCards = humanPlayer.initial13Cards; if (!initialCards || initialCards.length !== 13) { alert("AI辅助理牌失败：未找到完整的13张初始牌。"); return; } cardsToArrange = [...initialCards]; } setPlayers(prev => prev.map(p => p.id === HUMAN_PLAYER_ID ? { ...p, isThinking: true, cards: {TOP:[], MIDDLE:[], BOTTOM:[]} } : p)); autoArrangeAIHand(HUMAN_PLAYER_ID, cardsToArrange); };
  const handleConfirmHand = () => { if (!humanPlayer || !gameStarted || !humanPlayer.isArranged || showComparisonView) { if (!showComparisonView && gameStarted) alert("请先将您的13张牌按3-5-5的组合摆好。"); return; } if (humanPlayer.isMisArranged) { alert("您的牌型组合错误（倒水），请调整！"); return; } setPlayers(prev => prev.map(p => p.id === HUMAN_PLAYER_ID ? {...p, confirmedThisRound: true} : p)); };
  const handleStartCompare = () => { if (!allPlayersArranged) { alert("尚有玩家未完成理牌！"); return; } const playersAfterComparison = calculateAllPlayerScores(players, HAND_TYPE_NAMES); const updatedPlayersWithTotalScore = playersAfterComparison.map(p => ({ ...p, score: (players.find(op => op.id === p.id)?.score || 0) + (p.roundScore || 0), })); setPlayers(updatedPlayersWithTotalScore); setShowComparisonView(true); };
  const handleContinueGame = () => { setShowComparisonView(false); setPlayers(prevPlayers => prevPlayers.map(p => ({ ...createInitialPlayerState(p.id, p.name, p.isAI), score: p.score }))); setAllPlayersArranged(false); setGameStarted(false); };
  
  if (!humanPlayer) return <div className="app-container"><p>正在加载玩家数据...</p></div>;

  const humanMiddleCurrentCount = humanPlayer.cards.MIDDLE.length;
  const humanTopCurrentCount = humanPlayer.cards.TOP.length;
  const humanBottomCurrentCount = humanPlayer.cards.BOTTOM.length;
  const humanMiddleExpectedCount = !checkPlayerFullyArranged(humanPlayer) ? (13 - humanTopCurrentCount - humanBottomCurrentCount) : HAND_FIXED_CAPACITIES.MIDDLE;

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      {showComparisonView ? (
        <ComparisonModal 
            onClose={handleContinueGame} 
            onContinueGame={handleContinueGame} 
            players={players}
            humanPlayerId={HUMAN_PLAYER_ID}
        />
      ) : (
        <div className="app-container game-view-active"> 
          <div className="banner-section player-status-banner-section">
            <TopBanner 
                humanPlayer={humanPlayer}
                aiPlayers={aiPlayers}
            />
          </div>

          <div className={`banner-section hand-lane-banner top-lane ${humanPlayer.isMisArranged && humanPlayer.isArranged ? 'misarranged-lane' : ''}`}>
            <HandArea droppableId={getPlayerDroppableId(HUMAN_PLAYER_ID, 'TOP')} title={`头道 (${humanTopCurrentCount}/${HAND_FIXED_CAPACITIES.TOP})`} cards={humanPlayer.cards.TOP} evaluatedHandType={humanPlayer.finalArrangement?.topEval} allowWrap={false} />
          </div>

          <div className={`banner-section hand-lane-banner middle-lane ${humanPlayer.isMisArranged && humanPlayer.isArranged ? 'misarranged-lane' : ''}`}>
            <HandArea droppableId={getPlayerDroppableId(HUMAN_PLAYER_ID, 'MIDDLE')} title={`${humanMiddleHandLabel} (${humanMiddleCurrentCount}/${Math.max(0, humanMiddleExpectedCount)})`} cards={humanPlayer.cards.MIDDLE} evaluatedHandType={humanPlayer.isArranged ? humanPlayer.finalArrangement?.middleEval : null} allowWrap={!humanPlayer.isArranged} />
          </div>

          <div className={`banner-section hand-lane-banner bottom-lane ${humanPlayer.isMisArranged && humanPlayer.isArranged ? 'misarranged-lane' : ''}`}>
            <HandArea droppableId={getPlayerDroppableId(HUMAN_PLAYER_ID, 'BOTTOM')} title={`尾道 (${humanBottomCurrentCount}/${HAND_FIXED_CAPACITIES.BOTTOM})`} cards={humanPlayer.cards.BOTTOM} evaluatedHandType={humanPlayer.finalArrangement?.bottomEval} allowWrap={false} />
          </div>
        
          <div className="banner-section controls-banner-section">
            <div className="controls">
              <button className="game-button" onClick={handleDealNewHand} disabled={isLoadingDeal}> {isLoadingDeal ? '发牌中...' : '重新发牌'} </button>
              <button className="game-button" onClick={handleHumanPlayerAISort} disabled={isLoadingDeal || !gameStarted || humanPlayer.isArranged || humanPlayer.isThinking}> {humanPlayer.isThinking && humanPlayer.id === HUMAN_PLAYER_ID ? 'AI理牌中...' : 'AI帮我理牌'} </button>
              <button className="game-button" onClick={handleConfirmHand} disabled={isLoadingDeal || !gameStarted || !humanPlayer.isArranged || (humanPlayer.isMisArranged && humanPlayer.isArranged) || allPlayersArranged}> 确定牌型 </button>
            </div>
            {gameStarted && allPlayersArranged && (
                <button className="game-button compare-all-button" onClick={handleStartCompare}>
                    开始比牌！
                </button>
            )}
          </div>
        </div>
      )}
    </DragDropContext>
  );
}

export default App;
