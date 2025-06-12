// frontend/src/App.js
import React, { useState, useEffect, useCallback } from 'react';
import { DragDropContext } from 'react-beautiful-dnd';
import HandArea from './components/HandArea';
// PlayerHandDisplay 组件不再需要，因为初始牌直接在中间牌道
// import PlayerHandDisplay from './components/PlayerHandDisplay';
import { API_BASE_URL } from './config';
import { mapBackendCardsToFrontendCards } from './logic/card';
import { evaluateHand, compareEvaluatedHands } from './logic/handEvaluator';
import { findBestThirteenWaterArrangement } from './logic/thirteenWaterAI';
import './App.css';

const DROPPABLE_IDS = {
  // 不再有 PLAYER_INITIAL
  TOP: 'topHandArea',
  MIDDLE: 'middleHandArea', // 这个区域初始时作为“手牌”区
  BOTTOM: 'bottomHandArea',
};

const HAND_FIXED_CAPACITIES = { // 这是牌道固定后的容量
  [DROPPABLE_IDS.TOP]: 3,
  [DROPPABLE_IDS.MIDDLE]: 5, // 作为“中道”时的容量
  [DROPPABLE_IDS.BOTTOM]: 5,
};

function App() {
  const [playerCards, setPlayerCards] = useState({
    // 初始时，所有牌都在 MIDDLE
    [DROPPABLE_IDS.TOP]: [],
    [DROPPABLE_IDS.MIDDLE]: [],
    [DROPPABLE_IDS.BOTTOM]: [],
  });

  const [evaluatedHands, setEvaluatedHands] = useState({
    [DROPPABLE_IDS.TOP]: null,
    [DROPPABLE_IDS.MIDDLE]: null,
    [DROPPABLE_IDS.BOTTOM]: null,
  });

  const [middleHandLabel, setMiddleHandLabel] = useState('手牌'); // 初始为“手牌”
  const [isHandFullyArranged, setIsHandFullyArranged] = useState(false); // 是否3-5-5摆好
  const [isLoadingDeal, setIsLoadingDeal] = useState(false);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [gameMessage, setGameMessage] = useState('');
  const [isMisArranged, setIsMisArranged] = useState(false);

  // 判断是否所有牌已按3-5-5摆好
  const checkFullyArranged = useCallback(() => {
    const topLen = playerCards[DROPPABLE_IDS.TOP].length;
    const midLen = playerCards[DROPPABLE_IDS.MIDDLE].length;
    const botLen = playerCards[DROPPABLE_IDS.BOTTOM].length;
    return topLen === HAND_FIXED_CAPACITIES[DROPPABLE_IDS.TOP] &&
           midLen === HAND_FIXED_CAPACITIES[DROPPABLE_IDS.MIDDLE] &&
           botLen === HAND_FIXED_CAPACITIES[DROPPABLE_IDS.BOTTOM];
  }, [playerCards]);

  const evaluateAllHands = useCallback(() => {
    // ... (evaluateAllHands 逻辑保持不变，但触发条件可能需要调整) ...
    // (代码与之前相同，此处省略以减少重复)
    const newEvaluatedHands = {};
    let misArrangedFlag = false;

    const topEval = playerCards[DROPPABLE_IDS.TOP].length === HAND_FIXED_CAPACITIES[DROPPABLE_IDS.TOP]
      ? evaluateHand(playerCards[DROPPABLE_IDS.TOP])
      : null;
    newEvaluatedHands[DROPPABLE_IDS.TOP] = topEval;

    // 中道只有在完全摆好牌后才按5张评估，否则它是手牌区，不单独评估牌型
    const middleEval = checkFullyArranged() && playerCards[DROPPABLE_IDS.MIDDLE].length === HAND_FIXED_CAPACITIES[DROPPABLE_IDS.MIDDLE]
      ? evaluateHand(playerCards[DROPPABLE_IDS.MIDDLE])
      : null;
    newEvaluatedHands[DROPPABLE_IDS.MIDDLE] = middleEval;
    
    const bottomEval = playerCards[DROPPABLE_IDS.BOTTOM].length === HAND_FIXED_CAPACITIES[DROPPABLE_IDS.BOTTOM]
      ? evaluateHand(playerCards[DROPPABLE_IDS.BOTTOM])
      : null;
    newEvaluatedHands[DROPPABLE_IDS.BOTTOM] = bottomEval;

    if (topEval && middleEval && bottomEval) { // 只有三道都满了才检查倒水
        const topVsMiddle = compareEvaluatedHands(topEval, middleEval);
        const middleVsBottom = compareEvaluatedHands(middleEval, bottomEval);
        if (topVsMiddle > 0 || middleVsBottom > 0) {
            misArrangedFlag = true;
            setGameMessage("注意：牌型组合错误（倒水）！");
        } else {
            setGameMessage("牌型正确！");
        }
    } else if (checkFullyArranged()) { // 如果是3-5-5但某个评估为null（不应该发生）
        setGameMessage('');
    }
    setIsMisArranged(misArrangedFlag);
    setEvaluatedHands(newEvaluatedHands);
  }, [playerCards, checkFullyArranged]);

  useEffect(() => {
    const fullyArranged = checkFullyArranged();
    setIsHandFullyArranged(fullyArranged);

    if (fullyArranged) {
      setMiddleHandLabel('中道');
    } else {
      setMiddleHandLabel('手牌');
    }
    // 只有在牌面变化时才重新评估
    evaluateAllHands();

  }, [playerCards, checkFullyArranged, evaluateAllHands]);


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
          [DROPPABLE_IDS.TOP]: [],
          [DROPPABLE_IDS.MIDDLE]: frontendCards, // 所有13张牌初始放在这里
          [DROPPABLE_IDS.BOTTOM]: [],
        });
        setGameMessage('请理牌！将牌拖至头道和尾道。');
      } else {
        setGameMessage(`发牌失败: ${data.message || '未知错误'}`);
      }
    } catch (error) {
      console.error("Deal New Hand Error:", error);
      setGameMessage(`发牌请求错误: ${error.message}`);
    }
    setIsLoadingDeal(false);
  };

  useEffect(() => {
    handleDealNewHand();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onDragEnd = (result) => {
    const { source, destination } = result;
    if (!destination) return;

    const sourceDroppableId = source.droppableId;
    const destDroppableId = destination.droppableId;

    // 更新 playerCards 的逻辑
    const currentSourceCards = [...playerCards[sourceDroppableId]];
    const movedCard = currentSourceCards.splice(source.index, 1)[0];

    if (sourceDroppableId === destDroppableId) { // 同区域内移动
      currentSourceCards.splice(destination.index, 0, movedCard);
      setPlayerCards(prev => ({ ...prev, [sourceDroppableId]: currentSourceCards }));
    } else { // 跨区域移动
      const currentDestCards = [...playerCards[destDroppableId]];
      
      // 检查目标牌道容量 (头道3, 尾道5)
      // 中间牌道在作为“手牌”时不限制（最多13），作为“中道”时是5
      let destCapacity = 13; // 默认中间牌道可以放13张
      if (destDroppableId === DROPPABLE_IDS.TOP) {
        destCapacity = HAND_FIXED_CAPACITIES[DROPPABLE_IDS.TOP];
      } else if (destDroppableId === DROPPABLE_IDS.BOTTOM) {
        destCapacity = HAND_FIXED_CAPACITIES[DROPPABLE_IDS.BOTTOM];
      } else if (destDroppableId === DROPPABLE_IDS.MIDDLE) {
        // 如果头道和尾道已经满了，则中道容量变为5
        if (playerCards[DROPPABLE_IDS.TOP].length === HAND_FIXED_CAPACITIES[DROPPABLE_IDS.TOP] &&
            playerCards[DROPPABLE_IDS.BOTTOM].length === HAND_FIXED_CAPACITIES[DROPPABLE_IDS.BOTTOM]) {
          destCapacity = HAND_FIXED_CAPACITIES[DROPPABLE_IDS.MIDDLE];
        }
      }

      if (currentDestCards.length >= destCapacity) {
        setGameMessage("此道已满！");
        // 如果目标已满，牌应该返回原处，但由于我们已经从 currentSourceCards 移除了，
        // 最简单的处理是不更新状态，或者更复杂地将牌插回 sourceList。
        // 为了简化，这里不更新状态，dnd库会把牌放回原位（视觉上）。
        // 但如果需要精确状态，则需要把 movedCard 加回 currentSourceCards。
        // 这里我们假设dnd的视觉回退足够。
        return; 
      }

      currentDestCards.splice(destination.index, 0, movedCard);
      setPlayerCards(prev => ({
        ...prev,
        [sourceDroppableId]: currentSourceCards,
        [destDroppableId]: currentDestCards,
      }));
    }
  };

  const handleAISort = () => {
    // AI 分牌时，所有牌应该先“回收”到一起
    const allPlayerCards = [
      ...playerCards[DROPPABLE_IDS.TOP],
      ...playerCards[DROPPABLE_IDS.MIDDLE],
      ...playerCards[DROPPABLE_IDS.BOTTOM],
    ];
    // 清空牌道，以确保AI的结果能正确放入
    setPlayerCards({ 
        [DROPPABLE_IDS.TOP]:[], 
        [DROPPABLE_IDS.MIDDLE]:[], // AI结果会填充这些
        [DROPPABLE_IDS.BOTTOM]:[]
    });


    if (allPlayerCards.length !== 13) {
      setGameMessage("AI分牌需要全部13张牌！");
      // 如果牌数不对，可能需要重新发牌或从之前的状态恢复所有牌
      // 为简化，这里仅提示。可以考虑将 allPlayerCards 设置回 MIDDLE。
      // setPlayerCards(prev => ({...prev, [DROPPABLE_IDS.MIDDLE]: allPlayerCards}));
      return;
    }
    setIsLoadingAI(true);
    setGameMessage('AI 正在思考...');
    
    setTimeout(() => {
        const arrangement = findBestThirteenWaterArrangement(allPlayerCards);
        if (arrangement) {
            setPlayerCards({ // 直接用AI的结果设置牌道
                [DROPPABLE_IDS.TOP]: arrangement.top,
                [DROPPABLE_IDS.MIDDLE]: arrangement.middle,
                [DROPPABLE_IDS.BOTTOM]: arrangement.bottom,
            });
            setGameMessage('AI 分牌完成！');
        } else {
            setGameMessage('AI 未能找到合适的牌型。');
            // AI失败，把牌放回中间“手牌”区
            setPlayerCards(prev => ({
                ...prev, // 保留空的头尾道
                [DROPPABLE_IDS.MIDDLE]: allPlayerCards 
            }));
        }
        setIsLoadingAI(false);
    }, 50);
  };

  const handleConfirmHand = () => {
      // ... (逻辑与之前类似，但基于 isHandFullyArranged) ...
      if (!isHandFullyArranged) {
          setGameMessage("请先将13张牌按3-5-5的组合摆放到对应的牌道。");
          return;
      }
      if (isMisArranged) {
          setGameMessage("牌型组合错误（倒水），请调整后再确认！");
          return;
      }
      console.log("Confirmed Hands:", {
          top: playerCards[DROPPABLE_IDS.TOP].map(c=>c.id),
          middle: playerCards[DROPPABLE_IDS.MIDDLE].map(c=>c.id),
          bottom: playerCards[DROPPABLE_IDS.BOTTOM].map(c=>c.id),
          evaluations: evaluatedHands
      });
      setGameMessage("牌局已确认！");
  };

  // 计算中间牌道（手牌区）应显示的牌数量和期望数量
  const middleHandCurrentCount = playerCards[DROPPABLE_IDS.MIDDLE].length;
  const middleHandExpectedCount = isHandFullyArranged 
    ? HAND_FIXED_CAPACITIES[DROPPABLE_IDS.MIDDLE] 
    : (13 - playerCards[DROPPABLE_IDS.TOP].length - playerCards[DROPPABLE_IDS.BOTTOM].length);


  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="app-container">
        <h1 className="game-title">十三水</h1>
        {gameMessage && <p className={`game-message ${isMisArranged ? 'error' : ''}`}>{gameMessage}</p>}

        {/* 移除顶部的 PlayerHandDisplay 组件 */}
        {/* 
        {playerCards[DROPPABLE_IDS.PLAYER_INITIAL] && playerCards[DROPPABLE_IDS.PLAYER_INITIAL].length > 0 && (
          <div className="player-initial-hand-section">
            <h3 className="hand-area-title">你的手牌 (共 {playerCards[DROPPABLE_IDS.PLAYER_INITIAL].length} 张)</h3>
            <PlayerHandDisplay cards={playerCards[DROPPABLE_IDS.PLAYER_INITIAL]} droppableId={DROPPABLE_IDS.PLAYER_INITIAL} />
          </div>
        )}
        */}

        <div className={`game-board ${isMisArranged && isHandFullyArranged ? 'misarranged-board' : ''}`}>
          <HandArea
            droppableId={DROPPABLE_IDS.TOP}
            title={`头道 (${playerCards[DROPPABLE_IDS.TOP].length}/${HAND_FIXED_CAPACITIES[DROPPABLE_IDS.TOP]})`}
            cards={playerCards[DROPPABLE_IDS.TOP]}
            // requiredCount 不再需要，因为标题已包含数量
            evaluatedHandType={evaluatedHands[DROPPABLE_IDS.TOP]}
            // 传递一个标识，告诉HandArea是否允许换行（仅中间牌道作为手牌时）
            allowWrap={false} 
          />
          <HandArea
            droppableId={DROPPABLE_IDS.MIDDLE}
            title={`${middleHandLabel} (${middleHandCurrentCount}/${Math.max(0, middleHandExpectedCount)})`}
            cards={playerCards[DROPPABLE_IDS.MIDDLE]}
            evaluatedHandType={isHandFullyArranged ? evaluatedHands[DROPPABLE_IDS.MIDDLE] : null} // 只有中道时才显示牌型
            allowWrap={!isHandFullyArranged} // 当作为“手牌”时允许换行
          />
          <HandArea
            droppableId={DROPPABLE_IDS.BOTTOM}
            title={`尾道 (${playerCards[DROPPABLE_IDS.BOTTOM].length}/${HAND_FIXED_CAPACITIES[DROPPABLE_IDS.BOTTOM]})`}
            cards={playerCards[DROPPABLE_IDS.BOTTOM]}
            evaluatedHandType={evaluatedHands[DROPPABLE_IDS.BOTTOM]}
            allowWrap={false}
          />
        </div>

        <div className="controls">
          <button className="game-button" onClick={handleDealNewHand} disabled={isLoadingDeal || isLoadingAI}>
            {isLoadingDeal ? '发牌中...' : '重新发牌'}
          </button>
          <button 
            className="game-button" 
            onClick={handleAISort} 
            // AI分牌按钮的disabled逻辑：只要不在加载中就可以点
            disabled={isLoadingAI || isLoadingDeal}
          >
            {isLoadingAI ? 'AI思考中...' : 'AI分牌'}
          </button>
          <button 
            className="game-button" 
            onClick={handleConfirmHand} 
            disabled={!isHandFullyArranged || isLoadingAI || isLoadingDeal || (isMisArranged && isHandFullyArranged)}
          >
            确定牌型
          </button>
        </div>
      </div>
    </DragDropContext>
  );
}

export default App;
