// frontend/src/pages/GamePage.js
import React, { useState, useEffect, useCallback } from 'react';
import { gameService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/Card';
import { sortHandCards } from '../utils/cardUtils'; // 引入排序工具
import './GamePage.css'; // 创建对应的CSS文件

const GamePage = () => {
  const { user } = useAuth(); // 获取当前用户信息

  const [gameState, setGameState] = useState(null); // 后端返回的完整游戏状态
  const [myPlayerId, setMyPlayerId] = useState(null); // 当前登录用户的玩家ID

  const [hand, setHand] = useState([]); // 玩家未整理的13张手牌
  const [frontDuan, setFrontDuan] = useState([]); // 头墩 (3张)
  const [middleDuan, setMiddleDuan] = useState([]); // 中墩 (5张)
  const [backDuan, setBackDuan] = useState([]);   // 尾墩 (5张)

  const [selectedCard, setSelectedCard] = useState(null); // 当前选中的牌（用于手动理牌）
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [gameId, setGameId] = useState(null); // 当前游戏的ID

  // 更新本地牌墩和手牌状态
  const updateLocalCardState = (newHand, newFront, newMiddle, newBack) => {
    setHand(sortHandCards(newHand)); // 未摆放的手牌总是排序
    setFrontDuan(newFront);
    setMiddleDuan(newMiddle);
    setBackDuan(newBack);
  };

  // 从后端游戏状态更新前端显示
  const updateUIFromGameState = useCallback((state) => {
    if (state && state.game_state) {
      const gs = state.game_state;
      setGameState(gs);
      setGameId(gs.game_id);
      setMyPlayerId(gs.current_user_id);

      const currentPlayer = gs.players?.find(p => p.id === gs.current_user_id);
      if (currentPlayer) {
        if (currentPlayer.arranged_hand) { // 如果后端有已摆好的牌
          updateLocalCardState(
            currentPlayer.hand.filter(c => // 找出还在手里的牌
              !currentPlayer.arranged_hand.front.includes(c) &&
              !currentPlayer.arranged_hand.middle.includes(c) &&
              !currentPlayer.arranged_hand.back.includes(c)
            ),
            currentPlayer.arranged_hand.front,
            currentPlayer.arranged_hand.middle,
            currentPlayer.arranged_hand.back
          );
        } else if (currentPlayer.hand && currentPlayer.hand.length > 0) { // 只有原始手牌
          // 初始发牌，所有牌都在手牌区
          updateLocalCardState(currentPlayer.hand, [], [], []);
        }
      }
      setMessage(state.message || '');
    }
  }, []);


  // 初始化游戏或获取游戏状态
  useEffect(() => {
    const initGame = async () => {
      setIsLoading(true);
      setError('');
      try {
        // 尝试获取现有游戏状态，如果玩家已在游戏中
        const currentState = await gameService.getGameState();
        if (currentState.status === 'success' && currentState.game_state && currentState.game_state.status !== 'finished') {
           updateUIFromGameState(currentState);
        } else {
          // 如果没有活动游戏或游戏已结束，创建一个新游戏
          const createResponse = await gameService.createGame();
          if (createResponse.status === 'success') {
            setGameId(createResponse.game_id); // 保存gameId
            // 创建游戏后通常会自动加入并返回状态，可以直接用
            // 如果不是，则需要调用 joinGame，然后 dealCards
            // 简化：创建后就发牌
            const dealResponse = await gameService.dealCards(createResponse.game_id);
            updateUIFromGameState(dealResponse);
          } else {
            setError(createResponse.message || '创建游戏失败');
          }
        }
      } catch (err) {
        setError(err.message || '初始化游戏失败');
      } finally {
        setIsLoading(false);
      }
    };
    if (user) { // 确保用户已登录
      initGame();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, updateUIFromGameState]); // 当user变化时（登录后）执行


  // 手动理牌：处理卡牌点击
  const handleCardClick = (card, sourceDuanName) => {
    setError('');
    if (gameState?.status !== 'arranging') {
      setError('当前不是理牌阶段。');
      return;
    }

    if (selectedCard) { // 如果已有一张牌被选中，则当前点击的是目标墩
      if (sourceDuanName === 'hand') { // 不能把牌放到手牌区
        setSelectedCard(null); // 取消选择
        return;
      }
      // 移动牌
      let tempHand = [...hand];
      let tempFront = [...frontDuan];
      let tempMiddle = [...middleDuan];
      let tempBack = [...backDuan];

      // 1. 从原位置移除selectedCard
      if (selectedCard.from === 'hand') tempHand = tempHand.filter(c => c !== selectedCard.card);
      else if (selectedCard.from === 'front') tempFront = tempFront.filter(c => c !== selectedCard.card);
      else if (selectedCard.from === 'middle') tempMiddle = tempMiddle.filter(c => c !== selectedCard.card);
      else if (selectedCard.from === 'back') tempBack = tempBack.filter(c => c !== selectedCard.card);

      // 2. 添加到目标墩 (sourceDuanName 是目标墩的名称)
      if (sourceDuanName === 'front' && tempFront.length < 3) tempFront.push(selectedCard.card);
      else if (sourceDuanName === 'middle' && tempMiddle.length < 5) tempMiddle.push(selectedCard.card);
      else if (sourceDuanName === 'back' && tempBack.length < 5) tempBack.push(selectedCard.card);
      else { // 目标墩已满或无效，牌放回手牌
        tempHand.push(selectedCard.card);
        setError(`目标墩 '${sourceDuanName}' 已满或无效操作。`);
      }
      updateLocalCardState(tempHand, tempFront, tempMiddle, tempBack);
      setSelectedCard(null); // 清空选择

    } else { // 没有牌被选中，则当前点击的是要选中的牌
      if (sourceDuanName === 'front' && !frontDuan.includes(card)) return; // 点击了空的墩位
      if (sourceDuanName === 'middle' && !middleDuan.includes(card)) return;
      if (sourceDuanName === 'back' && !backDuan.includes(card)) return;

      setSelectedCard({ card: card, from: sourceDuanName });
    }
  };

  // 点击墩区域（如果该墩没有牌，且有选中的牌，则将牌放入）
  const handleDuanClick = (duanName) => {
    if (selectedCard) {
        handleCardClick(selectedCard.card, duanName); // 调用handleCardClick，第二个参数是目标墩
    }
  };

  const handleAutoArrange = async () => {
    if (gameState?.status !== 'arranging') {
      setError('当前不是理牌阶段。');
      return;
    }
    setIsLoading(true);
    setError('');
    setMessage('');
    try {
      // AI理牌API现在不需要传cards参数，后端会从session获取当前用户手牌
      const response = await gameService.requestAIArrangement(gameId);
      if (response.status === 'success' && response.arranged_hand) {
        const { front, middle, back } = response.arranged_hand;
        // AI返回的是完整的三墩，手牌区应为空
        updateLocalCardState([], front, middle, back);
        setMessage(response.message || 'AI理牌完成。');
      } else {
        setError(response.message || 'AI理牌失败。');
      }
    } catch (err) {
      setError(err.message || '请求AI理牌时发生错误。');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitArrangement = async () => {
    if (gameState?.status !== 'arranging') {
        setError('当前不是理牌阶段。');
        return;
    }
    if (frontDuan.length !== 3 || middleDuan.length !== 5 || backDuan.length !== 5) {
      setError('牌墩未摆满 (3-5-5)，无法提交。');
      return;
    }
    setIsLoading(true);
    setError('');
    setMessage('');
    try {
      const arrangement = { front: frontDuan, middle: middleDuan, back: backDuan };
      const response = await gameService.submitArrangement(arrangement, gameId);
      if (response.status === 'success') {
        updateUIFromGameState(response); // 后端会返回更新后的游戏状态
        setMessage(response.message || '牌型提交成功！');
        setSelectedCard(null); // 提交后清空选择
      } else {
        setError(response.message || '提交失败。');
      }
    } catch (err) {
      setError(err.message || '提交牌型时发生错误。');
    } finally {
      setIsLoading(false);
    }
  };

  const renderDuan = (duanName, cardsInDuan, limit) => {
    const displayCards = [...cardsInDuan];
    // 用占位符填满空位，方便点击
    while (displayCards.length < limit) {
        displayCards.push(null); // null代表占位符
    }

    return (
      <div className={`duan ${duanName}-duan`} onClick={() => handleDuanClick(duanName)}>
        <h3>{duanName.charAt(0).toUpperCase() + duanName.slice(1)} ({cardsInDuan.length}/{limit})</h3>
        <div className="cards-container">
          {displayCards.map((card, index) => (
            card ? (
              <Card
                key={card} // 用card string作为key
                card={card}
                onClick={(clickedCard) => handleCardClick(clickedCard, duanName)}
                isSelected={selectedCard && selectedCard.card === card && selectedCard.from === duanName}
              />
            ) : (
              <div key={`placeholder-${duanName}-${index}`} className="card-placeholder">空位</div>
            )
          ))}
        </div>
      </div>
    );
  };

  if (isLoading && !gameState) { // 初始加载
    return <div className="loading-fullscreen">正在初始化游戏...</div>;
  }

  if (!user) {
      return <p>请先 <Link to="/login">登录</Link> 来开始游戏。</p>;
  }
  // 显示其他玩家信息 (简化版)
  const renderOtherPlayers = () => {
    if (!gameState || !gameState.players) return null;
    return gameState.players
      .filter(p => p.id !== myPlayerId) // 排除当前用户
      .map(player => (
        <div key={player.id} className="other-player-info">
          <p>玩家: {player.id} {player.is_ready ? "(已准备)" : "(未准备)"}</p>
          {/* 在比牌阶段可以显示他们的牌 */}
          {(gameState.status === 'comparing' || gameState.status === 'finished') && player.arranged_hand && (
            <div className="other-player-arranged-hand">
              <small>头: {player.arranged_hand.front.join(', ')}</small><br/>
              <small>中: {player.arranged_hand.middle.join(', ')}</small><br/>
              <small>尾: {player.arranged_hand.back.join(', ')}</small>
            </div>
          )}
        </div>
      ));
  };


  return (
    <div className="game-page">
      <h2>十三水游戏桌</h2>
      {message && <p className="message success-message">{message}</p>}
      {error && <p className="message error-message">{error}</p>}

      <div className="game-info">
        <p>游戏ID: {gameId || 'N/A'}</p>
        <p>状态: {gameState?.status || '未知'}</p>
        {myPlayerId && gameState?.players?.find(p=>p.id === myPlayerId)?.is_ready && <p style={{color: 'green'}}>您已提交牌型！</p>}
      </div>

      <div className="other-players-area">
        {renderOtherPlayers()}
      </div>

      <div className="player-area">
        <h4>你的手牌 (点击选择牌，再点击目标墩放置)</h4>
        <div className="hand-area cards-container">
          {hand.map(card => (
            <Card
              key={card}
              card={card}
              onClick={(clickedCard) => handleCardClick(clickedCard, 'hand')}
              isSelected={selectedCard && selectedCard.card === card && selectedCard.from === 'hand'}
            />
          ))}
          {hand.length === 0 && <p>所有牌已摆放。</p>}
        </div>

        {selectedCard && <p className="selected-card-info">当前选中: {selectedCard.card} (来自: {selectedCard.from})</p>}

        <div className="arranged-duans">
          {renderDuan('front', frontDuan, 3)}
          {renderDuan('middle', middleDuan, 5)}
          {renderDuan('back', backDuan, 5)}
        </div>
      </div>

      <div className="actions-area">
        <button onClick={handleAutoArrange} disabled={isLoading || gameState?.status !== 'arranging' || gameState?.players?.find(p=>p.id === myPlayerId)?.is_ready}>
          {isLoading ? '处理中...' : 'AI自动理牌'}
        </button>
        <button onClick={handleSubmitArrangement} disabled={isLoading || gameState?.status !== 'arranging' || gameState?.players?.find(p=>p.id === myPlayerId)?.is_ready}>
          {isLoading ? '提交中...' : '提交手动牌型'}
        </button>
        {/* 重新发牌按钮 (调试用) */}
        <button onClick={() => gameService.dealCards(gameId).then(updateUIFromGameState).catch(err => setError(err.message))} disabled={isLoading}>
          重新发牌
        </button>
      </div>
       {/* 游戏日志 */}
       <div className="game-log-area">
            <h4>游戏日志:</h4>
            <ul className="game-log-list">
                {gameState?.game_log?.map((log, index) => <li key={index}>{log}</li>).reverse()}
            </ul>
        </div>
    </div>
  );
};

export default GamePage;
