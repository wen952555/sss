import React, { useState } from 'react';
import { recognizeCard } from '../services/api';
import Card from './Card';

const Recognition = () => {
  const [selectedCard, setSelectedCard] = useState(null);
  const [recognitionResult, setRecognitionResult] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // 示例扑克牌
  const demoCards = [
    '10_of_clubs.svg',
    'ace_of_spades.svg',
    'king_of_diamonds.svg',
    'queen_of_hearts.svg',
    'jack_of_spades.svg'
  ];
  
  const handleCardSelect = async (filename) => {
    setSelectedCard(filename);
    setLoading(true);
    setRecognitionResult(null);
    
    try {
      const result = await recognizeCard(filename);
      setRecognitionResult(result);
    } catch (error) {
      setRecognitionResult({
        success: false,
        message: '识别失败: ' + error.message
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="recognition-container">
      <h2>扑克牌识别系统</h2>
      <p className="subtitle">选择一张扑克牌进行识别</p>
      
      <div className="card-selection">
        {demoCards.map((card, index) => (
          <div 
            key={index}
            className={`card-preview ${selectedCard === card ? 'selected' : ''}`}
            onClick={() => handleCardSelect(card)}
          >
            <Card filename={card} />
          </div>
        ))}
      </div>
      
      <div className="recognition-result">
        {loading && <div className="loader"><i className="fas fa-spinner fa-spin"></i> 识别中...</div>}
        
        {recognitionResult && !loading && (
          <div className={`result-card ${recognitionResult.success ? 'success' : 'error'}`}>
            {recognitionResult.success ? (
              <>
                <h3>识别成功!</h3>
                <p>扑克牌: {recognitionResult.card_name}</p>
                <p>标识符: {recognitionResult.card_value}</p>
                <Card filename={selectedCard} />
              </>
            ) : (
              <>
                <h3>识别失败</h3>
                <p>{recognitionResult.message}</p>
              </>
            )}
          </div>
        )}
      </div>
      
      <div className="recognition-info">
        <h3>识别原理</h3>
        <p>系统通过比对扑克牌SVG文件的文件名，匹配预设的扑克牌数据库。</p>
        <p>后端API: https://9525.ip-ddns.com/api/recognize_card.php</p>
      </div>
    </div>
  );
};

export default Recognition;
