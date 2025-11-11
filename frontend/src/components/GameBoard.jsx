import React, { useState, useEffect, useCallback } from 'react';
import CardHand from './CardHand';
import CardArea from './CardArea';
import GameTable from './GameTable';
import CardComparison from './CardComparison';
import PlayerInfo from './PlayerInfo';
import { validateThirteenCards, checkSpecialHandType } from '../utils/gameLogic';
import { validateCards } from '../utils/cardValidator';
import apiService from '../api/apiService';
import '../styles/mobile.css';
import '../styles/game.css';

const GameBoard = ({ tableId, onExitGame }) => {
  // 游戏状态
  const [gameState, setGameState] = useState({
    phase: 'dealing', // dealing, playing, comparing, finished
    players: [],
    currentPlayer: null,
    timer: 60
  });
  
  // 手牌和牌道状态
  const [handCards, setHandCards] = useState([]);
  const [topLane, setTopLane] = useState([]);
  const [middleLane, setMiddleLane] = useState([]);
  const [bottomLane, setBottomLane] = useState([]);
  
  // UI状态
  const [selectedLane, setSelectedLane] = useState(null);
  const [selectedCards, setSelectedCards] = useState([]);
  const [showComparison, setShowComparison] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [specialHandType, setSpecialHandType] = useState(null);

  // 初始化游戏
  useEffect(() => {
    initializeGame();
    
    // 设置游戏状态轮询
    const gameInterval = setInterval(fetchGameState, 3000);
    
    return () => clearInterval(gameInterval);
  }, [tableId]);

  // 初始化游戏数据
  const initializeGame = async () => {
    try {
      // 获取初始手牌
      // const response = await apiService.getGameHand(tableId);
      // setHandCards(response.cards);
      
      // 模拟数据
      setHandCards([
        's1', 's2', 's3', 'h4', 'h5', 'h6', 'c7', 'c8', 'c9', 'd10', 'd11', 'd12', 'd13'
      ]);
      
      // 获取玩家信息
      // const playersResponse = await apiService.getTablePlayers(tableId);
      const mockPlayers = [
        { id: 1, name: '玩家A', user_id_4d: '1234', points: 1000, ready: true },
        { id: 2, name: '玩家B', user_id_4d: '5678', points: 950, ready: true },
        { id: 3, name: '玩家C', user_id_4d: '9012', points: 1100, ready: false },
        { id: 4, name: '你', user_id_4d: '3456', points: 1050, ready: true, isCurrent: true }
      ];
      
      setGameState(prev => ({
        ...prev,
        players: mockPlayers,
        currentPlayer: 4
      }));
      
    } catch (error) {
      console.error('初始化游戏失败:', error);
    }
  };

  // 获取游戏状态
  const fetchGameState = async () => {
    try {
      // const response = await apiService.getGameState(tableId);
      // 更新游戏状态
    } catch (error) {
      console.error('获取游戏状态失败:', error);
    }
  };

  // 手牌点击处理
  const handleHandCardClick = useCallback((cardCode) => {
    if (selectedLane) {
      // 将牌移动到选中的牌道
      moveCardToLane(cardCode, selectedLane);
    } else if (selectedCards.includes(cardCode)) {
      // 取消选择
      setSelectedCards(prev => prev.filter(card => card !== cardCode));
    } else {
      // 选择牌
      setSelectedCards(prev => [...prev, cardCode]);
    }
  }, [selectedLane, selectedCards]);

  // 牌道点击处理
  const handleLaneCardClick = useCallback((cardCode) => {
    // 将牌移回手牌
    moveCardToHand(cardCode);
    setSelectedLane(null);
  }, []);

  // 移动牌到牌道
  const moveCardToLane = (cardCode, laneType) => {
    const laneSetters = {
      top: setTopLane,
      middle: setMiddleLane,
      bottom: setBottomLane
    };
    
    const laneCards = {
      top: topLane,
      middle: middleLane,
      bottom: bottomLane
    };
    
    const maxCards = {
      top: 3,
      middle: 5,
      bottom: 5
    };
    
    const setLane = laneSetters[laneType];
    const currentLaneCards = laneCards[laneType];
    const max = maxCards[laneType];
    
    if (currentLaneCards.length < max) {
      // 从手牌移除
      setHandCards(prev => prev.filter(card => card !== cardCode));
      // 添加到牌道
      setLane(prev => [...prev, cardCode]);
      // 清除选择
      setSelectedCards(prev => prev.filter(card => card !== cardCode));
      
      // 验证牌型
      validateCurrentHand();
    }
  };

  // 移动牌回手牌
  const moveCardToHand = (cardCode) => {
    // 从各个牌道查找并移除
    if (topLane.includes(cardCode)) {
      setTopLane(prev => prev.filter(card => card !== cardCode));
    } else if (middleLane.includes(cardCode)) {
      setMiddleLane(prev => prev.filter(card => card !== cardCode));
    } else if (bottomLane.includes(cardCode)) {
      setBottomLane(prev => prev.filter(card => card !== cardCode));
    }
    
    // 添加回手牌
    setHandCards(prev => [...prev, cardCode]);
    
    // 验证牌型
    validateCurrentHand();
  };

  // 验证当前理牌
  const validateCurrentHand = useCallback(() => {
    const hand = {
      top: topLane,
      middle: middleLane,
      bottom: bottomLane
    };
    
    // 检查牌数
    const totalCards = topLane.length + middleLane.length + bottomLane.length;
    if (totalCards === 0) {
      setValidationResult(null);
      setSpecialHandType(null);
      return;
    }
    
    // 验证牌型规则
    const validation = validateThirteenCards(hand);
    setValidationResult(validation);
    
    // 检查特殊牌型
    if (validation.valid && totalCards === 13) {
      const specialType = checkSpecialHandType(hand);
      setSpecialHandType(specialType);
    } else {
      setSpecialHandType(null);
    }
  }, [topLane, middleLane, bottomLane]);

  // 提交理牌结果
  const handleSubmitHand = async () => {
    if (!validationResult?.valid) {
      alert(validationResult?.message || '请正确理牌');
      return;
    }
    
    try {
      const hand = {
        top: topLane,
        middle: middleLane,
        bottom: bottomLane
      };
      
      // 提交到后端
      // await apiService.submitHand(tableId, hand);
      
      alert('提交成功！等待其他玩家...');
      
      // 更新游戏状态
      setGameState(prev => ({
        ...prev,
        phase: 'comparing'
      }));
      
    } catch (error) {
      console.error('提交失败:', error);
      alert('提交失败，请重试');
    }
  };

  // 快速理牌（自动排序）
  const handleAutoArrange = () => {
    // 简单的自动理牌逻辑 - 实际应该更复杂
    const sortedHand = [...handCards].sort((a, b) => {
      const rankA = parseInt(a.substring(1));
      const rankB = parseInt(b.substring(1));
      return rankA - rankB;
    });
    
    // 简单分配：前3张头道，中间5张中道，后5张尾道
    const newTop = sortedHand.slice(0, 3);
    const newMiddle = sortedHand.slice(3, 8);
    const newBottom = sortedHand.slice(8, 13);
    
    setTopLane(newTop);
    setMiddleLane(newMiddle);
    setBottomLane(newBottom);
    setHandCards([]);
    
    validateCurrentHand();
  };

  // 重置理牌
  const handleResetHand = () => {
    setHandCards([...handCards, ...topLane, ...middleLane, ...bottomLane]);
    setTopLane([]);
    setMiddleLane([]);
    setBottomLane([]);
    setSelectedLane(null);
    setValidationResult(null);
    setSpecialHandType(null);
  };

  // 显示比牌结果
  const handleShowComparison = () => {
    setShowComparison(true);
  };

  // 退出游戏
  const handleExitGame = () => {
    if (window.confirm('确定要退出游戏吗？')) {
      onExitGame();
    }
  };

  return (
    <div className="game-container">
      {/* 开发提示横幅 */}
      <div style={{
        position: 'absolute',
        top: '10px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'linear-gradient(45deg, #ff6b6b, #feca57)',
        color: 'white',
        padding: '8px 20px',
        borderRadius: '20px',
        zIndex: 100,
        fontSize: '0.8rem',
        fontWeight: 'bold',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        textAlign: 'center'
      }}>
        🚧 演示模式 - 功能开发中
      </div>

      {/* 游戏牌桌 */}
      <GameTable
        players={gameState.players}
        currentPlayerId={gameState.currentPlayer}
        gameState={gameState}
      />

      {/* 手牌区域 */}
      <CardHand
        cards={handCards}
        onCardClick={handleHandCardClick}
        selectedCards={selectedCards}
        onSelectCard={handleHandCardClick}
      />

      {/* 牌道区域 */}
      <div className="lanes-area">
        <CardArea
          title="尾道 (5张)"
          cards={bottomLane}
          maxCards={5}
          onCardClick={handleLaneCardClick}
          selected={selectedLane === 'bottom'}
          onAreaSelect={() => setSelectedLane('bottom')}
          showEvaluation={true}
        />
        
        <CardArea
          title="中道 (5张)"
          cards={middleLane}
          maxCards={5}
          onCardClick={handleLaneCardClick}
          selected={selectedLane === 'middle'}
          onAreaSelect={() => setSelectedLane('middle')}
          showEvaluation={true}
        />
        
        <CardArea
          title="头道 (3张)"
          cards={topLane}
          maxCards={3}
          onCardClick={handleLaneCardClick}
          selected={selectedLane === 'top'}
          onAreaSelect={() => setSelectedLane('top')}
          showEvaluation={true}
        />
      </div>

      {/* 验证信息和特殊牌型 */}
      {validationResult && (
        <div style={{
          padding: '10px',
          margin: '5px',
          background: validationResult.valid ? '#27ae60' : '#e74c3c',
          color: 'white',
          borderRadius: '8px',
          textAlign: 'center',
          fontSize: '0.9rem'
        }}>
          {validationResult.message}
          {specialHandType && (
            <div style={{ 
              marginTop: '5px',
              fontWeight: 'bold',
              fontSize: '1rem'
            }}>
              🎉 特殊牌型: {specialHandType} 🎉
            </div>
          )}
        </div>
      )}

      {/* 底部操作栏 */}
      <div className="action-bar">
        <button 
          className="game-button"
          onClick={handleAutoArrange}
          disabled={handCards.length === 0}
        >
          自动理牌
        </button>
        
        <button 
          className="game-button"
          onClick={handleResetHand}
          disabled={topLane.length === 0 && middleLane.length === 0 && bottomLane.length === 0}
        >
          重置
        </button>
        
        <button 
          className="game-button"
          onClick={handleSubmitHand}
          disabled={!validationResult?.valid}
          style={{ 
            background: validationResult?.valid ? '#27ae60' : '#7f8c8d'
          }}
        >
          提交
        </button>
        
        <button 
          className="game-button"
          onClick={handleShowComparison}
          style={{ background: '#9b59b6' }}
        >
          比牌
        </button>
        
        <button 
          className="game-button"
          onClick={handleExitGame}
          style={{ background: '#e74c3c' }}
        >
          退出
        </button>
      </div>

      {/* 比牌界面 */}
      {showComparison && (
        <CardComparison
          players={[
            {
              id: 1,
              name: '玩家A',
              hand: {
                top: ['s1', 's2', 's3'],
                middle: ['h4', 'h5', 'h6', 'h7', 'h8'],
                bottom: ['c9', 'c10', 'c11', 'c12', 'c13']
              }
            },
            {
              id: 4,
              name: '你',
              hand: {
                top: topLane,
                middle: middleLane,
                bottom: bottomLane
              }
            }
          ]}
          onClose={() => setShowComparison(false)}
          currentPlayerId={4}
        />
      )}
    </div>
  );
};

export default GameBoard;
