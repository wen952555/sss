// frontend/src/components/GameBoard.js
import React, { useState, useEffect, useCallback } from 'react';
import { DragDropContext } from 'react-beautiful-dnd';
import HandArea from './HandArea';
import { fetchInitialCards, evaluateArrangement } from '../utils/api';
import { smartAiArrangeCards, evaluateHandSimple as evaluateHandSimpleFrontend } from '../utils/thirteenAi';

const initialHandsState = {
    frontHand: { id: 'frontHand', title: '前墩', cards: [], limit: 3, evalText: '' },
    middleHand: { id: 'middleHand', title: '中墩', cards: [], limit: 5, evalText: '' },
    backHand: { id: 'backHand', title: '后墩', cards: [], limit: 5, evalText: '' },
};

const GameBoard = () => {
    const [hands, setHands] = useState(initialHandsState);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });
    const [allPlayerCards, setAllPlayerCards] = useState([]);

    const updateFrontendEvalTextsInternal = (currentHands) => {
        const updatedHands = { ...currentHands };
        Object.keys(updatedHands).forEach(handKey => {
            const hand = updatedHands[handKey];
            if (hand.limit && hand.cards && Array.isArray(hand.cards)) {
                if (hand.cards.length === hand.limit) {
                    try {
                        const evalResult = evaluateHandSimpleFrontend(hand.cards);
                        hand.evalText = evalResult.name || '未知';
                    } catch (e) {
                        console.error(`Error evaluating ${handKey} frontend:`, e);
                        hand.evalText = '评估出错';
                    }
                } else {
                    hand.evalText = '';
                }
            } else if (hand.limit) {
                 hand.evalText = '';
            }
        });
        return updatedHands;
    };

    const dealNewCards = useCallback(async () => { /* ... (与上一版本相同) ... */ }, []);
    useEffect(() => { dealNewCards(); }, [dealNewCards]);
    const onDragEnd = (result) => { /* ... (与上一版本相同) ... */ };
    const handleSubmitArrangement = async () => { /* ... (与上一版本相同) ... */ };
    const handleAiArrange = () => { /* ... (与上一版本相同) ... */ };
    // const getLoadingText = () => { /* ... (暂时不用) ... */ };


    // --- 修改点：极度简化 return 部分的 JSX ---
    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <div className="game-board">
                <h1>十三水游戏</h1>
                <div className="arranged-hands-area banners-layout">
                    <HandArea droppableId="frontHand" cards={hands.frontHand.cards} title={initialHandsState.frontHand.title} type="front" cardLimit={initialHandsState.frontHand.limit} evaluationText={hands.frontHand.evalText} isBanner={true} />
                    <HandArea droppableId="middleHand" cards={hands.middleHand.cards} title={initialHandsState.middleHand.title} type="middle" cardLimit={initialHandsState.middleHand.limit} evaluationText={hands.middleHand.evalText} isBanner={true} />
                    <HandArea droppableId="backHand" cards={hands.backHand.cards} title={initialHandsState.backHand.title} type="back" cardLimit={initialHandsState.backHand.limit} evaluationText={hands.backHand.evalText} isBanner={true} />
                </div>
                <div className="controls">
                    <button onClick={dealNewCards} disabled={isLoading}>
                        重新发牌
                    </button>
                    <button onClick={handleAiArrange} disabled={isLoading || allPlayerCards.length !== 13}>
                        AI智能分牌
                    </button>
                    <button onClick={handleSubmitArrangement} disabled={isLoading}>
                        确定牌型
                    </button>
                </div>

                {/* 暂时移除 message 和 loading indicator 的条件渲染 */}
                {/* {message.text && !isLoading && (
                    <div className={`message-area ${message.type}`}>
                        {message.text}
                    </div>
                )}
                {isLoading && (
                    <div className="loading-indicator">
                        Placeholder Loading...
                    </div>
                )} */}

                {/* 可以先放一个简单的 message 显示区域，如果需要 */}
                {message.text && (
                     <div className={`message-area ${message.type || 'info'}`}>{message.text}</div>
                )}
                {isLoading && (
                    <div className="loading-indicator">正在加载...</div>
                )}


            </div>
        </DragDropContext>
    );
};

export default GameBoard;
