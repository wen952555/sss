import React, { useState, useEffect, useCallback } from 'react';
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
    phase: 'playing', // 直接进入游戏状态
    players: [],
    currentPlayer: null
  });
  
  // 牌墩状态 - 直接分配3-5-5
  const [topLane, setTopLane] = useState([]);
  const [middleLane, setMiddleLane] = useState([]);
  const [bottomLane, setBottomLane] = useState([]);
  
  // UI状态
  const [selectedLane, setSelectedLane] = useState(null);
  const [showComparison, setShowComparison] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [specialHandType, setSpecialHandType] = useState(null);

  // 初始化游戏 - 直接发牌到牌墩
  useEffect(() => {
    initializeGame();
  }, [tableId]);

  // 初始化游戏数据
  const initializeGame = async () => {
    try {
      // 模拟发牌 - 直接分配到牌墩
      const mockCards = [
        's1', 's2', 's3', 'h4', 'h5', 'h6', 'c7', 'c8', 'c9', 'd10', 'd11', 'd12', 'd13'
      ];
      
      // 直接按3-5-5分配
      setTopLane(mockCards.slice(0, 3));
      setMiddleLane(mockCards.slice(3, 8));
      setBottomLane(mockCards.slice(8, 13));
      
      // 获取玩家信息
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
      
      // 初始验证
      validateCurrentHand();
      
    } catch (error) {
      console.error('初始化游戏失败:', error);
    }
  };

  // 牌墩点击处理 - 在牌墩之间移动牌
  const handleLaneCardClick = useCallback((cardCode, sourceLane) => {
    if (selectedLane && selectedLane !== sourceLane) {
      // 移动到选中的牌墩
      moveCardBetweenLanes(cardCode, sourceLane, selectedLane);
      setSelectedLane(null);
    } else {
      // 选择牌墩
      setSelectedLane(sourceLane);
    }
  }, [selectedLane]);

  // 在牌墩之间移动牌
  const moveCardBetweenLanes = (cardCode, fromLane, toLane) => {
    const laneSetters = {
      top: setTopLane,
      middle: setMiddleLane,
      bottom: setBottomLane
    };
    
    const laneGetters = {
      top: topLane,
      middle: middleLane,
      bottom: bottomLane
    };
    
    const maxCards = {
      top: 3,
      middle: 5,
      bottom: 5
    };
    
    const fromCards = laneGetters[fromLane];
    const toCards = laneGetters[toLane];
    
    // 检查目标牌墩是否有空位
    if (toCards.length >= maxCards[toLane]) {
      return;
    }
    
    // 从源牌墩移除
    laneSetters[fromLane](prev => prev.filter(card => card !== cardCode));
    // 添加到目标牌墩
    laneSetters[toLane](prev => [...prev, cardCode]);
    
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
    // 收集所有牌
    const allCards = [...topLane, ...middleLane, ...bottomLane];
    
    // 按点数排序
    const sortedCards = allCards.sort((a, b) => {
      const rankA = parseInt(a.substring(1));
      const rankB = parseInt(b.substring(1));
      return rankA - rankB;
    });
    
    // 重新分配到牌墩
    setTopLane(sortedCards.slice(0, 3));
    setMiddleLane(sortedCards.slice(3, 8));
    setBottomLane(sortedCards.slice(8, 13));
    
    validateCurrentHand();
  };

  // 重置理牌
  const handleResetHand = () => {
    // 重新初始化发牌
    initializeGame();
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
      {/* 游戏牌桌 */}
      <GameTable
        players={gameState.players}
        currentPlayerId={gameState.currentPlayer}
        gameState={gameState}
      />

      {/* 牌墩区域 - 三道横幅样式 */}
      <div className="lanes-area" style={{ 
        padding: '10px',
        background: 'linear-gradient(135deg, #1a2a3a, #2c3e50)',
        borderRadius: '0'
      }}>
        {/* 尾道横幅 */}
        <div 
          className="lane-banner bottom-lane-banner"
          style={{
            background: 'linear-gradient(135deg, #e74c3c, #c0392b)',
            borderRadius: '10px',
            padding: '15px',
            marginBottom: '10px',
            color: 'white'
          }}
        >
          <CardArea
            title="尾道 (5张)"
            cards={bottomLane}
            maxCards={5}
            onCardClick={(card) => handleLaneCardClick(card, 'bottom')}
            selected={selectedLane === 'bottom'}
            onAreaSelect={() => setSelectedLane('bottom')}
            showEvaluation={true}
          />
        </div>

        {/* 中道横幅 */}
        <div 
          className="lane-banner middle-lane-banner"
          style={{
            background: 'linear-gradient(135deg, #3498db, #2980b9)',
            borderRadius: '10px',
            padding: '15px',
            marginBottom: '10px',
            color: 'white'
          }}
        >
          <CardArea
            title="中道 (5张)"
            cards={middleLane}
            maxCards={5}
            onCardClick={(card) => handleLaneCardClick(card, 'middle')}
            selected={selectedLane === 'middle'}
            onAreaSelect={() => setSelectedLane('middle')}
            showEvaluation={true}
          />
        </div>

        {/* 头道横幅 */}
        <div 
          className="lane-banner top-lane-banner"
          style={{
            background: 'linear-gradient(135deg, #27ae60, #2ecc71)',
            borderRadius: '10px',
            padding: '15px',
            marginBottom: '10px',
            color: 'white'
          }}
        >
          <CardArea
            title="头道 (3张)"
            cards={topLane}
            maxCards={3}
            onCardClick={(card) => handleLaneCardClick(card, 'top')}
            selected={selectedLane === 'top'}
            onAreaSelect={() => setSelectedLane('top')}
            showEvaluation={true}
          />
        </div>
      </div>

      {/* 验证信息和特殊牌型 */}
      {validationResult && (
        <div style={{
          padding: '12px',
          margin: '10px',
          background: validationResult.valid ? '#27ae60' : '#e74c3c',
          color: 'white',
          borderRadius: '10px',
          textAlign: 'center',
          fontSize: '0.9rem',
          fontWeight: 'bold'
        }}>
          {validationResult.message}
          {specialHandType && (
            <div style={{ 
              marginTop: '5px',
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
          style={{ background: '#3498db' }}
        >
          自动理牌
        </button>
        
        <button 
          className="game-button"
          onClick={handleResetHand}
          style={{ background: '#f39c12' }}
        >
          重新发牌
        </button>
        
        <button 
          className="game-button"
          onClick={handleSubmitHand}
          disabled={!validationResult?.valid}
          style={{ 
            background: validationResult?.valid ? '#27ae60' : '#7f8c8d'
          }}
        >
          提交牌型
        </button>
        
        <button 
          className="game-button"
          onClick={handleShowComparison}
          style={{ background: '#9b59b6' }}
        >
          查看比牌
        </button>
        
        <button 
          className="game-button"
          onClick={handleExitGame}
          style={{ background: '#e74c3c' }}
        >
          退出游戏
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
