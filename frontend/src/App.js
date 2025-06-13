// frontend/src/App.js
import React, { useState, useEffect, useCallback } from 'react';
import { DragDropContext } from 'react-beautiful-dnd';
import HandArea from './components/HandArea';
import TopBanner from './components/TopBanner';
import { API_BASE_URL } from './config';
import { mapBackendCardsToFrontendCards } from './logic/card';
import { evaluateHand, compareEvaluatedHands, HAND_TYPE_NAMES } from './logic/handEvaluator'; 
import { findBestThirteenWaterArrangement } from './logic/thirteenWaterAI';
import './App.css';

const DROPPABLE_IDS_PLAYER_PREFIX = "player_";
// const DROPPABLE_AREAS = ['TOP', 'MIDDLE', 'BOTTOM']; // 此行已被移除，因为未被使用

const HAND_FIXED_CAPACITIES = {
  TOP: 3,
  MIDDLE: 5,
  BOTTOM: 5,
};

const createInitialPlayerState = (id, name, isAI = false) => ({
  id,
  name,
  isAI,
  cards: { TOP: [], MIDDLE: [], BOTTOM: [] },
  initial13Cards: [],
  isArranged: false,
  isThinking: false,
  finalArrangement: null, // {topEval, middleEval, bottomEval}
  isMisArranged: false, // 仅对真人玩家有意义
  score: 0,
});

const HUMAN_PLAYER_ID = 'human_player_0';

