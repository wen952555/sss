import React, { useState, useEffect } from 'react';

const GameBoard = ({ scoreType, onExitGame }) => {
  const [gameState, setGameState] = useState({
    phase: 'playing', // dealing, playing, comparing
    players: [],
    currentPlayer: null
  });

  const [headCards, setHeadCards] = useState([]);
  const [middleCards, setMiddleCards] = useState([]);
  const [tailCards, setTailCards] = useState([]);
  const [showComparison, setShowComparison] = useState(false);

  // 初始化游戏
  useEffect(() => {
    initializeGame();
  }, [scoreType]);

  const initializeGame = () => {
    // 模拟发牌
    const mockCards = [
      's1', 's2', 's3', 'h4', 'h5', 'h6', 'c7', 'c8', 'c9', 'd10', 'd11', 'd12', 'd13'
    ];

    // 直接分配到三道
    setHeadCards(mockCards.slice(0, 3));
    setMiddleCards(mockCards.slice(3, 8));
    setTailCards(mockCards.slice(8, 13));

    // 模拟玩家
    setGameState({
      phase: 'playing',
      players: [
        { id: 1, name: '小明', score: 0, ready: true },
        { id: 2, name: '小红', score: 0, ready: true },
        { id: 3, name: '小刚', score: 0, ready: true },
        { id: 4, name: '你', score: 0, ready: true }
      ],
      currentPlayer: 4
    });
  };

  const handleAutoArrange = () => {
    // 自动理牌逻辑
    const allCards = [...headCards, ...middleCards, ...tailCards];
    const sorted = allCards.sort((a, b) => {
      const rankA = parseInt(a.substring(1));
      const rankB = parseInt(b.substring(1));
      return rankA - rankB;
    });
    
    setHeadCards(sorted.slice(0, 3));
    setMiddleCards(sorted.slice(3, 8));
    setTailCards(sorted.slice(8, 13));
  };

  const handleSubmit = () => {
    // 提交牌型
    setGameState(prev => ({ ...prev, phase: 'comparing' }));
    setShowComparison(true);
  };

  const getScoreFieldColor = () => {
    switch (scoreType) {
      case 2: return '#27ae60';
      case 5: return '#3498db';
      case 10: return '#e74c3c';
      default: return '#27ae60';
    }
  };

  const renderCard = (card, index) => (
    <img
      key={index}
      src={`/cards/${card}.svg`}
      alt={card}
      className="game-card"
      draggable={false}
    />
  );

  return (
    <div className="game-board">
      {/* 游戏头部信息 */}
      <div className="game-header">
        <div className="game-info">
          <span className="score-type" style={{ color: getScoreFieldColor() }}>
            {scoreType}分场
          </span>
          <span className="game-phase">游戏中</span>
        </div>
        <button className="exit-button" onClick={onExitGame}>
          退出游戏
        </button>
      </div>

      {/* 玩家信息 */}
      <div className="players-info">
        {gameState.players.map(player => (
          <div 
            key={player.id} 
            className={`player-tag ${player.id === gameState.currentPlayer ? 'current' : ''}`}
          >
            <span className="player-name">{player.name}</span>
            <span className="player-status">
              {player.ready ? '已准备' : '准备中'}
            </span>
          </div>
        ))}
      </div>

      {/* 牌桌区域 */}
      <div className="game-table">
        {/* 尾道 */}
        <div className="card-lane tail-lane">
          <div className="lane-header">
            <span>尾道 (5张)</span>
            <span className="lane-count">{tailCards.length}/5</span>
          </div>
          <div className="lane-cards">
            {tailCards.map(renderCard)}
          </div>
        </div>

        {/* 中道 */}
        <div className="card-lane middle-lane">
          <div className="lane-header">
            <span>中道 (5张)</span>
            <span className="lane-count">{middleCards.length}/5</span>
          </div>
          <div className="lane-cards">
            {middleCards.map(renderCard)}
          </div>
        </div>

        {/* 头道 */}
        <div className="card-lane head-lane">
          <div className="lane-header">
            <span>头道 (3张)</span>
            <span className="lane-count">{headCards.length}/3</span>
          </div>
          <div className="lane-cards">
            {headCards.map(renderCard)}
          </div>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="action-buttons">
        <button className="action-btn auto-arrange" onClick={handleAutoArrange}>
          自动理牌
        </button>
        <button className="action-btn submit" onClick={handleSubmit}>
          提交牌型
        </button>
        <button 
          className="action-btn compare" 
          onClick={() => setShowComparison(true)}
        >
          查看比牌
        </button>
      </div>

      {/* 比牌界面 */}
      {showComparison && (
        <div className="comparison-modal">
          <div className="comparison-content">
            <div className="comparison-header">
              <h3>比牌结果</h3>
              <button 
                className="close-btn"
                onClick={() => setShowComparison(false)}
              >
                ×
              </button>
            </div>
            
            <div className="comparison-results">
              {gameState.players.map(player => (
                <div key={player.id} className="player-result">
                  <div className="player-name">{player.name}</div>
                  <div className="player-score">得分: {player.score}</div>
                  <div className="player-cards">
                    <div className="result-lane">
                      <span>头道:</span>
                      <div className="cards">
                        {headCards.slice(0, 3).map(renderCard)}
                      </div>
                    </div>
                    <div className="result-lane">
                      <span>中道:</span>
                      <div className="cards">
                        {middleCards.slice(0, 5).map(renderCard)}
                      </div>
                    </div>
                    <div className="result-lane">
                      <span>尾道:</span>
                      <div className="cards">
                        {tailCards.slice(0, 5).map(renderCard)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameBoard;