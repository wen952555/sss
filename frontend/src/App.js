// frontend/src/App.js
import React, { useState, useEffect, useCallback } from 'react';
import { DragDropContext } from 'react-beautiful-dnd';
import HandArea from './components/HandArea';
import PlayerHandDisplay from './components/PlayerHandDisplay';
import { API_BASE_URL } from './config';
import { mapBackendCardsToFrontendCards, FULL_DECK_OBJECTS } from './logic/card';
import { evaluateHand, compareEvaluatedHands, HAND_TYPES } from './logic/handEvaluator';
import { findBestThirteenWaterArrangement } from './logic/thirteenWaterAI';
import './App.css';

// Constants for droppable IDs
const DROPPABLE_IDS = {
  PLAYER_INITIAL: 'playerInitialHand',
  TOP: 'topHandArea',
  MIDDLE: 'middleHandArea',
  BOTTOM: 'bottomHandArea',
};

const HAND_CAPACITIES = {
  [DROPPABLE_IDS.TOP]: 3,
  [DROPPABLE_IDS.MIDDLE]: 5,
  [DROPPABLE_IDS.BOTTOM]: 5,
};

function App() {
  const [playerCards, setPlayerCards] = useState({ // Store all cards in one object for easier dnd
    [DROPPABLE_IDS.PLAYER_INITIAL]: [],
    [DROPPABLE_IDS.TOP]: [],
    [DROPPABLE_IDS.MIDDLE]: [],
    [DROPPABLE_IDS.BOTTOM]: [],
  });

  const [evaluatedHands, setEvaluatedHands] = useState({
    [DROPPABLE_IDS.TOP]: null,
    [DROPPABLE_IDS.MIDDLE]: null,
    [DROPPABLE_IDS.BOTTOM]: null,
  });

  const [middleHandLabel, setMiddleHandLabel] = useState('手牌');
  const [isArranged, setIsArranged] = useState(false);
  const [isLoadingDeal, setIsLoadingDeal] = useState(false);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [gameMessage, setGameMessage] = useState('');
  const [isMisArranged, setIsMisArranged] = useState(false); // "倒水"

  // Memoize hand evaluation to avoid re-calculating on every render if cards haven't changed
  const evaluateAllHands = useCallback(() => {
    const newEvaluatedHands = {};
    let misArrangedFlag = false;

    const topEval = playerCards[DROPPABLE_IDS.TOP].length === HAND_CAPACITIES[DROPPABLE_IDS.TOP]
      ? evaluateHand(playerCards[DROPPABLE_IDS.TOP])
      : null;
    newEvaluatedHands[DROPPABLE_IDS.TOP] = topEval;

    const middleEval = playerCards[DROPPABLE_IDS.MIDDLE].length === HAND_CAPACITIES[DROPPABLE_IDS.MIDDLE]
      ? evaluateHand(playerCards[DROPPABLE_IDS.MIDDLE])
      : null;
    newEvaluatedHands[DROPPABLE_IDS.MIDDLE] = middleEval;
    
    const bottomEval = playerCards[DROPPABLE_IDS.BOTTOM].length === HAND_CAPACITIES[DROPPABLE_IDS.BOTTOM]
      ? evaluateHand(playerCards[DROPPABLE_IDS.BOTTOM])
      : null;
    newEvaluatedHands[DROPPABLE_IDS.BOTTOM] = bottomEval;

    // Check for misarrangement if all hands are full
    if (topEval && middleEval && bottomEval) {
        const topVsMiddle = compareEvaluatedHands(topEval, middleEval);
        const middleVsBottom = compareEvaluatedHands(middleEval, bottomEval);
        if (topVsMiddle > 0 || middleVsBottom > 0) {
            misArrangedFlag = true;
            setGameMessage("注意：牌型组合错误（倒水）！");
        } else {
            setGameMessage("牌型正确！");
        }
    } else {
        setGameMessage(''); // Clear message if not fully arranged
    }
    setIsMisArranged(misArrangedFlag);
    setEvaluatedHands(newEvaluatedHands);

  }, [playerCards]);


  useEffect(() => {
    evaluateAllHands();

    const topLen = playerCards[DROPPABLE_IDS.TOP].length;
    const midLen = playerCards[DROPPABLE_IDS.MIDDLE].length;
    const botLen = playerCards[DROPPABLE_IDS.BOTTOM].length;

    if (topLen === 3 && midLen === 5 && botLen === 5) {
      setMiddleHandLabel('中道');
      setIsArranged(true);
    } else {
      setMiddleHandLabel('手牌');
      setIsArranged(false);
    }
  }, [playerCards, evaluateAllHands]);


  const handleDealNewHand = async () => {
    setIsLoadingDeal(true);
    setGameMessage('正在发牌...');
    try {
      const response = await fetch(`${API_BASE_URL}/api/deal_cards.php`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();

      if (data.success && data.hand) {
        const frontendCards = mapBackendCardsToFrontendCards(data.hand);
        setPlayerCards({
          [DROPPABLE_IDS.PLAYER_INITIAL]: frontendCards,
          [DROPPABLE_IDS.TOP]: [],
          [DROPPABLE_IDS.MIDDLE]: [],
          [DROPPABLE_IDS.BOTTOM]: [],
        });
        setGameMessage('请理牌！');
      } else {
        setGameMessage(`发牌失败: ${data.message || '未知错误'}`);
      }
    } catch (error) {
      console.error("Deal New Hand Error:", error);
      setGameMessage(`发牌请求错误: ${error.message}`);
       // Fallback for local testing if backend fails
       // console.warn("Backend deal failed, using local deck for testing.");
       // const localDeck = [...FULL_DECK_OBJECTS]; // Use a copy
       // localDeck.sort(() => 0.5 - Math.random()); // Shuffle
       // setPlayerCards({
       //   [DROPPABLE_IDS.PLAYER_INITIAL]: localDeck.slice(0,13),
       //   [DROPPABLE_IDS.TOP]: [], [DROPPABLE_IDS.MIDDLE]: [], [DROPPABLE_IDS.BOTTOM]: [],
       // });
    }
    setIsLoadingDeal(false);
  };

  useEffect(() => { // Deal on initial load
    handleDealNewHand();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const onDragEnd = (result) => {
    const { source, destination } = result;
    if (!destination) return;

    const sourceDroppableId = source.droppableId;
    const destDroppableId = destination.droppableId;

    // Moving within the same list
    if (sourceDroppableId === destDroppableId) {
      const items = Array.from(playerCards[sourceDroppableId]);
      const [reorderedItem] = items.splice(source.index, 1);
      items.splice(destination.index, 0, reorderedItem);
      setPlayerCards(prev => ({ ...prev, [sourceDroppableId]: items }));
    } else {
      // Moving between lists
      const sourceItems = Array.from(playerCards[sourceDroppableId]);
      const destItems = Array.from(playerCards[destDroppableId]);
      const [movedItem] = sourceItems.splice(source.index, 1);

      // Check capacity of destination if it's a fixed-size hand
      if (HAND_CAPACITIES[destDroppableId] && destItems.length >= HAND_CAPACITIES[destDroppableId]) {
        // Destination is full, do nothing (or provide feedback)
        setGameMessage("此道已满！");
        return;
      }

      destItems.splice(destination.index, 0, movedItem);
      setPlayerCards(prev => ({
        ...prev,
        [sourceDroppableId]: sourceItems,
        [destDroppableId]: destItems,
      }));
    }
  };

  const handleAISort = () => {
    const allCurrentCards = [
      ...playerCards[DROPPABLE_IDS.PLAYER_INITIAL],
      ...playerCards[DROPPABLE_IDS.TOP],
      ...playerCards[DROPPABLE_IDS.MIDDLE],
      ...playerCards[DROPPABLE_IDS.BOTTOM],
    ];

    if (allCurrentCards.length !== 13) {
      setGameMessage("AI分牌需要全部13张牌在手中或牌道中！");
      return;
    }
    setIsLoadingAI(true);
    setGameMessage('AI 正在思考...');
    
    // Simulate async for complex AI or just to show loading state
    setTimeout(() => {
        const arrangement = findBestThirteenWaterArrangement(allCurrentCards);
        if (arrangement) {
            setPlayerCards({
                [DROPPABLE_IDS.PLAYER_INITIAL]: [],
                [DROPPABLE_IDS.TOP]: arrangement.top,
                [DROPPABLE_IDS.MIDDLE]: arrangement.middle,
                [DROPPABLE_IDS.BOTTOM]: arrangement.bottom,
            });
            // Evaluations will be updated by useEffect -> evaluateAllHands
            setGameMessage('AI 分牌完成！');
        } else {
            setGameMessage('AI 未能找到合适的牌型 (请检查AI逻辑)。');
        }
        setIsLoadingAI(false);
    }, 50); // Small delay to allow UI update for loading message
  };

  const handleConfirmHand = () => {
      if (!isArranged) {
          setGameMessage("请先将13张牌摆放到对应的牌道。");
          return;
      }
      if (isMisArranged) {
          setGameMessage("牌型组合错误（倒水），请调整后再确认！");
          return;
      }
      // TODO: Logic for submitting hand to backend for multiplayer game
      console.log("Confirmed Hands:", {
          top: playerCards[DROPPABLE_IDS.TOP].map(c=>c.id),
          middle: playerCards[DROPPABLE_IDS.MIDDLE].map(c=>c.id),
          bottom: playerCards[DROPPABLE_IDS.BOTTOM].map(c=>c.id),
          evaluations: evaluatedHands
      });
      setGameMessage("牌局已确认！(比牌逻辑待实现)");
      // Potentially disable further dragging or show opponent's hand
  };


  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="app-container">
        <h1 className="game-title">十三水</h1>
        {gameMessage && <p className={`game-message ${isMisArranged ? 'error' : ''}`}>{gameMessage}</p>}

        {playerCards[DROPPABLE_IDS.PLAYER_INITIAL].length > 0 && (
          <div className="player-initial-hand-section">
            <h3 className="hand-area-title">你的手牌 (共 {playerCards[DROPPABLE_IDS.PLAYER_INITIAL].length} 张)</h3>
            <PlayerHandDisplay cards={playerCards[DROPPABLE_IDS.PLAYER_INITIAL]} droppableId={DROPPABLE_IDS.PLAYER_INITIAL} />
          </div>
        )}

        <div className={`game-board ${isMisArranged ? 'misarranged-board' : ''}`}>
          <HandArea
            droppableId={DROPPABLE_IDS.TOP}
            title="头道"
            cards={playerCards[DROPPABLE_IDS.TOP]}
            requiredCount={HAND_CAPACITIES[DROPPABLE_IDS.TOP]}
            evaluatedHandType={evaluatedHands[DROPPABLE_IDS.TOP]}
          />
          <HandArea
            droppableId={DROPPABLE_IDS.MIDDLE}
            title={middleHandLabel}
            cards={playerCards[DROPPABLE_IDS.MIDDLE]}
            requiredCount={HAND_CAPACITIES[DROPPABLE_IDS.MIDDLE]}
            evaluatedHandType={evaluatedHands[DROPPABLE_IDS.MIDDLE]}
          />
          <HandArea
            droppableId={DROPPABLE_IDS.BOTTOM}
            title="尾道"
            cards={playerCards[DROPPABLE_IDS.BOTTOM]}
            requiredCount={HAND_CAPACITIES[DROPPABLE_IDS.BOTTOM]}
            evaluatedHandType={evaluatedHands[DROPPABLE_IDS.BOTTOM]}
          />
        </div>

        <div className="controls">
          <button className="game-button" onClick={handleDealNewHand} disabled={isLoadingDeal || isLoadingAI}>
            {isLoadingDeal ? '发牌中...' : '重新发牌'}
          </button>
          <button className="game-button" onClick={handleAISort} disabled={isLoadingAI || isLoadingDeal || playerCards[DROPPABLE_IDS.PLAYER_INITIAL].length === 0 && isArranged}>
            {isLoadingAI ? 'AI思考中...' : 'AI分牌'}
          </button>
          <button className="game-button" onClick={handleConfirmHand} disabled={!isArranged || isLoadingAI || isLoadingDeal || isMisArranged}>
            确定牌型
          </button>
        </div>
      </div>
    </DragDropContext>
  );
}

export default App;
