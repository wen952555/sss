// frontend/src/App.js
import React, { useState, useEffect, useCallback } from 'react';
import { DragDropContext } from 'react-beautiful-dnd';
import HandArea from './components/HandArea';
import TopBanner from './components/TopBanner'; // 引入TopBanner
import { API_BASE_URL } from './config';
import { mapBackendCardsToFrontendCards } from './logic/card';
import { evaluateHand, compareEvaluatedHands, HAND_TYPE_NAMES } from './logic/handEvaluator'; // 引入 HAND_TYPE_NAMES
import { findBestThirteenWaterArrangement } from './logic/thirteenWaterAI';
import './App.css';

const DROPPABLE_IDS_PLAYER_PREFIX = "player_"; // 用于区分不同玩家的牌道
const DROPPABLE_AREAS = ['TOP', 'MIDDLE', 'BOTTOM'];

const HAND_FIXED_CAPACITIES = {
  TOP: 3,
  MIDDLE: 5,
  BOTTOM: 5,
};

const INITIAL_PLAYER_STATE = {
  id: '',
  name: '',
  isAI: false,
  cards: { // 玩家的牌，按牌道存放
    TOP: [],
    MIDDLE: [], // 真人玩家的初始13张牌会在这里
    BOTTOM: [],
  },
  initial13Cards: [], // 存储发牌时的13张原始牌，用于AI或重置
  isArranged: false, // 是否已按3-5-5摆好
  isThinking: false, // AI是否正在思考
  finalArrangement: null, // AI或玩家最终的牌道评估结果 {topEval, middleEval, bottomEval}
  score: 0, // 游戏得分 (比牌后计算)
  isMisArranged: false,
};

// 真人玩家ID固定
const HUMAN_PLAYER_ID = 'human_player';

