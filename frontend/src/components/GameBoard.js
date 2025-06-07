// frontend/src/components/GameBoard.js
import React, { useState, useEffect, useCallback } from 'react';
import { DragDropContext } from 'react-beautiful-dnd';
import HandArea from './HandArea'; // 确保这个导入路径正确
import { fetchInitialCards, evaluateArrangement } from '../utils/api'; // 确保这个导入路径正确
import { simpleAiArrangeCards, evaluateHandSimple as evaluateHandSimpleFrontend } from '../utils/thirteenAi'; // 确保这个导入路径正确

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

    // updateFrontendEvalTexts 移到 GameBoard 内部作为辅助函数
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
        setMessage({ text: '', type: '' });
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
                    // throw new Error("API未返回有效的卡片数据。"); // 可以抛出错误或设置消息
                    setMessage({ text: 'API未返回有效的卡片数据。', type: 'error' });
                    setAllPlayerCards([]); // 确保为空
                    setHands(initialHandsState); // 重置
                    setIsLoading(false);
                    return;
                }

                setAllPlayerCards(validCards); 
                let newHandsSetup = { 
                    frontHand: { ...initialHandsState.frontHand, cards: [], evalText: '' },
                    middleHand: { ...initialHandsState.middleHand, cards: [...validCards], evalText: '' }, 
                    backHand: { ...initialHandsState.backHand, cards: [], evalText: '' },
                };
                newHandsSetup = updateFrontendEvalTextsInternal(newHandsSetup); // 使用内部函数
                setHands(newHandsSetup);
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
    }, []); // 移除 updateFrontendEvalTextsInternal，因为它现在在组件作用域内

    useEffect(() => {
        dealNewCards();
    }, [dealNewCards]);

    const onDragEnd = (result) => {
        const { source, destination } = result;
        if (!destination) return;
        const sourceHandId = source.droppableId;
        const destHandId = destination.droppableId;
        if (sourceHandId === destHandId && source.index === destination.index) return;
        
        setHands(prevHands => {
            let newHands = JSON.parse(JSON.stringify(prevHands)); 
            const sourceCards = Array.from(newHands[sourceHandId].cards);
            const destCards = newHands[destHandId].cards ? Array.from(newHands[destHandId].cards) : [];
            const [movedCard] = sourceCards.splice(source.index, 1);
            destCards.splice(destination.index, 0, movedCard);
            newHands[sourceHandId].cards = sourceCards;
            newHands[destHandId].cards = destCards;
            setMessage({ text: '', type: '' }); 
            newHands = updateFrontendEvalTextsInternal(newHands); // 使用内部函数
            return newHands;
        });
    };

    const handleSubmitArrangement = async () => { /* ... (与上次提供的版本相同，这里不再重复) ... */ };

    const handleAiArrange = () => {
        if (!allPlayerCards || !Array.isArray(allPlayerCards) || allPlayerCards.length !== 13) {
            setMessage({ text: 'AI分牌失败：手牌数据无效或不完整。请重新发牌。', type: 'error' });
            console.error("尝试AI分牌时，allPlayerCards 无效:", allPlayerCards);
            return;
        }

        setMessage({ text: 'AI正在尝试分牌...', type: '' });
        setIsLoading(true); 
        
        setTimeout(() => { 
            try {
                const cardsForAi = allPlayerCards.map(c => ({...c})); 
                // console.log("GameBoard: Passing to AI:", JSON.parse(JSON.stringify(cardsForAi.map(c=>c.id))));

                const arrangement = simpleAiArrangeCards(cardsForAi); 

                if (arrangement && arrangement.frontHand && Array.isArray(arrangement.frontHand) &&
                    arrangement.middleHand && Array.isArray(arrangement.middleHand) &&
                    arrangement.backHand && Array.isArray(arrangement.backHand)) {
                    
                    const validateCardsArray = (arrName, arr) => {
                        if (!arr.every(c => c && typeof c.id === 'string' && typeof c.value === 'string' && typeof c.suit === 'string' && typeof c.imageName === 'string')) { // 更严格的类型检查
                            console.error(`AI返回的 ${arrName} 包含无效卡片对象或属性类型错误:`, arr);
                            // 尝试打印出第一个不符合条件的卡片
                            const badCard = arr.find(c => !(c && typeof c.id === 'string' && typeof c.value === 'string' && typeof c.suit === 'string' && typeof c.imageName === 'string'));
                            console.error("Problematic card:", badCard);
                            throw new Error(`AI返回的 ${arrName} 结构或类型错误`); // <-- 这行附近可能是 137 行
                        }
                        return arr;
                    };

                    let newHandsSetup = {
                        frontHand: { ...initialHandsState.frontHand, cards: validateCardsArray("frontHand", arrangement.frontHand), evalText: '' },
                        middleHand: { ...initialHandsState.middleHand, cards: validateCardsArray("middleHand", arrangement.middleHand), evalText: '' },
                        backHand: { ...initialHandsState.backHand, cards: validateCardsArray("backHand", arrangement.backHand), evalText: '' },
                    };
                    
                    newHandsSetup = updateFrontendEvalTextsInternal(newHandsSetup); // 使用内部函数
                    // console.log("GameBoard: Setting hands from AI (validated):", JSON.parse(JSON.stringify(newHandsSetup)));
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
    
    return ( /* ... (JSX 与上次提供的版本相同) ... */ );
};

export default GameBoard;
