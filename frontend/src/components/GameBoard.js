// frontend/src/components/GameBoard.js
import React, { useState, useEffect, useCallback } from 'react';
import { DragDropContext } from 'react-beautiful-dnd';
import HandArea from './HandArea';
import { fetchInitialCards, evaluateArrangement } from '../utils/api';
import { simpleAiArrangeCards, evaluateHandSimple as evaluateHandSimpleFrontend } from '../utils/thirteenAi';

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

    const dealNewCards = useCallback(async () => {
        setIsLoading(true);
        setMessage({ text: '正在发牌...', type: '' }); // 设置初始加载消息
        setAllPlayerCards([]);
        setHands(initialHandsState);
        try {
            const data = await fetchInitialCards();
            if (data && Array.isArray(data.cards) && data.cards.length > 0) {
                const validCards = data.cards.filter(c => c && c.id && c.value && c.suit && c.imageName);
                if (validCards.length !== data.cards.length) {
                    console.warn("API返回的牌数据中包含无效卡片对象，已过滤。");
                }
                if (validCards.length === 0) {
                    setMessage({ text: 'API未返回有效的卡片数据。', type: 'error' });
                    setAllPlayerCards([]);
                    setHands(initialHandsState);
                    setIsLoading(false);
                    return;
                }
                setAllPlayerCards(validCards);
                let newHandsSetup = {
                    frontHand: { ...initialHandsState.frontHand, cards: [], evalText: '' },
                    middleHand: { ...initialHandsState.middleHand, cards: [...validCards], evalText: '' },
                    backHand: { ...initialHandsState.backHand, cards: [], evalText: '' },
                };
                newHandsSetup = updateFrontendEvalTextsInternal(newHandsSetup);
                setHands(newHandsSetup);
                setMessage({ text: '', type: '' }); // 清除加载消息
            } else {
                console.error("从服务器获取的牌数据格式无效、非数组或为空:", data);
                setMessage({ text: '无法从服务器获取有效牌局数据，请稍后再试。', type: 'error' });
            }
        } catch (error) {
            console.error("获取牌局失败:", error);
            setMessage({ text: `获取牌局失败: ${error.message}`, type: 'error' });
        } finally {
            setIsLoading(false);
        }
    }, []); // 移除 updateFrontendEvalTextsInternal，因为它在组件作用域内

    useEffect(() => {
        dealNewCards();
    }, [dealNewCards]);

    const onDragEnd = (result) => { /* ... (与上一个版本相同，确保调用 updateFrontendEvalTextsInternal) ... */ };
    const handleSubmitArrangement = async () => { /* ... (与上一个版本相同) ... */ };

    const handleAiArrange = () => {
        if (!allPlayerCards || !Array.isArray(allPlayerCards) || allPlayerCards.length !== 13) {
            setMessage({ text: 'AI分牌失败：手牌数据无效或不完整。请重新发牌。', type: 'error' });
            console.error("尝试AI分牌时，allPlayerCards 无效:", allPlayerCards);
            return;
        }
        setMessage({ text: 'AI计算中...', type: '' }); // 更改消息以匹配按钮
        setIsLoading(true);
        setTimeout(() => {
            try {
                const cardsForAi = allPlayerCards.map(c => ({...c}));
                const arrangement = simpleAiArrangeCards(cardsForAi);
                if (arrangement && arrangement.frontHand && Array.isArray(arrangement.frontHand) &&
                    arrangement.middleHand && Array.isArray(arrangement.middleHand) &&
                    arrangement.backHand && Array.isArray(arrangement.backHand)) {
                    const validateCardsArray = (arrName, arr) => {
                        if (!arr.every(c => c && typeof c.id === 'string' && typeof c.value === 'string' && typeof c.suit === 'string' && typeof c.imageName === 'string')) {
                            console.error(`AI返回的 ${arrName} 包含无效卡片对象或属性类型错误:`, arr);
                            const badCard = arr.find(c => !(c && typeof c.id === 'string' && typeof c.value === 'string' && typeof c.suit === 'string' && typeof c.imageName === 'string'));
                            console.error("Problematic card:", badCard);
                            throw new Error(`AI返回的 ${arrName} 结构或类型错误`);
                        }
                        return arr;
                    };
                    let newHandsSetup = {
                        frontHand: { ...initialHandsState.frontHand, cards: validateCardsArray("frontHand", arrangement.frontHand), evalText: '' },
                        middleHand: { ...initialHandsState.middleHand, cards: validateCardsArray("middleHand", arrangement.middleHand), evalText: '' },
                        backHand: { ...initialHandsState.backHand, cards: validateCardsArray("backHand", arrangement.backHand), evalText: '' },
                    };
                    newHandsSetup = updateFrontendEvalTextsInternal(newHandsSetup);
                    setHands(newHandsSetup);
                    setMessage({ text: 'AI分牌完成！请检查。', type: 'success' });
                } else {
                    console.error("AI分牌返回了无效的arrangement结构或null:", arrangement);
                    setMessage({ text: 'AI分牌未能生成有效排列，请手动摆牌。', type: 'error' });
                }
            } catch (aiError) {
                console.error("AI 分牌或后续处理时发生错误 (GameBoard catch):", aiError.message, aiError.stack);
                setMessage({ text: `AI分牌时出现内部错误: ${aiError.message}`, type: 'error' });
            } finally {
                setIsLoading(false);
            }
        }, 50);
    };

    // --- 修改点：简化 loading-indicator 内部的条件渲染 ---
    const getLoadingText = () => {
        if (isLoading) {
            if (message.text.includes('发牌')) return '正在发牌...';
            if (message.text.includes('AI')) return 'AI计算中...';
            if (message.text.includes('检查')) return '正在检查牌型...';
            return '加载中...';
        }
        return ''; // 如果不isLoading，返回空字符串
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
                        {isLoading && message.text.includes('AI') ? 'AI计算中...' : 'AI分牌'}
                    </button>
                    <button onClick={handleSubmitArrangement} disabled={isLoading}>
                        {isLoading && message.text.includes('检查') ? '正在检查...' : '确定牌型'}
                    </button>
                </div>
                {message.text && !isLoading && (
                    <div className={`message-area ${message.type}`}>
                        {message.text}
                    </div>
                )}
                {/* 第 168 行附近 */}
                {isLoading && (
                    <div className="loading-indicator">
                        {getLoadingText()} {/* 调用辅助函数获取文本 */}
                    </div>
                )}
            </div>
        </DragDropContext>
    );
};

export default GameBoard;