function App() {
  // 玩家状态数组，第一个是真人，后三个是AI
  const [players, setPlayers] = useState([
    { ...INITIAL_PLAYER_STATE, id: HUMAN_PLAYER_ID, name: '你' },
    { ...INITIAL_PLAYER_STATE, id: 'ai_1', name: 'AI 孙悟空', isAI: true },
    { ...INITIAL_PLAYER_STATE, id: 'ai_2', name: 'AI 猪八戒', isAI: true },
    { ...INITIAL_PLAYER_STATE, id: 'ai_3', name: 'AI 沙悟净', isAI: true },
  ]);

  const humanPlayer = players.find(p => p.id === HUMAN_PLAYER_ID);
  const aiPlayers = players.filter(p => p.isAI);

  const [middleHandLabel, setMiddleHandLabel] = useState('手牌');
  const [isLoadingDeal, setIsLoadingDeal] = useState(false);
  const [gameMessage, setGameMessage] = useState('点击“重新发牌”开始游戏');
  const [allPlayersArranged, setAllPlayersArranged] = useState(false);


  // --- Helper: 获取当前真人玩家的牌道ID ---
  const getPlayerDroppableId = (area) => `${DROPPABLE_IDS_PLAYER_PREFIX}${HUMAN_PLAYER_ID}_${area}`;

  // --- 检查真人玩家是否摆好牌 ---
  const checkHumanPlayerFullyArranged = useCallback(() => {
    if (!humanPlayer) return false;
    const topLen = humanPlayer.cards.TOP.length;
    const midLen = humanPlayer.cards.MIDDLE.length;
    const botLen = humanPlayer.cards.BOTTOM.length;
    return topLen === HAND_FIXED_CAPACITIES.TOP &&
           midLen === HAND_FIXED_CAPACITIES.MIDDLE &&
           botLen === HAND_FIXED_CAPACITIES.BOTTOM;
  }, [humanPlayer]);

  // --- 评估单个玩家的牌道 ---
  const evaluatePlayerHands = useCallback((player) => {
    if (!player || !checkHumanPlayerFullyArranged() && player.id === HUMAN_PLAYER_ID) { // AI总是评估，真人摆好才评估
        return { topEval: null, middleEval: null, bottomEval: null, isMisArranged: false };
    }

    const topEval = evaluateHand(player.cards.TOP);
    const middleEval = evaluateHand(player.cards.MIDDLE);
    const bottomEval = evaluateHand(player.cards.BOTTOM);
    let isMisArranged = false;

    if (topEval && middleEval && bottomEval) {
      const topVsMiddle = compareEvaluatedHands(topEval, middleEval);
      const middleVsBottom = compareEvaluatedHands(middleEval, bottomEval);
      if (topVsMiddle > 0 || middleVsBottom > 0) {
        isMisArranged = true;
      }
    }
    return { topEval, middleEval, bottomEval, isMisArranged };
  }, [checkHumanPlayerFullyArranged, humanPlayer]);


  // --- 更新真人玩家UI状态 ---
  useEffect(() => {
    if (!humanPlayer) return;
    const isArranged = checkHumanPlayerFullyArranged();
    const evaluation = evaluatePlayerHands(humanPlayer);

    setPlayers(prevPlayers => prevPlayers.map(p => 
        p.id === HUMAN_PLAYER_ID ? { 
            ...p, 
            isArranged, 
            finalArrangement: isArranged ? {topEval: evaluation.topEval, middleEval: evaluation.middleEval, bottomEval: evaluation.bottomEval} : null,
            isMisArranged: evaluation.isMisArranged 
        } : p
    ));
    
    setMiddleHandLabel(isArranged ? '中道' : '手牌');
    if (isArranged && evaluation.isMisArranged) {
        setGameMessage("注意：牌型组合错误（倒水）！");
    } else if (isArranged) {
        setGameMessage("牌型正确！等待AI完成...");
    }

  }, [humanPlayer?.cards, checkHumanPlayerFullyArranged, evaluatePlayerHands]);


  // --- 检查是否所有玩家都已完成理牌 ---
  useEffect(() => {
    const allDone = players.every(p => p.isArranged);
    setAllPlayersArranged(allDone);
    if (allDone && players.length > 1) { // 至少有一个玩家，避免初始状态触发
      setGameMessage("所有玩家已完成！准备比牌！");
      // TODO: 触发比牌逻辑
      // handleCompareAllHands();
    }
  }, [players]);


  // --- 发牌逻辑 ---
  const handleDealNewHand = async () => {
    setIsLoadingDeal(true);
    setGameMessage('正在发牌...');
    try {
      // 假设后端deal_cards.php可以一次返回多手牌，或我们需要请求多次
      // 为简单起见，这里假设一个API可以处理发4手牌
      // 或者，前端生成4手牌 (如果后端不支持)
      const dealPromises = players.map(player => 
        fetch(`${API_BASE_URL}/api/deal_cards.php`).then(res => {
          if (!res.ok) throw new Error(`API error for ${player.name}! status: ${res.status}`);
          return res.json();
        })
      );
      const results = await Promise.all(dealPromises);

      const updatedPlayers = players.map((player, index) => {
        const dealResult = results[index];
        if (dealResult.success && dealResult.hand) {
          const dealtCards = mapBackendCardsToFrontendCards(dealResult.hand);
          return {
            ...player,
            cards: { // 初始牌都给MIDDLE区，真人玩家从这里拖，AI从这里自动理
              TOP: [],
              MIDDLE: dealtCards,
              BOTTOM: [],
            },
            initial13Cards: [...dealtCards], // 保存原始牌序
            isArranged: false,
            isThinking: player.isAI, // AI 开始思考
            finalArrangement: null,
            isMisArranged: false,
            score: 0
          };
        }
        // 处理发牌失败的情况
        console.error(`Failed to deal cards for ${player.name}`, dealResult.message);
        return player; // 保留旧状态或错误状态
      });
      setPlayers(updatedPlayers);
      setGameMessage('请理牌！');

      // AI自动理牌
      updatedPlayers.filter(p => p.isAI).forEach(aiPlayer => autoArrangeAIHand(aiPlayer.id));

    } catch (error) {
      console.error("Deal New Hand Error:", error);
      setGameMessage(`发牌请求错误: ${error.message}`);
    }
    setIsLoadingDeal(false);
  };

  useEffect(() => { // 初始加载时不自动发牌，等待用户点击
    // handleDealNewHand(); 
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- AI自动理牌 ---
  const autoArrangeAIHand = (aiPlayerId) => {
    setPlayers(prev => prev.map(p => p.id === aiPlayerId ? {...p, isThinking: true} : p));
    
    setTimeout(() => { // 模拟AI思考时间
      const aiPlayer = players.find(p => p.id === aiPlayerId);
      if (aiPlayer && aiPlayer.initial13Cards.length === 13) {
        const arrangement = findBestThirteenWaterArrangement(aiPlayer.initial13Cards);
        if (arrangement) {
          const evaluation = { // AI的牌总是被认为是正确摆放的
              topEval: arrangement.topEval,
              middleEval: arrangement.middleEval,
              bottomEval: arrangement.bottomEval,
          };
          setPlayers(prev => prev.map(p => 
            p.id === aiPlayerId ? {
              ...p,
              cards: {
                TOP: arrangement.top,
                MIDDLE: arrangement.middle,
                BOTTOM: arrangement.bottom,
              },
              isArranged: true,
              isThinking: false,
              finalArrangement: evaluation,
              isMisArranged: false, // AI总是不倒水
            } : p
          ));
        } else {
           console.error(`AI ${aiPlayerId} failed to arrange hand.`);
           setPlayers(prev => prev.map(p => p.id === aiPlayerId ? {...p, isThinking: false, isArranged: false } : p)); // 标记为未完成
        }
      }
    }, 500 + Math.random() * 1000); // 随机延迟
  };


  // --- 真人玩家拖拽逻辑 ---
  const onDragEnd = (result) => {
    // ... (onDragEnd 逻辑需要适配，source.droppableId 和 destination.droppableId
    // 现在会是 "player_human_player_TOP", "player_human_player_MIDDLE" 等)
    // 需要从 droppableId 中解析出是哪个区域
    // 并且只允许操作真人玩家的牌
    const { source, destination } = result;
    if (!destination || !humanPlayer) return;

    const sourceDroppableId = source.droppableId; // e.g., player_human_player_MIDDLE
    const destDroppableId = destination.droppableId;   // e.g., player_human_player_TOP

    // 从ID中提取区域 ("TOP", "MIDDLE", "BOTTOM")
    const parseAreaFromId = (idStr) => {
        const parts = idStr.split('_');
        return parts[parts.length -1];
    };

    const sourceArea = parseAreaFromId(sourceDroppableId);
    const destArea = parseAreaFromId(destDroppableId);

    const currentSourceCards = [...humanPlayer.cards[sourceArea]];
    const movedCard = currentSourceCards.splice(source.index, 1)[0];

    if (sourceDroppableId === destDroppableId) {
      currentSourceCards.splice(destination.index, 0, movedCard);
      setPlayers(prev => prev.map(p => 
        p.id === HUMAN_PLAYER_ID ? {...p, cards: {...p.cards, [sourceArea]: currentSourceCards }} : p
      ));
    } else {
      const currentDestCards = [...humanPlayer.cards[destArea]];
      
      let destCapacity = 13; // 默认中间牌道 ("手牌")
      if (destArea === 'TOP') destCapacity = HAND_FIXED_CAPACITIES.TOP;
      else if (destArea === 'BOTTOM') destCapacity = HAND_FIXED_CAPACITIES.BOTTOM;
      else if (destArea === 'MIDDLE') { // 中间牌道作为“中道”时的容量
        if (checkHumanPlayerFullyArranged() || 
            (humanPlayer.cards.TOP.length === HAND_FIXED_CAPACITIES.TOP && humanPlayer.cards.BOTTOM.length === HAND_FIXED_CAPACITIES.BOTTOM)
        ) {
          destCapacity = HAND_FIXED_CAPACITIES.MIDDLE;
        }
      }

      if (currentDestCards.length >= destCapacity) {
        setGameMessage("此道已满！");
        return;
      }

      currentDestCards.splice(destination.index, 0, movedCard);
      setPlayers(prev => prev.map(p => 
        p.id === HUMAN_PLAYER_ID ? {
          ...p, 
          cards: {
            ...p.cards, 
            [sourceArea]: currentSourceCards, 
            [destArea]: currentDestCards 
          }
        } : p
      ));
    }
  };

  // --- 真人玩家使用AI辅助理牌 ---
  const handleHumanPlayerAISort = () => {
    if (!humanPlayer) return;
    const allHumanCards = [
      ...humanPlayer.cards.TOP,
      ...humanPlayer.cards.MIDDLE,
      ...humanPlayer.cards.BOTTOM,
    ];
    if (allHumanCards.length !== 13) {
      setGameMessage("请确保所有13张牌都在牌道中才能使用AI辅助！");
      return;
    }
    
    // 清空真人玩家的牌道，等待AI结果
    setPlayers(prev => prev.map(p => p.id === HUMAN_PLAYER_ID ? {...p, cards: {TOP:[], MIDDLE:[], BOTTOM:[]}, isThinking: true} : p));
    setGameMessage('AI 正在帮你理牌...');

    setTimeout(() => {
        const arrangement = findBestThirteenWaterArrangement(allHumanCards);
        if (arrangement) {
            setPlayers(prev => prev.map(p => 
                p.id === HUMAN_PLAYER_ID ? {
                    ...p,
                    cards: {
                        TOP: arrangement.top,
                        MIDDLE: arrangement.middle,
                        BOTTOM: arrangement.bottom,
                    },
                    isThinking: false
                } : p
            ));
            setGameMessage('AI 理牌完成！');
        } else {
            setGameMessage('AI 未能帮你理牌。');
            setPlayers(prev => prev.map(p => p.id === HUMAN_PLAYER_ID ? {...p, cards: {...p.cards, MIDDLE: allHumanCards}, isThinking: false} : p)); // 放回手牌区
        }
    }, 50);
  };
  
  // --- 确定牌型 (真人玩家) ---
  const handleConfirmHand = () => {
      if (!humanPlayer || !humanPlayer.isArranged) {
          setGameMessage("请先将您的13张牌按3-5-5的组合摆好。");
          return;
      }
      if (humanPlayer.isMisArranged) {
          setGameMessage("您的牌型组合错误（倒水），请调整！");
          return;
      }
      // 标记真人玩家已完成，逻辑在useEffect中处理
      // 实际上，isArranged 已经是这个状态了
      setGameMessage("你的牌已确认！等待其他玩家...");
      // 如果所有AI也都完成了，则触发比牌 (这部分逻辑在 allPlayersArranged useEffect 中)
  };
  
  // 计算真人玩家中间牌道（手牌区）应显示的牌数量和期望数量
  const humanMiddleCards = humanPlayer ? humanPlayer.cards.MIDDLE : [];
  const humanMiddleCurrentCount = humanMiddleCards.length;
  const humanMiddleExpectedCount = humanPlayer && !humanPlayer.isArranged
    ? (13 - humanPlayer.cards.TOP.length - humanPlayer.cards.BOTTOM.length)
    : HAND_FIXED_CAPACITIES.MIDDLE;

  // 渲染
  if (!humanPlayer) return <div>加载中...</div>; // 防止 humanPlayer 未定义时渲染出错

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="app-container">
        <TopBanner aiPlayers={aiPlayers} handEvaluator={{ HAND_TYPE_NAMES }} /> {/* 传递HAND_TYPE_NAMES给AI显示 */}
        
        <h1 className="game-title">十三水</h1>
        {gameMessage && <p className={`game-message ${humanPlayer.isMisArranged && humanPlayer.isArranged ? 'error' : ''}`}>{gameMessage}</p>}

        <div className={`game-board ${humanPlayer.isMisArranged && humanPlayer.isArranged ? 'misarranged-board' : ''}`}>
          <HandArea
            droppableId={getPlayerDroppableId('TOP')}
            title={`头道 (${humanPlayer.cards.TOP.length}/${HAND_FIXED_CAPACITIES.TOP})`}
            cards={humanPlayer.cards.TOP}
            evaluatedHandType={humanPlayer.finalArrangement?.topEval}
            allowWrap={false} 
          />
          <HandArea
            droppableId={getPlayerDroppableId('MIDDLE')}
            title={`${middleHandLabel} (${humanMiddleCurrentCount}/${Math.max(0, humanMiddleExpectedCount)})`}
            cards={humanPlayer.cards.MIDDLE}
            evaluatedHandType={humanPlayer.isArranged ? humanPlayer.finalArrangement?.middleEval : null}
            allowWrap={!humanPlayer.isArranged}
          />
          <HandArea
            droppableId={getPlayerDroppableId('BOTTOM')}
            title={`尾道 (${humanPlayer.cards.BOTTOM.length}/${HAND_FIXED_CAPACITIES.BOTTOM})`}
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
            {humanPlayer.isThinking ? 'AI思考中...' : 'AI帮我理牌'}
          </button>
          <button 
            className="game-button" 
            onClick={handleConfirmHand} 
            disabled={isLoadingDeal || !humanPlayer.isArranged || (humanPlayer.isMisArranged && humanPlayer.isArranged) || allPlayersArranged}
          >
            确定牌型
          </button>
        </div>
        {allPlayersArranged && <div className="game-message">所有玩家准备就绪！ {/* TODO: 显示比牌结果 */}</div>}
      </div>
    </DragDropContext>
  );
}

export default App;
