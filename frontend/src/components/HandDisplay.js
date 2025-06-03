// frontend/src/components/HandDisplay.js
import React from 'react';
import Card from './Card';
import { getHandTypeName } from '../utils/cardUtils';
import './HandDisplay.css';

const HandDisplay = ({ title, cards, cardObjects = [], handEvaluation, onCardClick, selectedCards = [], cardStyle = {} }) => {
    // cardObjects 是完整的牌对象数组，用于显示
    // cards 是牌的 id 数组，可以用于 onCardClick 等逻辑 (如果需要区分)
    
    // 如果传入的是牌ID数组，并且有cardObjects，则优先用cardObjects渲染
    const displayableCards = cardObjects.length > 0 ? cardObjects : (cards || []);


    return (
        <div className="hand-display-container">
            <h4>{title} ({displayableCards.length} 张)</h4>
            {handEvaluation && (
                <p className="hand-evaluation">
                    牌型: {getHandTypeName(handEvaluation.type)}
                    {/* 可以显示更多牌型细节，例如 handEvaluation.primaryRankValue */}
                </p>
            )}
            <div className="cards-wrapper">
                {displayableCards.map((card, index) => (
                    <Card
                        key={card.id || index} // 如果是空槽位，用index
                        card={card}
                        isSelected={selectedCards.some(selCard => selCard.id === card.id)}
                        onClick={onCardClick ? () => onCardClick(card, title) : undefined} // title 可以用来区分点击的墩
                        style={cardStyle}
                    />
                ))}
                {/* 如果是固定墩位，可以显示空槽 */}
                {title === "头墩" && displayableCards.length < 3 && Array(3 - displayableCards.length).fill(null).map((_, i) => <Card key={`empty-front-${i}`} card={null} style={cardStyle} />)}
                {title === "中墩" && displayableCards.length < 5 && Array(5 - displayableCards.length).fill(null).map((_, i) => <Card key={`empty-middle-${i}`} card={null} style={cardStyle} />)}
                {title === "尾墩" && displayableCards.length < 5 && Array(5 - displayableCards.length).fill(null).map((_, i) => <Card key={`empty-back-${i}`} card={null} style={cardStyle} />)}
            </div>
        </div>
    );
};

export default HandDisplay;
