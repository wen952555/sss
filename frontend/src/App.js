// frontend/src/App.js
import React, { useState, useEffect, useCallback } from 'react';
import { DragDropContext } from 'react-beautiful-dnd';
import HandArea from './components/HandArea';
import TopBanner from './components/TopBanner';
import { API_BASE_URL } from './config';
import { mapBackendCardsToFrontendCards } from './logic/card';
import { evaluateHand, compareEvaluatedHands, HAND_TYPE_NAMES } from './logic/handEvaluator'; 
import { findBestThirteenWaterArrangement } from './logic/thirteenWaterAI';
import { calculateAllPlayerScores } from './logic/scoreCalculator'; // 引入计分逻辑
import './App.css';

const DROPPABLE_IDS_PLAYER_PREFIX = "player_";

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
  finalArrangement: null,
  isMisArranged: false,
  score: 0, // 玩家当前总分 (多局累加)
  roundScore: 0, // 本局得分
  comparisonResults: {}, // 对其他玩家的比牌详情 { opponentId: { score, details } }
});

const HUMAN_PLAYER_ID = 'human_player_0';

function App() {
  const [players, setPlayers] = useState(() => [ // 使用函数初始化以避免不必要的重渲染
    createInitialPlayerState(HUMAN_PLAYER_ID, '你'),
    createInitialPlayerState('ai_player_1', 'AI 悟空', true),
    createInitialPlayerState('ai_player_2', 'AI 八戒', true),
    createInitialPlayerState('ai_player_3', 'AI 沙僧', true),
  ]);

  const humanPlayer = players.find(p => p.id === HUMAN_PLAYER_ID);
  const aiPlayers = players.filter(p => p.isAI);

  const [humanMiddleHandLabel, setHumanMiddleHandLabel] = useState('手牌');
  const [isLoadingDeal, setIsLoadingDeal] = useState(false);
  const [gameMessage, setGameMessage] = useState('点击“重新发牌”开始游戏');
  const [allPlayersArranged, setAllPlayersArranged] = useState(false); // 所有玩家是否都已摆好牌
  const [comparisonPhaseDone, setComparisonPhaseDone] = useState(false); // 比牌阶段是否已完成

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
            // 仅对真人玩家检查倒水，AI默认不倒水
            if (!p.isAI && (compareEvaluatedHands(topEval, middleEval) > 0 || compareEvaluatedHands(middleEval, bottomEval) > 0)) {
              misArranged = true;
            }
          }
          
          return {
            ...p,
            cards: newCards,
            isArranged: isFullyArrangedNow,
            finalArrangement: finalEval,
            isMisArranged: misArranged, // AI的 isMisArranged 应始终为 false
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

    if (isHumanArranged && !comparisonPhaseDone) { // 只有在比牌前才提示
      if (humanPlayer.isMisArranged) {
        setGameMessage("注意：你的牌型组合错误（倒水）！");
      } else {
        const allDone = players.every(p => p.isArranged);
        if (allDone) {
            setGameMessage("所有玩家已准备就绪！点击“开始比牌”进行结算。");
        } else {
            setGameMessage("你的牌已摆好！等待AI...");
        }
      }
    }
  }, [humanPlayer, players, checkPlayerFullyArranged, comparisonPhaseDone]);

  useEffect(() => {
    const allArranged = players.every(p => p.isArranged);
    setAllPlayersArranged(allArranged);
    // 比牌按钮的显示逻辑会处理 gameMessage
  }, [players]);

  const handleDealNewHand = async () => {
    setIsLoadingDeal(true);
    setGameMessage('正在为所有玩家发牌...');
    setAllPlayersArranged(false);
    setComparisonPhaseDone(false); // 重置比牌阶段状态

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
          return {
            ...baseState,
            score: player.score, // 保留上一局的总分
            initial13Cards: [...dealtCards],
            cards: { ...baseState.cards, MIDDLE: player.isAI ? [] : dealtCards },
            isThinking: player.isAI,
          };
        }
        console.error(`Failed to deal cards for ${player.name}`, dealResult.message);
        return {...baseState, score: player.score }; // 发牌失败则清空手牌但保留总分
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
    }, 300 + Math.random() * 1200);
  }, [evaluateAndSetPlayerArrangement]);

  useEffect(() => { /* 初始不发牌 */ }, []);

  const onDragEnd = (result) => {
    const { source, destination } = result;
    if (!destination || !humanPlayer || comparisonPhaseDone) return; // 比牌后不能再拖拽

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
    if (!humanPlayer || humanPlayer.isArranged || humanPlayer.isThinking || comparisonPhaseDone) return;
    
    const currentCardsInPlay = [
      ...humanPlayer.cards.TOP,
      ...humanPlayer.cards.MIDDLE,
      ...humanPlayer.cards.BOTTOM,
    ].filter(Boolean);

    let cardsToArrange = currentCardsInPlay;
    if (currentCardsInPlay.length !== 13) { // 如果牌没有全部在牌道中，则从初始手牌取
      const initialCards = humanPlayer.initial13Cards;
      if (!initialCards || initialCards.length !== 13) {
        setGameMessage("无法收集齐13张牌进行AI辅助！请先发牌。");
        return;
      }
      cardsToArrange = [...initialCards]; // 使用初始牌进行排序
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
    // 标记真人玩家已确认，但主要依赖 allPlayersArranged 状态
    setPlayers(prev => prev.map(p => p.id === HUMAN_PLAYER_ID ? {...p, confirmed: true} : p)); // 可选状态
    setGameMessage("你的牌已确认！等待其他AI玩家...");
  };

  const handleStartCompare = () => {
    if (!allPlayersArranged) {
      setGameMessage("尚有玩家未完成理牌！");
      return;
    }
    setGameMessage("正在计算比牌结果...");
    setComparisonPhaseDone(true); // 标记比牌阶段完成

    const playersAfterComparison = calculateAllPlayerScores(players, HAND_TYPE_NAMES);
    
    // 更新每个玩家的总分，并将本轮得分暂存或显示
    const updatedPlayersWithTotalScore = playersAfterComparison.map(p => ({
        ...p,
        score: p.score, // calculateAllPlayerScores 返回的是本轮得分，需要累加
        roundScore: p.score, // 暂存本轮得分
        comparisonDetails: p.comparisonResults // comparisonResults 存储对战详情
    }));

    setPlayers(updatedPlayersWithTotalScore);

    // 构建一个简单的结果摘要到 gameMessage
    const summary = updatedPlayersWithTotalScore.map(p => 
      `${p.name}: ${p.roundScore >= 0 ? '+' : ''}${p.roundScore} 水 (总: ${p.score})`
    ).join(' | ');
    setGameMessage(`比牌结束！ ${summary}`);
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
        {gameMessage && <p className={`game-message ${humanPlayer.isMisArranged && humanPlayer.isArranged && !comparisonPhaseDone ? 'error' : ''}`}>{gameMessage}</p>}

        {humanPlayer && typeof humanPlayer.score === 'number' && ( // 总是显示总分
            <div className="player-score-display">
                你的总分: {humanPlayer.score > 0 ? '+' : ''}{humanPlayer.score}
                {humanPlayer.roundScore !== undefined && comparisonPhaseDone && 
                    ` (本局: ${humanPlayer.roundScore > 0 ? '+' : ''}${humanPlayer.roundScore})`}
            </div>
        )}

        <div className={`game-board ${humanPlayer.isMisArranged && humanPlayer.isArranged && !comparisonPhaseDone ? 'misarranged-board' : ''}`}>
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
            disabled={isLoadingDeal || humanPlayer.isArranged || humanPlayer.isThinking || comparisonPhaseDone}
          >
            {humanPlayer.isThinking && humanPlayer.id === HUMAN_PLAYER_ID ? 'AI理牌中...' : 'AI帮我理牌'}
          </button>
          <button 
            className="game-button" 
            onClick={handleConfirmHand} 
            disabled={isLoadingDeal || !humanPlayer.isArranged || (humanPlayer.isMisArranged && humanPlayer.isArranged) || allPlayersArranged || comparisonPhaseDone}
          >
            确定牌型
          </button>
        </div>

        {allPlayersArranged && !comparisonPhaseDone && (
            <button className="game-button compare-all-button" onClick={handleStartCompare}>
                开始比牌！
            </button>
        )}

        {comparisonPhaseDone && humanPlayer && humanPlayer.comparisonResults && (
          <div className="comparison-results-container">
            <h2>本局比牌详情</h2>
            <div className="player-result-detail">
              <h3>{humanPlayer.name} (本局: {humanPlayer.roundScore > 0 ? '+' : ''}{humanPlayer.roundScore})</h3>
              <ul>
                {Object.entries(humanPlayer.comparisonResults).map(([opponentId, result]) => {
                    const opponent = players.find(p=>p.id === opponentId);
                    return (
                        <li key={opponentId}>
                            <strong>对 {opponent ? opponent.name : opponentId}:</strong> 得分 {result.score > 0 ? '+' : ''}{result.score}
                            <ul>{result.details.map((d, i) => <li key={i} style={{fontSize:'0.9em', color:'#ccc'}}>{d}</li>)}</ul>
                        </li>
                    );
                })}
              </ul>
            </div>
            {/* 可以选择是否显示AI之间的比牌详情 */}
          </div>
        )}
      </div>
    </DragDropContext>
  );
}

export default App;
