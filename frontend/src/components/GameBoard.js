// frontend/src/components/GameBoard.js
import React, { useState, useEffect, useCallback } from 'react';
import { DragDropContext } from 'react-beautiful-dnd';
import HandArea from './HandArea';
import { fetchInitialCards, evaluateArrangement } from '../utils/api';
// --- 修改点：导入新的AI函数 ---
import { smartAiArrangeCards, evaluateHandSimple as evaluateHandSimpleFrontend } from '../utils/thirteenAi';

const initialHandsState = { /* ... (与上一版本相同) ... */ };

const GameBoard = () => {
    // ... (useState, updateFrontendEvalTextsInternal, dealNewCards, useEffect, onDragEnd, handleSubmitArrangement 与上一版本相同) ...
    const [hands, setHands] = useState(initialHandsState);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });
    const [allPlayerCards, setAllPlayerCards] = useState([]);
    const updateFrontendEvalTextsInternal = (currentHands) => { /* ... */ };
    const dealNewCards = useCallback(async () => { /* ... */ }, []);
    useEffect(() => { dealNewCards(); }, [dealNewCards]);
    const onDragEnd = (result) => { /* ... */ };
    const handleSubmitArrangement = async () => { /* ... */ };


    const handleAiArrange = () => {
        if (!allPlayerCards || !Array.isArray(allPlayerCards) || allPlayerCards.length !== 13) {
            setMessage({ text: 'AI分牌失败：手牌数据无效或不完整。请重新发牌。', type: 'error' });
            console.error("尝试AI分牌时，allPlayerCards 无效:", allPlayerCards);
            return;
        }

        setMessage({ text: 'AI智能计算中...', type: '' }); // 更新提示文本
        setIsLoading(true); 
        
        setTimeout(() => { 
            try {
                const cardsForAi = allPlayerCards.map(c => ({...c})); 
                console.log("GameBoard: Passing to AI:", cardsForAi.map(c=>c.id));

                // --- 修改点：调用新的AI函数 ---
                const arrangement = smartAiArrangeCards(cardsForAi); 

                if (arrangement && arrangement.frontHand && Array.isArray(arrangement.frontHand) &&
                    arrangement.middleHand && Array.isArray(arrangement.middleHand) &&
                    arrangement.backHand && Array.isArray(arrangement.backHand)) {
                    
                    const validateCardsArray = (arrName, arr) => { /* ... (与上一版本相同) ... */ };

                    let newHandsSetup = {
                        frontHand: { ...initialHandsState.frontHand, cards: validateCardsArray("frontHand", arrangement.frontHand), evalText: '' },
                        middleHand: { ...initialHandsState.middleHand, cards: validateCardsArray("middleHand", arrangement.middleHand), evalText: '' },
                        backHand: { ...initialHandsState.backHand, cards: validateCardsArray("backHand", arrangement.backHand), evalText: '' },
                    };
                    
                    newHandsSetup = updateFrontendEvalTextsInternal(newHandsSetup); 
                    console.log("GameBoard: Setting hands from AI (validated):", newHandsSetup);
                    setHands(newHandsSetup); 
                    setMessage({ text: 'AI智能分牌完成！请检查。', type: 'success' });
                } else {
                    console.error("AI智能分牌返回了无效的arrangement结构或null:", arrangement);
                    setMessage({ text: 'AI智能分牌未能生成有效排列，请手动摆牌。', type: 'error' });
                }
            } catch (aiError) {
                console.error("AI智能分牌或后续处理时发生错误 (GameBoard catch):", aiError.message, aiError.stack);
                setMessage({ text: `AI智能分牌时出现内部错误: ${aiError.message}`, type: 'error' });
            } finally {
                setIsLoading(false);
            }
        }, 50); 
    };
    
    // --- 修改点：更新 getLoadingText 中的文本以匹配新的 AI 提示 ---
    const getLoadingText = () => {
        if (isLoading) {
            if (message.text.includes('发牌')) return '正在发牌...';
            if (message.text.includes('AI智能计算中')) return 'AI智能计算中...'; // 更新文本
            if (message.text.includes('检查牌型')) return '正在检查牌型...';
            return '加载中...';
        }
        return '';
    };

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
                        {isLoading && message.text.includes('发牌') ? '正在发牌...' : '重新发牌'}
                    </button>
                    <button onClick={handleAiArrange} disabled={isLoading || allPlayerCards.length !== 13}>
                        {/* --- 修改点：更新按钮加载文本 --- */}
                        {isLoading && message.text.includes('AI智能计算中') ? 'AI计算中...' : 'AI智能分牌'} 
                    </button>
                    <button onClick={handleSubmitArrangement} disabled={isLoading}>
                        {isLoading && message.text.includes('检查牌型') ? '正在检查...' : '确定牌型'}
                    </button>
                </div>
                {message.text && !isLoading && (
                    <div className={`message-area ${message.type}`}>
                        {message.text}
                    </div>
                )}
                {isLoading && (
                    <div className="loading-indicator">
                        {getLoadingText()}
                    </div>
                )}
            </div>
        </DragDropContext>
    );
};

export default GameBoard;
