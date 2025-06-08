// frontend/src/pages/GamePage.js
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom'; // In case user is not logged in
import { gameService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/Card';
import { sortHandCards } from '../utils/cardUtils';
import './GamePage.css';

const GamePage = () => {
  const { user } = useAuth();

  const [gameState, setGameState] = useState(null);
  const [myPlayerId, setMyPlayerId] = useState(null);

  // Local state for card arrangement
  const [hand, setHand] = useState([]); // Unarranged cards
  const [frontDuan, setFrontDuan] = useState([]);
  const [middleDuan, setMiddleDuan] = useState([]);
  const [backDuan, setBackDuan] = useState([]);

  const [selectedCard, setSelectedCard] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [gameId, setGameId] = useState(null);

  // Memoized function to update local card piles
  const updateLocalCardState = useCallback((newHand, newFront, newMiddle, newBack) => {
      console.log("GamePage DEBUG: updateLocalCardState called with:",
          { newHand: JSON.parse(JSON.stringify(newHand || [])) , newFront: JSON.parse(JSON.stringify(newFront || [])) , newMiddle: JSON.parse(JSON.stringify(newMiddle || [])) , newBack: JSON.parse(JSON.stringify(newBack || [])) }
      );
      setHand(sortHandCards(Array.isArray(newHand) ? newHand : []));
      setFrontDuan(Array.isArray(newFront) ? newFront : []);
      setMiddleDuan(Array.isArray(newMiddle) ? newMiddle : []);
      setBackDuan(Array.isArray(newBack) ? newBack : []);
  }, []); // setX functions are stable

  // Memoized function to update UI based on game state from backend
  const updateUIFromGameState = useCallback((apiResponse) => {
      console.log("GamePage DEBUG: updateUIFromGameState called with apiResponse:", JSON.parse(JSON.stringify(apiResponse)));
      
      if (apiResponse && apiResponse.status === 'success' && apiResponse.game_state) {
          const gs = apiResponse.game_state;
          setGameState(gs); // Store the whole game state
          setGameId(gs.game_id || null);
          setMyPlayerId(gs.current_user_id || null);

          console.log("GamePage DEBUG: Parsed Game State - ID:", gs.game_id, "MyPlayerID:", gs.current_user_id, "Status:", gs.status);
          console.log("GamePage DEBUG: Parsed Game State - Players:", JSON.parse(JSON.stringify(gs.players)));


          const currentPlayer = Array.isArray(gs.players) ? gs.players.find(p => p.id === gs.current_user_id) : null;
          console.log("GamePage DEBUG: Found currentPlayer data:", JSON.parse(JSON.stringify(currentPlayer)));

          if (currentPlayer) {
              const currentHandRaw = currentPlayer.hand || [];
              const arranged = currentPlayer.arranged_hand; // This can be null or an object

              if (arranged && (Array.isArray(arranged.front) || Array.isArray(arranged.middle) || Array.isArray(arranged.back))) {
                  console.log("GamePage DEBUG: Player has an arranged_hand:", JSON.parse(JSON.stringify(arranged)));
                  const arrangedFront = arranged.front || [];
                  const arrangedMiddle = arranged.middle || [];
                  const arrangedBack = arranged.back || [];
                  
                  // Calculate unarranged cards by filtering out those in duans
                  const cardsInDuans = [...arrangedFront, ...arrangedMiddle, ...arrangedBack];
                  const unarrangedHand = currentHandRaw.filter(card => !cardsInDuans.includes(card));
                  
                  console.log("GamePage DEBUG: Calculated unarrangedHand from arranged_hand:", JSON.parse(JSON.stringify(unarrangedHand)));
                  updateLocalCardState(unarrangedHand, arrangedFront, arrangedMiddle, arrangedBack);
              } else if (Array.isArray(currentHandRaw) && currentHandRaw.length > 0) {
                  console.log("GamePage DEBUG: Player has a hand, but no (or empty) arranged_hand. Setting all to hand area.", JSON.parse(JSON.stringify(currentHandRaw)));
                  updateLocalCardState(currentHandRaw, [], [], []);
              } else {
                  console.log("GamePage DEBUG: Player has no hand and no arranged_hand. Clearing all piles.");
                  updateLocalCardState([], [], [], []);
              }
          } else {
             console.warn("GamePage DEBUG: Current user (ID:", gs.current_user_id, ") not found in game state's players list or players list is malformed. Clearing local card state.");
             updateLocalCardState([], [], [], []);
          }
          setMessage(apiResponse.message || (gs.game_log && gs.game_log.length > 0 ? gs.game_log[gs.game_log.length -1] : '游戏状态已更新。'));
          setError(''); // Clear previous errors on successful state update
      } else {
          console.error("GamePage DEBUG: Failed to update UI from game state. API response was not successful or game_state missing:", JSON.parse(JSON.stringify(apiResponse)));
          setError(apiResponse?.message || "无法从服务器获取有效的游戏状态。");
          // Don't clear piles here, might be a temporary fetch issue
      }
  }, [updateLocalCardState]);


  // Effect for initializing or fetching game state
  useEffect(() => {
    const initGame = async () => {
      setIsLoading(true);
      setError('');
      setMessage('正在加载游戏...');
      console.log("GamePage useEffect [user, updateUIFromGameState]: initGame triggered. User:", user ? user.id : 'null');
      try {
        const currentStateResponse = await gameService.getGameState(); // Assumes gameId might be null or handled by backend
        console.log("GamePage initGame - getGameState response:", JSON.parse(JSON.stringify(currentStateResponse)));

        if (currentStateResponse.status === 'success' &&
            currentStateResponse.game_state &&
            currentStateResponse.game_state.game_id && // Must have a game_id
            (currentStateResponse.game_state.status === 'arranging' || // Valid ongoing statuses
             currentStateResponse.game_state.status === 'waiting' ||
             currentStateResponse.game_state.status === 'dealing' ||
             currentStateResponse.game_state.status === 'comparing' || // Allow rejoining a comparing game
             currentStateResponse.game_state.status === 'finished' // Allow viewing a finished game
            ) &&
            Array.isArray(currentStateResponse.game_state.players) &&
            currentStateResponse.game_state.players.some(p => p.id === user.id) // Current user must be in the game
        ) {
           console.log("GamePage initGame - Restoring existing game state from getGameState.");
           updateUIFromGameState(currentStateResponse);
        } else {
          console.log("GamePage initGame - No valid/ongoing game found via getGameState, or user not in it. Attempting to create a new game.");
          const createResponse = await gameService.createGame();
          console.log("GamePage initGame - createGame response:", JSON.parse(JSON.stringify(createResponse)));
          if (createResponse.status === 'success' && createResponse.game_id) {
            console.log("GamePage initGame - Game created. Now dealing cards for game_id:", createResponse.game_id);
            // After creating, we usually need to deal cards to get the hand
            const dealResponse = await gameService.dealCards(createResponse.game_id);
            console.log("GamePage initGame - dealCards response:", JSON.parse(JSON.stringify(dealResponse)));
            updateUIFromGameState(dealResponse); // This response should contain the initial hand
          } else {
            console.error("GamePage initGame - createGame API call failed:", createResponse);
            setError(createResponse.message || '创建新游戏失败 (API)。');
          }
        }
      } catch (err) {
        console.error("GamePage initGame - Error during game initialization sequence:", err);
        setError(err.message || '初始化游戏时发生网络或服务器错误。');
      } finally {
        setIsLoading(false);
      }
    };

    if (user && user.id) { // Only run if user is logged in
      initGame();
    } else {
      console.log("GamePage useEffect [user, updateUIFromGameState]: User not logged in. Clearing game state.");
      setGameState(null); // Clear game state if user logs out or is not present
      updateLocalCardState([],[],[],[]); // Clear local piles
    }
  }, [user, updateUIFromGameState]); // Dependencies


  // --- handleCardClick, handleDuanClick, handleAutoArrange, handleSubmitArrangement ---
  // (These functions should be the robust versions from previous replies,
  //  ensuring they check gameState.status and player readiness before acting)
  const handleCardClick = (card, sourceDuanName) => { /* ... (robust version) ... */ 
    setError('');
    if (gameState?.status !== 'arranging') { setError('当前不是理牌阶段。'); return; }
    const currentPlayerState = gameState?.players?.find(p => p.id === myPlayerId);
    if (currentPlayerState?.is_ready) { setError('您已提交牌型，无法更改。'); return; }
    // ... (rest of the logic for moving cards, using setSelectedCard, updateLocalCardState)
    if (selectedCard) { /* ... move logic ... */ setSelectedCard(null); } 
    else { /* ... select logic ... */ setSelectedCard({ card: card, from: sourceDuanName }); }
  };
  const handleDuanClick = (duanName) => { if (selectedCard) { handleCardClick(selectedCard.card, duanName); } };
  const handleAutoArrange = async () => { /* ... (robust version, calls gameService.requestAIArrangement, then updateUIFromGameState) ... */ 
    if (gameState?.status !== 'arranging') { setError('当前不是理牌阶段。'); return; }
    // ... (rest of the logic)
    try {
        const response = await gameService.requestAIArrangement(gameId);
        if (response.status === 'success' && response.arranged_hand) {
            updateLocalCardState([], response.arranged_hand.front, response.arranged_hand.middle, response.arranged_hand.back);
            setMessage(response.message || 'AI理牌完成。');
        } else { setError(response.message || 'AI理牌失败。'); }
    } catch (err) { setError(err.message || 'AI理牌请求错误。'); }
  };
  const handleSubmitArrangement = async () => { /* ... (robust version, calls gameService.submitArrangement, then updateUIFromGameState) ... */ 
    if (frontDuan.length !== 3 || middleDuan.length !== 5 || backDuan.length !== 5) { setError('牌墩未摆满。'); return; }
    // ... (rest of the logic)
    try {
        const response = await gameService.submitArrangement({ front: frontDuan, middle: middleDuan, back: backDuan }, gameId);
        if (response.status === 'success') { updateUIFromGameState(response); } 
        else { setError(response.message || '提交失败。'); }
    } catch (err) { setError(err.message || '提交请求错误。'); }
  };
  const handleDealNewCards = async () => { /* ... (robust version, calls gameService.dealCards, then updateUIFromGameState) ... */ 
    try {
        const response = await gameService.dealCards(gameId); // gameId should be set
        updateUIFromGameState(response);
    } catch (err) { setError(err.message || "重新发牌失败。"); }
  };

  // --- Render functions ---
  const renderDuan = (duanName, cardsInDuan, limit) => { /* ... (robust version from previous replies) ... */ 
    const displayCards = [...(cardsInDuan || [])]; // Ensure cardsInDuan is an array
    while (displayCards.length < limit) { displayCards.push(null); }
    return (
      <div className={`duan ${duanName}-duan`} onClick={() => handleDuanClick(duanName)}>
        <h3>{duanName.charAt(0).toUpperCase() + duanName.slice(1)} ({(cardsInDuan || []).length}/{limit})</h3>
        <div className="cards-container">
          {displayCards.map((card, index) => ( card ? <Card key={`${duanName}-${card}-${index}`} card={card} onClick={(c) => handleCardClick(c, duanName)} isSelected={selectedCard?.card === card && selectedCard?.from === duanName} /> : <div key={`ph-${duanName}-${index}`} className="card-placeholder"></div> ))}
        </div>
      </div>
    );
  };
  const renderOtherPlayers = () => { /* ... (robust version from previous replies) ... */ return null;};

  // --- Main Render ---
  if (isLoading && !gameState) { return <div className="loading-fullscreen">正在初始化游戏...</div>; }
  if (!user) { return <p>请先 <Link to="/login">登录</Link> 来开始游戏。</p>; }

  const myCurrentPlayerState = Array.isArray(gameState?.players) ? gameState.players.find(p => p.id === myPlayerId) : null;

  return (
    <div className="game-page">
      <h2>十三水游戏桌</h2>
      {message && <p className="message success-message">{message}</p>}
      {error && <p className="message error-message">{error}</p>}

      <div className="game-info">
        <p>游戏ID: {gameId || 'N/A'}</p>
        <p>状态: {gameState?.status || '未知'}</p>
        {myCurrentPlayerState?.is_ready && <p style={{color: 'green', fontWeight: 'bold'}}>您已提交牌型！</p>}
      </div>

      <div className="other-players-area"><h4>其他玩家:</h4>{renderOtherPlayers()}</div>

      <div className="player-area">
        <h4>你的手牌 (未摆放: {hand ? hand.length : 0}张)</h4>
        <div className="hand-area cards-container" onClick={() => { if(selectedCard && selectedCard.from !== 'hand') handleDuanClick('hand'); else if (selectedCard) setSelectedCard(null); }}>
          {console.log("GamePage RENDER: Hand being mapped:", JSON.parse(JSON.stringify(hand)))} {/* Log hand before map */}
          {hand && hand.length > 0 ? (
            hand.map(card => (
              <Card
                key={`hand-${card}`} card={card}
                onClick={(c) => handleCardClick(c, 'hand')}
                isSelected={selectedCard?.card === card && selectedCard?.from === 'hand'}
              />
            ))
          ) : (
            <p>{gameState && (gameState.status === 'arranging' || gameState.status === 'dealing') ? '所有牌已摆放或等待发牌。' : (gameState && gameState.status !== 'none' ? '等待发牌...' : '请开始新游戏或重新发牌。')}</p>
          )}
        </div>

        {selectedCard && <p className="selected-card-info">选中: {selectedCard.card} (来自: {selectedCard.from})</p>}
        <div className="arranged-duans">
          {renderDuan('front', frontDuan, 3)}
          {renderDuan('middle', middleDuan, 5)}
          {renderDuan('back', backDuan, 5)}
        </div>
      </div>

      <div className="actions-area">
        <button onClick={handleAutoArrange} disabled={isLoading || gameState?.status !== 'arranging' || !!myCurrentPlayerState?.is_ready || !hand || hand.length === 0}>AI理牌</button>
        <button onClick={handleSubmitArrangement} disabled={isLoading || gameState?.status !== 'arranging' || !!myCurrentPlayerState?.is_ready}>提交牌型</button>
        <button onClick={handleDealNewCards} disabled={isLoading || (gameState?.status === 'arranging' && (hand && hand.length > 0))}>
            {gameState && (gameState.status === 'arranging' || gameState.status === 'waiting' || gameState.status === 'dealing') ? '重新发牌' : '开始新局/发牌'}
        </button>
      </div>
      <div className="game-log-area"><h4>游戏日志:</h4><ul className="game-log-list">{(gameState?.game_log || []).slice().reverse().map((log, index) => <li key={index}>{log}</li>)}</ul></div>
    </div>
  );
};

export default GamePage;
