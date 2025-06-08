// frontend/src/pages/GamePage.js
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom'; // 引入Link，如果用户未登录时使用
import { gameService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/Card';
import { sortHandCards } from '../utils/cardUtils';
import './GamePage.css';

const GamePage = () => {
  const { user } = useAuth();

  const [gameState, setGameState] = useState(null);
  const [myPlayerId, setMyPlayerId] = useState(null);

  const [hand, setHand] = useState([]);
  const [frontDuan, setFrontDuan] = useState([]);
  const [middleDuan, setMiddleDuan] = useState([]);
  const [backDuan, setBackDuan] = useState([]);

  const [selectedCard, setSelectedCard] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [gameId, setGameId] = useState(null);

  const updateLocalCardState = useCallback((newHand, newFront, newMiddle, newBack) => {
      setHand(sortHandCards(newHand));
      setFrontDuan(newFront);
      setMiddleDuan(newMiddle);
      setBackDuan(newBack);
  }, []); // setX 函数是稳定的，通常不需要作为依赖

  const updateUIFromGameState = useCallback((state) => {
      if (state && state.game_state) {
          const gs = state.game_state;
          setGameState(gs); // 更新整个游戏状态对象
          setGameId(gs.game_id);
          setMyPlayerId(gs.current_user_id);

          const currentPlayer = gs.players?.find(p => p.id === gs.current_user_id);
          if (currentPlayer) {
              if (currentPlayer.arranged_hand) {
                  // 计算仍在手牌区的牌
                  const handCards = (currentPlayer.hand || []).filter(c =>
                      !(currentPlayer.arranged_hand.front || []).includes(c) &&
                      !(currentPlayer.arranged_hand.middle || []).includes(c) &&
                      !(currentPlayer.arranged_hand.back || []).includes(c)
                  );
                  updateLocalCardState(
                      handCards,
                      currentPlayer.arranged_hand.front || [],
                      currentPlayer.arranged_hand.middle || [],
                      currentPlayer.arranged_hand.back || []
                  );
              } else if (currentPlayer.hand && currentPlayer.hand.length > 0) {
                  updateLocalCardState(currentPlayer.hand, [], [], []);
              } else {
                  // 如果玩家没有手牌也没有摆好的牌 (例如刚加入游戏，或游戏重置)
                  updateLocalCardState([], [], [], []);
              }
          } else {
             // 当前玩家不在游戏状态的玩家列表中 (可能刚创建游戏，或状态同步问题)
             updateLocalCardState([], [], [], []);
             // console.warn("Current user not found in game state players list.");
          }
          setMessage(state.message || ''); // API 可能返回操作消息
      } else {
          // console.warn("Invalid state or game_state received in updateUIFromGameState:", state);
      }
  }, [updateLocalCardState]); // 依赖 updateLocalCardState (它本身也是useCallback包裹的)

  // 初始化游戏或获取游戏状态
  useEffect(() => {
    const initGame = async () => {
      setIsLoading(true);
      setError('');
      setMessage('');
      try {
        // 总是尝试获取当前游戏状态
        const currentState = await gameService.getGameState(); // 假设 gameId 为 null 时后端能处理

        if (currentState.status === 'success' &&
            currentState.game_state &&
            currentState.game_state.game_id && // 确保有 game_id
            currentState.game_state.players?.find(p => p.id === currentState.game_state.current_user_id) &&
            (currentState.game_state.status === 'arranging' || currentState.game_state.status === 'waiting' || currentState.game_state.status === 'dealing')
        ) {
           updateUIFromGameState(currentState);
        } else {
          // 如果没有有效的进行中游戏，则创建新游戏
          const createResponse = await gameService.createGame();
          if (createResponse.status === 'success' && createResponse.game_id) {
            // 创建成功后，后端可能已将玩家加入并返回状态，或者需要手动发牌
            // 为了简单，我们假设createGame后需要dealCards
            const dealResponse = await gameService.dealCards(createResponse.game_id);
            updateUIFromGameState(dealResponse);
          } else {
            setError(createResponse.message || '创建新游戏失败');
          }
        }
      } catch (err) {
        setError(err.message || '初始化游戏时发生错误');
      } finally {
        setIsLoading(false);
      }
    };

    if (user) { // 确保用户已登录才初始化游戏
      initGame();
    }
  }, [user, updateUIFromGameState]); // 依赖 user 和 updateUIFromGameState

  const handleCardClick = (card, sourceDuanName) => {
    setError('');
    if (gameState?.status !== 'arranging') {
      setError('当前不是理牌阶段。');
      return;
    }
    // 如果玩家已经提交了牌型，则不允许再操作
    const currentPlayerState = gameState?.players?.find(p => p.id === myPlayerId);
    if (currentPlayerState?.is_ready) {
        setError('您已提交牌型，无法更改。');
        return;
    }


    if (selectedCard) {
      if (sourceDuanName === 'hand') {
        // 如果选中的牌来自某个墩，现在点击手牌区，意味着将牌移回手牌区
        if (selectedCard.from !== 'hand') {
            let tempHand = [...hand, selectedCard.card];
            let tempFront = [...frontDuan];
            let tempMiddle = [...middleDuan];
            let tempBack = [...backDuan];

            if (selectedCard.from === 'front') tempFront = tempFront.filter(c => c !== selectedCard.card);
            else if (selectedCard.from === 'middle') tempMiddle = tempMiddle.filter(c => c !== selectedCard.card);
            else if (selectedCard.from === 'back') tempBack = tempBack.filter(c => c !== selectedCard.card);
            
            updateLocalCardState(tempHand, tempFront, tempMiddle, tempBack);
        }
        setSelectedCard(null);
        return;
      }

      // 移动牌
      let tempHand = [...hand];
      let tempFront = [...frontDuan];
      let tempMiddle = [...middleDuan];
      let tempBack = [...backDuan];

      if (selectedCard.from === 'hand') tempHand = tempHand.filter(c => c !== selectedCard.card);
      else if (selectedCard.from === 'front') tempFront = tempFront.filter(c => c !== selectedCard.card);
      else if (selectedCard.from === 'middle') tempMiddle = tempMiddle.filter(c => c !== selectedCard.card);
      else if (selectedCard.from === 'back') tempBack = tempBack.filter(c => c !== selectedCard.card);

      let cardPlaced = false;
      if (sourceDuanName === 'front' && tempFront.length < 3) { tempFront.push(selectedCard.card); cardPlaced = true; }
      else if (sourceDuanName === 'middle' && tempMiddle.length < 5) { tempMiddle.push(selectedCard.card); cardPlaced = true; }
      else if (sourceDuanName === 'back' && tempBack.length < 5) { tempBack.push(selectedCard.card); cardPlaced = true; }
      
      if (!cardPlaced) { // 目标墩已满或无效，牌放回手牌
        tempHand.push(selectedCard.card); // 确保牌不会丢失
        setError(`目标墩 '${sourceDuanName}' 已满。`);
      }
      updateLocalCardState(tempHand, tempFront, tempMiddle, tempBack);
      setSelectedCard(null);

    } else { // 没有牌被选中，则当前点击的是要选中的牌
      // 检查点击的牌是否真的在那个墩里 (避免点击占位符)
      if (sourceDuanName === 'hand' && !hand.includes(card)) return;
      if (sourceDuanName === 'front' && !frontDuan.includes(card)) return;
      if (sourceDuanName === 'middle' && !middleDuan.includes(card)) return;
      if (sourceDuanName === 'back' && !backDuan.includes(card)) return;
      
      setSelectedCard({ card: card, from: sourceDuanName });
    }
  };

  const handleDuanClick = (duanName) => {
    if (selectedCard) {
      handleCardClick(selectedCard.card, duanName);
    }
  };

  const handleAutoArrange = async () => {
    if (gameState?.status !== 'arranging') { /* ... */ return; }
    const currentPlayerState = gameState?.players?.find(p => p.id === myPlayerId);
    if (currentPlayerState?.is_ready) { setError('您已提交牌型，AI无法覆盖。'); return;}

    setIsLoading(true);
    setError('');
    setMessage('');
    try {
      const response = await gameService.requestAIArrangement(gameId);
      if (response.status === 'success' && response.arranged_hand) {
        const { front, middle, back } = response.arranged_hand;
        updateLocalCardState([], front, middle, back); // AI摆好后，手牌区应为空
        setMessage(response.message || 'AI理牌完成。请检查并提交。');
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
    if (gameState?.status !== 'arranging') { /* ... */ return; }
    const currentPlayerState = gameState?.players?.find(p => p.id === myPlayerId);
    if (currentPlayerState?.is_ready) { setError('您已提交牌型。'); return;}

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
        updateUIFromGameState(response);
        setMessage(response.message || '牌型提交成功！');
        setSelectedCard(null);
      } else {
        setError(response.message || '提交失败。');
      }
    } catch (err) {
      setError(err.message || '提交牌型时发生错误。');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDealNewCards = async () => {
    setIsLoading(true);
    setError('');
    setMessage('');
    setSelectedCard(null); // 清空选择
    try {
        const response = await gameService.dealCards(gameId);
        updateUIFromGameState(response);
        setMessage(response.message || "已重新发牌。");
    } catch (err) {
        setError(err.message || "重新发牌失败。");
    } finally {
        setIsLoading(false);
    }
  };

  const renderDuan = (duanName, cardsInDuan, limit) => {
    const displayCards = [...cardsInDuan];
    while (displayCards.length < limit) {
        displayCards.push(null);
    }
    return (
      <div className={`duan ${duanName}-duan`} onClick={() => handleDuanClick(duanName)}>
        <h3>{duanName.charAt(0).toUpperCase() + duanName.slice(1)} ({cardsInDuan.length}/{limit})</h3>
        <div className="cards-container">
          {displayCards.map((card, index) => (
            card ? (
              <Card
                key={`${duanName}-${card}-${index}`} // 更稳定的key
                card={card}
                onClick={(clickedCard) => handleCardClick(clickedCard, duanName)}
                isSelected={selectedCard && selectedCard.card === card && selectedCard.from === duanName}
              />
            ) : (
              <div key={`placeholder-${duanName}-${index}`} className="card-placeholder"></div>
            )
          ))}
        </div>
      </div>
    );
  };
  
  const myCurrentPlayerState = gameState?.players?.find(p => p.id === myPlayerId);

  if (isLoading && !gameState) {
    return <div className="loading-fullscreen">正在初始化游戏...</div>;
  }

  if (!user) {
    return <p>请先 <Link to="/login">登录</Link> 来开始游戏。</p>;
  }

  const renderOtherPlayers = () => {
    if (!gameState || !gameState.players) return null;
    return gameState.players
      .filter(p => p.id !== myPlayerId)
      .map(player => (
        <div key={player.id} className="other-player-info">
          <p>玩家ID: {player.id} {player.is_ready ? <span style={{color: 'green'}}>(已准备)</span> : <span style={{color: 'orange'}}>(未准备)</span>}</p>
          {(gameState.status === 'comparing' || gameState.status === 'finished') && player.arranged_hand && (
            <div className="other-player-arranged-hand">
              <small>头: {(player.arranged_hand.front || []).join(', ')}</small><br/>
              <small>中: {(player.arranged_hand.middle || []).join(', ')}</small><br/>
              <small>尾: {(player.arranged_hand.back || []).join(', ')}</small>
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
        {myCurrentPlayerState?.is_ready && <p style={{color: 'green', fontWeight: 'bold'}}>您已提交牌型！等待其他玩家...</p>}
      </div>

      <div className="other-players-area">
        <h4>其他玩家:</h4>
        {renderOtherPlayers()}
      </div>


      <div className="player-area">
        <h4>你的手牌 (未摆放: {hand.length}张)</h4>
        <div className="hand-area cards-container" onClick={() => handleDuanClick('hand')}>
          {hand.map(card => (
            <Card
              key={`hand-${card}`}
              card={card}
              onClick={(clickedCard) => handleCardClick(clickedCard, 'hand')}
              isSelected={selectedCard && selectedCard.card === card && selectedCard.from === 'hand'}
            />
          ))}
          {hand.length === 0 && <p>所有牌已摆放。</p>}
        </div>

        {selectedCard && <p className="selected-card-info">当前选中: {selectedCard.card} (来自: {selectedCard.from}) - 请点击目标墩或手牌区</p>}

        <div className="arranged-duans">
          {renderDuan('front', frontDuan, 3)}
          {renderDuan('middle', middleDuan, 5)}
          {renderDuan('back', backDuan, 5)}
        </div>
      </div>

      <div className="actions-area">
        <button 
            onClick={handleAutoArrange} 
            disabled={isLoading || gameState?.status !== 'arranging' || !!myCurrentPlayerState?.is_ready || hand.length === 0}
            title={hand.length === 0 && gameState?.status === 'arranging' ? "请先通过“重新发牌”获取手牌" : ""}
        >
          {isLoading ? '处理中...' : 'AI自动理牌'}
        </button>
        <button 
            onClick={handleSubmitArrangement} 
            disabled={isLoading || gameState?.status !== 'arranging' || !!myCurrentPlayerState?.is_ready}
        >
          {isLoading ? '提交中...' : '提交手动牌型'}
        </button>
        <button onClick={handleDealNewCards} disabled={isLoading}>
          {isLoading ? '发牌中...' : '重新发牌/开始新局'}
        </button>
      </div>
      <div className="game-log-area">
            <h4>游戏日志 (最近10条):</h4>
            <ul className="game-log-list">
                {gameState?.game_log?.map((log, index) => <li key={index}>{log}</li>).reverse()}
            </ul>
        </div>
    </div>
  );
};

export default GamePage;
