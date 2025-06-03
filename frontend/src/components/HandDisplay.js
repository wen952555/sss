// frontend/src/components/HandDisplay.js
import React from 'react';
import Card from './Card';
// import { getHandTypeName } from '../utils/cardUtils'; // 如果 getHandTypeNameFromEval 在 Room.js 处理，这里可能不需要
import './HandDisplay.css';

// 简单的数字到名称的映射 (与后端 gameLogic.js 中的 HAND_TYPE_NAMES 和 Room.js 中的 localHandTypeNames 一致)
const HAND_TYPE_NAMES_LOCAL = {0: '乌龙', 1: '一对', 2: '两对', 3: '三条', 4: '顺子', 5: '同花', 6: '葫芦', 7: '铁支', 8: '同花顺'};


const HandDisplay = ({ title, cards, cardObjects = [], handEvaluation, onCardClick, selectedCards = [], cardStyle = {} }) => {
    const displayableCards = cardObjects.length > 0 ? cardObjects : (cards || []);

    let evaluationText = '';
    if (handEvaluation) {
        if (handEvaluation.name) { // 优先使用后端直接给的name
            evaluationText = handEvaluation.name;
        } else if (handEvaluation.type !== undefined && HAND_TYPE_NAMES_LOCAL[handEvaluation.type]) { // 其次使用本地映射
            evaluationText = HAND_TYPE_NAMES_LOCAL[handEvaluation.type];
        }
    }

    return (
        <div className="hand-display-container">
            <h4>{title} ({displayableCards.length} 张)</h4>
            {evaluationText && (
                <p className="hand-evaluation">
                    牌型: {evaluationText}
                </p>
            )}
            <div className="cards-wrapper">
                {displayableCards.map((card, index) => (
                    <Card
                        key={card?.id || `empty-${title}-${index}`} // 增加对 card 可能为 null 的检查和更唯一的 key
                        card={card}
                        isSelected={selectedCards.some(selCard => card && selCard.id === card.id)}
                        onClick={onCardClick && card ? () => onCardClick(card, title) : undefined}
                        style={cardStyle}
                    />
                ))}
                {/* 根据墩的容量显示空槽，确保 key 的唯一性 */}
                {title === "头墩" && displayableCards.length < 3 && Array(3 - displayableCards.length).fill(null).map((_, i) => <Card key={`empty-front-${i}`} card={null} style={cardStyle} />)}
                {title === "中墩" && displayableCards.length < 5 && Array(5 - displayableCards.length).fill(null).map((_, i) => <Card key={`empty-middle-${i}`} card={null} style={cardStyle} />)}
                {title === "尾墩" && displayableCards.length < 5 && Array(5 - displayableCards.length).fill(null).map((_, i) => <Card key={`empty-back-${i}`} card={null} style={cardStyle} />)}
            </div>
        </div>
    );
};

export default HandDisplay;