function App() {
  const [players, setPlayers] = useState([
    createInitialPlayerState(HUMAN_PLAYER_ID, '你'),
    createInitialPlayerState('ai_player_1', 'AI 闲家①', true),
    createInitialPlayerState('ai_player_2', 'AI 闲家②', true),
    createInitialPlayerState('ai_player_3', 'AI 闲家③', true),
  ]);

  const humanPlayer = players.find(p => !p.isAI);
  const aiPlayers = players.filter(p => p.isAI);

  const [humanMiddleHandLabel, setHumanMiddleHandLabel] = useState('手牌');
  const [isLoadingDeal, setIsLoadingDeal] = useState(false);
  const [gameMessage, setGameMessage] = useState('点击“重新发牌”开始游戏');
  const [allPlayersReadyForCompare, setAllPlayersReadyForCompare] = useState(false);

  const getPlayerDroppableId = (playerId, areaKey) => `${DROPPABLE_IDS_PLAYER_PREFIX}${playerId}_${areaKey}`;

  const checkPlayerFullyArranged = useCallback((player) => {
    if (!player) return false;
    return player.cards.TOP.length === HAND_FIXED_CAPACITIES.TOP &&
           player.cards.MIDDLE.length === HAND_FIXED_CAPACITIES.MIDDLE &&
           player.cards.BOTTOM.length === HAND_FIXED_CAPACITIES.BOTTOM;
  }, []);

  const evaluateAndSetPlayerArrangement = useCallback((playerId, newCards) => {
    setPlayers(prevPlayers => {
      return prevPlayers.map(p => {
        if (p.id === playerId) {
          const isFullyArrangedNow = 
            newCards.TOP.length === HAND_FIXED_CAPACITIES.TOP &&
            newCards.MIDDLE.length === HAND_FIXED_CAPACITIES.MIDDLE &&
            newCards.BOTTOM.length === HAND_FIXED_CAPACITIES.BOTTOM;

          let finalEval = null;
          let misArranged = false;

          if (isFullyArrangedNow) {
            const topEval = evaluateHand(newCards.TOP);
            const middleEval = evaluateHand(newCards.MIDDLE);
            const bottomEval = evaluateHand(newCards.BOTTOM);
            finalEval = { topEval, middleEval, bottomEval };

            if (compareEvaluatedHands(topEval, middleEval) > 0 || compareEvaluatedHands(middleEval, bottomEval) > 0) {
              misArranged = true;
            }
          }
          
          return {
            ...p,
            cards: newCards,
            isArranged: isFullyArrangedNow,
            finalArrangement: finalEval,
            isMisArranged: misArranged,
            isThinking: false, 
          };
        }
        return p;
      });
    });
  }, []);


  useEffect(() => {
    if (!humanPlayer) return;
    const isHumanArranged = checkPlayerFullyArranged(humanPlayer);
    setHumanMiddleHandLabel(isHumanArranged ? '中道' : '手牌');

    if (isHumanArranged) {
      if (humanPlayer.isMisArranged) {
        setGameMessage("注意：你的牌型组合错误（倒水）！");
      } else {
        setGameMessage("你的牌已摆好！等待AI...");
      }
    }
  }, [humanPlayer, checkPlayerFullyArranged]);

  useEffect(() => {
    const allArranged = players.every(p => p.isArranged);
    setAllPlayersReadyForCompare(allArranged);
    if (allArranged && players.length > 0 && players.some(p => p.initial13Cards.length > 0)) {
      setGameMessage("所有玩家已准备就绪！可以进行比牌。");
    }
  }, [players]);

  const handleDealNewHand = async () => {
    setIsLoadingDeal(true);
    setGameMessage('正在为所有玩家发牌...');
    setAllPlayersReadyForCompare(false);

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
        if (dealResult.success && dealResult.hand) {
          const dealtCards = mapBackendCardsToFrontendCards(dealResult.hand);
          return {
            ...createInitialPlayerState(player.id, player.name, player.isAI),
            initial13Cards: [...dealtCards],
            cards: { ...createInitialPlayerState().cards, MIDDLE: player.isAI ? [] : dealtCards },
            isThinking: player.isAI,
          };
        }
        console.error(`Failed to deal cards for ${player.name}`, dealResult.message);
        return {...player, initial13Cards:[], cards: createInitialPlayerState().cards };
      });
      setPlayers(updatedPlayersData);
      setGameMessage('发牌完毕！请你理牌，AI正在理牌...');

      updatedPlayersData.filter(p => p.isAI).forEach(aiPlayer => {
        if (aiPlayer.initial13Cards.length === 13) {
          autoArrangeAIHand(aiPlayer.id, aiPlayer.initial13Cards);
        }
      });

    } catch (error) {
      console.error("Deal New Hand Error:", error);
      setGameMessage(`发牌请求错误: ${error.message}`);
    }
    setIsLoadingDeal(false);
  };

  const autoArrangeAIHand = useCallback((aiPlayerId, cardsForAI) => {
    setPlayers(prev => prev.map(p => p.id === aiPlayerId ? { ...p, isThinking: true } : p));
    
    setTimeout(() => {
      const arrangement = findBestThirteenWaterArrangement(cardsForAI);
      if (arrangement) {
        evaluateAndSetPlayerArrangement(aiPlayerId, {
          TOP: arrangement.top,
          MIDDLE: arrangement.middle,
          BOTTOM: arrangement.bottom,
        });
      } else {
        console.error(`AI ${aiPlayerId} failed to arrange hand.`);
        setPlayers(prev => prev.map(p => p.id === aiPlayerId ? { ...p, isThinking: false, isArranged: false } : p));
      }
    }, 500 + Math.random() * 1500);
  }, [evaluateAndSetPlayerArrangement]);


  useEffect(() => {
    // 初始加载时不自动发牌
  }, []);

  const onDragEnd = (result) => {
    const { source, destination } = result;
    if (!destination || !humanPlayer) return;

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
    if (!humanPlayer || humanPlayer.isArranged || humanPlayer.isThinking) return;
    
    const allHumanCards = [
      ...humanPlayer.cards.TOP,
      ...humanPlayer.cards.MIDDLE,
      ...humanPlayer.cards.BOTTOM,
    ].filter(Boolean);

    let cardsToArrange = allHumanCards;
    if (allHumanCards.length !== 13) {
      const collectedCards = humanPlayer.initial13Cards;
      if (!collectedCards || collectedCards.length !== 13) {
        setGameMessage("无法收集齐13张牌进行AI辅助！请先发牌。");
        return;
      }
      cardsToArrange = [...collectedCards];
    }
    
    setPlayers(prev => prev.map(p => p.id === HUMAN_PLAYER_ID ? { ...p, isThinking: true, cards: {TOP:[], MIDDLE:[], BOTTOM:[]} } : p));
    setGameMessage('AI 正在帮你理牌...');
    autoArrangeAIHand(HUMAN_PLAYER_ID, cardsToArrange);
  };
  
  const handleConfirmHand = () => {
    if (!humanPlayer || !humanPlayer.isArranged) {
      setGameMessage("请先将您的13张牌按3-5-5的组合摆好。");
      return;
    }
    if (humanPlayer.isMisArranged) {
      setGameMessage("您的牌型组合错误（倒水），请调整！");
      return;
    }
    setGameMessage("你的牌已确认！等待其他AI玩家...");
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
            aiPlayers={aiPlayers} 
            handEvaluator={{ HAND_TYPE_NAMES }}
        />
        
        <h1 className="game-title">十三水</h1>
        {gameMessage && <p className={`game-message ${humanPlayer.isMisArranged && humanPlayer.isArranged ? 'error' : ''}`}>{gameMessage}</p>}

        <div className={`game-board ${humanPlayer.isMisArranged && humanPlayer.isArranged ? 'misarranged-board' : ''}`}>
          <HandArea
            droppableId={getPlayerDroppableId(HUMAN_PLAYER_ID, 'TOP')}
            title={`头道 (${humanTopCurrentCount}/${HAND_FIXED_CAPACITIES.TOP})`}
            cards={humanPlayer.cards.TOP}
            evaluatedHandType={humanPlayer.finalArrangement?.topEval}
            allowWrap={false} 
          />
          <HandArea
            droppableId={getPlayerDroppableId(HUMAN_PLAYER_ID, 'MIDDLE')}
            title={`${humanMiddleHandLabel} (${humanMiddleCurrentCount}/${Math.max(0, humanMiddleExpectedCount)})`}
            cards={humanPlayer.cards.MIDDLE}
            evaluatedHandType={humanPlayer.isArranged ? humanPlayer.finalArrangement?.middleEval : null}
            allowWrap={!humanPlayer.isArranged}
          />
          <HandArea
            droppableId={getPlayerDroppableId(HUMAN_PLAYER_ID, 'BOTTOM')}
            title={`尾道 (${humanBottomCurrentCount}/${HAND_FIXED_CAPACITIES.BOTTOM})`}
            cards={humanPlayer.cards.BOTTOM}
            evaluatedHandType={humanPlayer.finalArrangement?.bottomEval}
            allowWrap={false}
          />
        </div>

        <div className="controls">
          <button className="game-button" onClick={handleDealNewHand} disabled={isLoadingDeal}>
            {isLoadingDeal ? '发牌中...' : '重新发牌'}
          </button>
          <button 
            className="game-button" 
            onClick={handleHumanPlayerAISort} 
            disabled={isLoadingDeal || humanPlayer.isArranged || humanPlayer.isThinking}
          >
            {humanPlayer.isThinking && humanPlayer.id === HUMAN_PLAYER_ID ? 'AI理牌中...' : 'AI帮我理牌'}
          </button>
          <button 
            className="game-button" 
            onClick={handleConfirmHand} 
            disabled={isLoadingDeal || !humanPlayer.isArranged || (humanPlayer.isMisArranged && humanPlayer.isArranged) || allPlayersReadyForCompare}
          >
            确定牌型
          </button>
        </div>
        {allPlayersReadyForCompare && 
            <button className="game-button compare-all-button" onClick={() => alert("比牌逻辑待实现！")}>
                开始比牌！
            </button>
        }
      </div>
    </DragDropContext>
  );
}

export default App;
