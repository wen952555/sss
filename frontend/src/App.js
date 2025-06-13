// frontend/src/App.js
import React, { useState, useEffect, useCallback } from 'react';
import { DragDropContext } from 'react-beautiful-dnd';
import HandArea from './components/HandArea';
import TopBanner from './components/TopBanner';
import ComparisonModal from './components/ComparisonModal';
import { API_BASE_URL } from './config'; // 确保 config.js 存在且导出此常量
import { mapBackendCardsToFrontendCards } from './logic/card'; // 确保 card.js 存在且导出此函数
import { evaluateHand, compareEvaluatedHands, HAND_TYPE_NAMES } from './logic/handEvaluator'; // 确保 handEvaluator.js 存在且导出这些
import { findBestThirteenWaterArrangement } from './logic/thirteenWaterAI'; // 确保 thirteenWaterAI.js 存在且导出此函数
import { calculateAllPlayerScores } from './logic/scoreCalculator'; // 确保 scoreCalculator.js 存在且导出此函数
import './App.css'; // 确保 App.css 存在于 src 目录

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
  const [gameMessage, setGameMessage] = useState('');
  const [allPlayersArranged, setAllPlayersArranged] = useState(false);
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);

  const getPlayerDroppableId = (playerId, areaKey) => `${DROPPABLE_IDS_PLAYER_PREFIX}${playerId}_${areaKey}`;

  const checkPlayerFullyArranged = useCallback((player) => { 
    if (!player) return false; 
    return player.cards.TOP.length === HAND_FIXED_CAPACITIES.TOP && 
           player.cards.MIDDLE.length === HAND_FIXED_CAPACITIES.MIDDLE && 
           player.cards.BOTTOM.length === HAND_FIXED_CAPACITIES.BOTTOM; 
  }, []);

  const evaluateAndSetPlayerArrangement = useCallback((playerId, newCards) => { 
    setPlayers(prevPlayers => prevPlayers.map(p => { 
      if (p.id === playerId) { 
        const isFullyArrangedNow = checkPlayerFullyArranged({cards: newCards}); 
        let finalEval = null; 
        let misArranged = false; 
        if (isFullyArrangedNow) { 
          const topEval = evaluateHand(newCards.TOP); 
          const middleEval = evaluateHand(newCards.MIDDLE); 
          const bottomEval = evaluateHand(newCards.BOTTOM); 
          finalEval = { topEval, middleEval, bottomEval }; 
          if (!p.isAI && (compareEvaluatedHands(topEval, middleEval) > 0 || compareEvaluatedHands(middleEval, bottomEval) > 0)) { 
            misArranged = true; 
          } 
        } 
        return { ...p, cards: newCards, isArranged: isFullyArrangedNow, finalArrangement: finalEval, isMisArranged: misArranged, isThinking: false, }; 
      } 
      return p; 
    })); 
  }, [checkPlayerFullyArranged]); // 依赖中添加 evaluateHand 和 compareEvaluatedHands 如果它们不是纯函数 (它们应该是)

  useEffect(() => { 
    if (showComparisonModal) { 
      setGameMessage(''); 
      return;
    }
    if (!gameStarted && !isLoadingDeal) {
      setGameMessage('点击“重新发牌”开始游戏');
      return;
    }
    if (!humanPlayer) return; 
    const isHumanArranged = checkPlayerFullyArranged(humanPlayer); 
    setHumanMiddleHandLabel(isHumanArranged ? '中道' : '手牌'); 
    if (isHumanArranged) { 
      if (humanPlayer.isMisArranged) { 
        setGameMessage("注意：你的牌型组合错误（倒水）！"); 
      } else { 
        const allDone = players.every(p => p.isArranged); 
        if (allDone) { 
          if (humanPlayer.initial13Cards.length > 0) { 
            setGameMessage("所有玩家已准备好！"); 
          } 
        } else { 
          setGameMessage("你的牌已摆好！等待AI..."); 
        } 
      } 
    } else if (humanPlayer.initial13Cards && humanPlayer.initial13Cards.length > 0) { 
      setGameMessage("请你理牌，AI正在理牌..."); 
    } 
  }, [humanPlayer, players, checkPlayerFullyArranged, showComparisonModal, isLoadingDeal, gameStarted]);

  useEffect(() => { 
    const allArranged = players.every(p => p.isArranged); 
    setAllPlayersArranged(allArranged); 
  }, [players]);

  const handleDealNewHand = async () => { 
    setIsLoadingDeal(true); 
    setGameMessage('正在为所有玩家发牌...'); 
    setAllPlayersArranged(false); 
    setShowComparisonModal(false); 
    setGameStarted(true); 
    try { 
      const dealPromises = players.map(player => 
        fetch(`${API_BASE_URL}/api/deal_cards.php`).then(res => { 
          if (!res.ok) throw new Error(`API error for ${player.name}! status: ${res.status}`); 
          return res.json(); 
        })
      ); 
      const results = await Promise.all(dealPromises); 
      const updatedPlayersData = players.map((player, index) => { 
        const dealResult = results[index]; 
        const baseState = createInitialPlayerState(player.id, player.name, player.isAI); 
        if (dealResult.success && dealResult.hand) { 
          const dealtCards = mapBackendCardsToFrontendCards(dealResult.hand); 
          return { ...baseState, score: player.score, initial13Cards: [...dealtCards], cards: { ...baseState.cards, MIDDLE: player.isAI ? [] : dealtCards }, isThinking: player.isAI, }; 
        } 
        console.error(`Failed to deal cards for ${player.name}`, dealResult.message); 
        return {...baseState, score: player.score }; 
      }); 
      setPlayers(updatedPlayersData); 
      // gameMessage 会在 useEffect 中根据 gameStarted 更新
      updatedPlayersData.filter(p => p.isAI).forEach(aiPlayer => { 
        if (aiPlayer.initial13Cards.length === 13) { 
          autoArrangeAIHand(aiPlayer.id, aiPlayer.initial13Cards); 
        } 
      }); 
    } catch (error) { 
      console.error("Deal New Hand Error:", error); 
      setGameMessage(`发牌请求错误: ${error.message}`); 
      setGameStarted(false); 
    } 
    setIsLoadingDeal(false); 
  };

  const autoArrangeAIHand = useCallback((aiPlayerId, cardsForAI) => { 
    setPlayers(prev => prev.map(p => p.id === aiPlayerId ? { ...p, isThinking: true } : p)); 
    setTimeout(() => { 
      const arrangement = findBestThirteenWaterArrangement(cardsForAI); 
      if (arrangement) { 
        evaluateAndSetPlayerArrangement(aiPlayerId, { TOP: arrangement.top, MIDDLE: arrangement.middle, BOTTOM: arrangement.bottom, }); 
      } else { 
        console.error(`AI ${aiPlayerId} failed to arrange hand.`); 
        setPlayers(prev => prev.map(p => p.id === aiPlayerId ? { ...p, isThinking: false, isArranged: false } : p)); 
      } 
    }, 300 + Math.random() * 1200); 
  }, [evaluateAndSetPlayerArrangement]); // findBestThirteenWaterArrangement 是纯函数

  useEffect(() => { 
    if (!gameStarted && !isLoadingDeal) { 
      setGameMessage('点击“重新发牌”开始游戏'); 
    } 
  }, [gameStarted, isLoadingDeal]);

  const onDragEnd = (result) => { 
    const { source, destination } = result; 
    if (!destination || !humanPlayer || showComparisonModal) return; 
    const sourceDroppableId = source.droppableId; 
    const destDroppableId = destination.droppableId; 
    if (!sourceDroppableId.startsWith(`${DROPPABLE_IDS_PLAYER_PREFIX}${HUMAN_PLAYER_ID}_`) || 
        !destDroppableId.startsWith(`${DROPPABLE_IDS_PLAYER_PREFIX}${HUMAN_PLAYER_ID}_`)) { 
      return; 
    } 
    const parseAreaFromPlayerId = (idStr) => idStr.substring(idStr.lastIndexOf('_') + 1); 
    const sourceAreaKey = parseAreaFromPlayerId(sourceDroppableId); 
    const destAreaKey = parseAreaFromPlayerId(destDroppableId); 
    const newHumanCards = { ...humanPlayer.cards }; 
    const sourceList = [...newHumanCards[sourceAreaKey]]; 
    const [movedCard] = sourceList.splice(source.index, 1); 
    if (sourceAreaKey === destAreaKey) { 
      sourceList.splice(destination.index, 0, movedCard); 
      newHumanCards[sourceAreaKey] = sourceList; 
    } else { 
      const destList = [...newHumanCards[destAreaKey]]; 
      let destCapacity = (destAreaKey === 'MIDDLE' && !checkPlayerFullyArranged(humanPlayer)) 
                         ? 13 
                         : HAND_FIXED_CAPACITIES[destAreaKey]; 
      if (destList.length >= destCapacity) { 
        setGameMessage(`此道 (${destAreaKey}) 已满 (${destList.length}/${destCapacity})！`); 
        return; 
      } 
      destList.splice(destination.index, 0, movedCard); 
      newHumanCards[sourceAreaKey] = sourceList; 
      newHumanCards[destAreaKey] = destList; 
    } 
    evaluateAndSetPlayerArrangement(HUMAN_PLAYER_ID, newHumanCards); 
  };

  const handleHumanPlayerAISort = () => { 
    if (!humanPlayer || !gameStarted || humanPlayer.isArranged || humanPlayer.isThinking || showComparisonModal) return; 
    const currentCardsInPlay = [ ...humanPlayer.cards.TOP, ...humanPlayer.cards.MIDDLE, ...humanPlayer.cards.BOTTOM, ].filter(Boolean); 
    let cardsToArrange = currentCardsInPlay; 
    if (currentCardsInPlay.length !== 13) { 
      const initialCards = humanPlayer.initial13Cards; 
      if (!initialCards || initialCards.length !== 13) { 
        setGameMessage("无法收集齐13张牌进行AI辅助！请先发牌。"); 
        return; 
      } 
      cardsToArrange = [...initialCards]; 
    } 
    setPlayers(prev => prev.map(p => p.id === HUMAN_PLAYER_ID ? { ...p, isThinking: true, cards: {TOP:[], MIDDLE:[], BOTTOM:[]} } : p)); 
    setGameMessage('AI 正在帮你理牌...'); 
    autoArrangeAIHand(HUMAN_PLAYER_ID, cardsToArrange); 
  };
  
  const handleConfirmHand = () => { 
    if (!humanPlayer || !gameStarted || !humanPlayer.isArranged || showComparisonModal) { 
      if (!showComparisonModal && gameStarted) setGameMessage("请先将您的13张牌按3-5-5的组合摆好。"); 
      return; 
    } 
    if (humanPlayer.isMisArranged) { 
      setGameMessage("您的牌型组合错误（倒水），请调整！"); 
      return; 
    } 
    setPlayers(prev => prev.map(p => p.id === HUMAN_PLAYER_ID ? {...p, confirmedThisRound: true} : p)); 
    if(!showComparisonModal && !players.every(p => p.isArranged)) setGameMessage("你的牌已确认！等待AI..."); 
  };

  const handleStartCompare = () => { 
    if (!allPlayersArranged) { 
      setGameMessage("尚有玩家未完成理牌！"); 
      return; 
    } 
    const playersAfterComparison = calculateAllPlayerScores(players, HAND_TYPE_NAMES); 
    const updatedPlayersWithTotalScore = playersAfterComparison.map(p => ({ 
        ...p, 
        score: (players.find(op => op.id === p.id)?.score || 0) + (p.roundScore || 0), 
    })); 
    setPlayers(updatedPlayersWithTotalScore); 
    setShowComparisonModal(true); 
    setGameMessage(''); 
  };
  
  if (!humanPlayer) return <div className="app-container"><p>正在加载玩家数据...</p></div>;

  const humanMiddleCurrentCount = humanPlayer.cards.MIDDLE.length;
  const humanTopCurrentCount = humanPlayer.cards.TOP.length;
  const humanBottomCurrentCount = humanPlayer.cards.BOTTOM.length;
  const humanMiddleExpectedCount = !checkPlayerFullyArranged(humanPlayer)
    ? (13 - humanTopCurrentCount - humanBottomCurrentCount)
    : HAND_FIXED_CAPACITIES.MIDDLE;

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="app-container">
        <TopBanner 
            humanPlayer={humanPlayer}
            aiPlayers={aiPlayers}
        />
        
        <h1 className="game-title">十三水</h1>
        
        {gameMessage && !showComparisonModal && 
             <p className={`game-message ${humanPlayer.isMisArranged && humanPlayer.isArranged && !showComparisonModal ? 'error' : ''}`}>
                {gameMessage}
            </p>
        }
        
        <div className={`game-board ${humanPlayer.isMisArranged && humanPlayer.isArranged && !showComparisonModal ? 'misarranged-board' : ''}`}>
          <HandArea droppableId={getPlayerDroppableId(HUMAN_PLAYER_ID, 'TOP')} title={`头道 (${humanTopCurrentCount}/${HAND_FIXED_CAPACITIES.TOP})`} cards={humanPlayer.cards.TOP} evaluatedHandType={humanPlayer.finalArrangement?.topEval} allowWrap={false} />
          <HandArea droppableId={getPlayerDroppableId(HUMAN_PLAYER_ID, 'MIDDLE')} title={`${humanMiddleHandLabel} (${humanMiddleCurrentCount}/${Math.max(0, humanMiddleExpectedCount)})`} cards={humanPlayer.cards.MIDDLE} evaluatedHandType={humanPlayer.isArranged ? humanPlayer.finalArrangement?.middleEval : null} allowWrap={!humanPlayer.isArranged} />
          <HandArea droppableId={getPlayerDroppableId(HUMAN_PLAYER_ID, 'BOTTOM')} title={`尾道 (${humanBottomCurrentCount}/${HAND_FIXED_CAPACITIES.BOTTOM})`} cards={humanPlayer.cards.BOTTOM} evaluatedHandType={humanPlayer.finalArrangement?.bottomEval} allowWrap={false} />
        </div>

        <div className="controls">
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
            onClose={() => {setShowComparisonModal(false); if(gameStarted) setGameMessage('牌局已结束，请重新发牌开始新一轮。'); else setGameMessage('点击“重新发牌”开始游戏');}}
            players={players}
            humanPlayerId={HUMAN_PLAYER_ID}
        />
      </div>
    </DragDropContext>
  );
}

export default App;
