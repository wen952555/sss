// frontend_react/src/components/PlayerHand.js
import React, { useState, useEffect } from 'react';
import Card from './Card';
import { evaluateHand } from '../logic/cardUtils';
import './PlayerHand.css'; // 创建对应的CSS

const PlayerHand = ({ player, onConfirmArrangement, isHumanPlayer, onSelectCard, selectedCards, onArrangeDun, arrangedPlayerHand }) => {
  const [tou, setTou] = useState([]);
  const [zhong, setZhong] = useState([]);
  const [wei, setWei] = useState([]);

  useEffect(() => {
    // 如果是AI或者已经摆好牌的玩家，直接显示
    if (player.confirmed && player.evalHands) {
      setTou(player.arranged.tou);
      setZhong(player.arranged.zhong);
      setWei(player.arranged.wei);
    } else if (isHumanPlayer && arrangedPlayerHand) { // 由App.js通过AI建议或拖拽后传入
        setTou(arrangedPlayerHand.tou || []);
        setZhong(arrangedPlayerHand.zhong || []);
        setWei(arrangedPlayerHand.wei || []);
    } else { // 重置或初始状态
        setTou([]);
        setZhong([]);
        setWei([]);
    }
  }, [player, isHumanPlayer, arrangedPlayerHand]);


  const getDunCards = (dunName) => {
    if (player.confirmed && player.arranged && player.arranged[dunName]) {
        return player.arranged[dunName];
    }
    if (isHumanPlayer && arrangedPlayerHand && arrangedPlayerHand[dunName]) {
        return arrangedPlayerHand[dunName];
    }
    return dunName === 'tou' ? tou : (dunName === 'zhong' ? zhong : wei);
  }

  const renderDun = (dunName, cards, dunSize) => {
    const evalResult = player.confirmed && player.evalHands ? player.evalHands[dunName] : evaluateHand(cards);
    const displayName = evalResult ? evalResult.name : '未完成';
    
    // 给人类玩家提供点击区域以放置选中的牌
    const handleDunClick = () => {
      if (isHumanPlayer && !player.confirmed && onArrangeDun) {
        onArrangeDun(dunName);
      }
    };

    return (
      <div className={`dun ${dunName}`} onClick={handleDunClick} title={isHumanPlayer && !player.confirmed ? `点击放置选中的牌到${dunName}` : ''}>
        <strong>{dunName.toUpperCase()} ({displayName}):</strong>
        <div className="dun-cards">
          {cards.map(card => <Card key={card.id} card={card} />)}
          {Array(dunSize - cards.length).fill(null).map((_, i) => <Card key={`placeholder-${dunName}-${i}`} />)}
        </div>
      </div>
    );
  };

  const handleConfirm = () => {
    if (isHumanPlayer) {
      const currentArrangement = {
        tou: getDunCards('tou'),
        zhong: getDunCards('zhong'),
        wei: getDunCards('wei')
      };
      if (currentArrangement.tou.length !== 3 || currentArrangement.zhong.length !== 5 || currentArrangement.wei.length !== 5) {
        alert('请将所有13张牌分入三墩！');
        return;
      }
      onConfirmArrangement(player.id, currentArrangement);
    }
  };

  return (
    <div className={`player-hand ${player.isHuman ? 'human-player' : 'ai-player'}`}>
      <h4>{player.name} (得分: {player.score}) {player.confirmed ? "✔️已确认" : ""}</h4>
      {!player.isHuman && !player.confirmed && <p>AI 正在思考...</p>}
      {!player.isHuman && player.confirmed && <p>AI 已分牌.</p>}
      
      {/* 玩家手牌区 (用于人类玩家拖拽或选择) */}
      {isHumanPlayer && !player.confirmed && (
        <div className="unarranged-cards-area">
          <p>你的手牌 (点击选择/取消选择):</p>
          {player.hand
            .filter(card => 
                !getDunCards('tou').find(c => c.id === card.id) &&
                !getDunCards('zhong').find(c => c.id === card.id) &&
                !getDunCards('wei').find(c => c.id === card.id)
            )
            .map(card => (
            <Card 
              key={card.id} 
              card={card} 
              onClick={() => onSelectCard(card)}
              style={{ border: selectedCards.find(sc => sc.id === card.id) ? '2px solid blue' : '1px solid #ccc' }}
            />
          ))}
        </div>
      )}

      {/* 墩牌区 */}
      <div className="arranged-duns">
        {renderDun('tou', getDunCards('tou'), 3)}
        {renderDun('zhong', getDunCards('zhong'), 5)}
        {renderDun('wei', getDunCards('wei'), 5)}
      </div>

      {isHumanPlayer && !player.confirmed && (
        <button onClick={handleConfirm} disabled={getDunCards('tou').length !==3 || getDunCards('zhong').length !==5 || getDunCards('wei').length !==5}>
          确认墩牌
        </button>
      )}
    </div>
  );
};

export default PlayerHand;
