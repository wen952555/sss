// frontend/src/components/GameBoard.js
// ... (imports 和 initialHandsState 保持不变) ...
import React, { useState, useEffect, useCallback } from 'react';
import { DragDropContext } from 'react-beautiful-dnd';
import HandArea from './HandArea';
import { fetchInitialCards, evaluateArrangement } from '../utils/api';
import { simpleAiArrangeCards, evaluateHandSimple as evaluateHandSimpleFrontend } from '../utils/thirteenAi';

const initialHandsState = { /* ... */ };

const GameBoard = () => {
    const [hands, setHands] = useState(initialHandsState);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });
    const [allPlayerCards, setAllPlayerCards] = useState([]); 

    const updateFrontendEvalTexts = (currentHands) => {
        const updatedHands = { ...currentHands };
        Object.keys(updatedHands).forEach(handKey => {
            const hand = updatedHands[handKey];
            if (hand.limit && hand.cards && Array.isArray(hand.cards)) { // 增加对 hand.cards 的检查
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
            } else if (hand.limit) { // 如果 hand.cards 不存在或不是数组，清空 evalText
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
            if (data && Array.isArray(data.cards) && data.cards.length > 0) { // 确保 cards 是非空数组
                // --- 修改点：确保 data.cards 里的每个对象都是有效的卡片结构 ---
                const validCards = data.cards.filter(c => c && c.id && c.value && c.suit && c.imageName);
                if (validCards.length !== data.cards.length) {
                    console.warn("API返回的牌数据中包含无效卡片对象，已过滤。");
                }
                if (validCards.length === 0) {
                    throw new Error("API未返回有效的卡片数据。");
                }

                setAllPlayerCards(validCards); 
                let newHandsSetup = { 
                    frontHand: { ...initialHandsState.frontHand, cards: [], evalText: '' },
                    middleHand: { ...initialHandsState.middleHand, cards: [...validCards], evalText: '' }, 
                    backHand: { ...initialHandsState.backHand, cards: [], evalText: '' },
                };
                newHandsSetup = updateFrontendEvalTexts(newHandsSetup); 
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
    }, []); // 移除了 updateFrontendEvalTexts，因为它现在是组件内的纯函数

    useEffect(() => {
        dealNewCards();
    }, [dealNewCards]);

    const onDragEnd = (result) => { /* ... (与上一版本相同，确保调用 updateFrontendEvalTexts) ... */ };
    const handleSubmitArrangement = async () => { /* ... (与上一版本相同) ... */ };

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
                const cardsForAi = allPlayerCards.map(c => ({...c})); // 传递副本
                console.log("GameBoard: Passing to AI:", JSON.parse(JSON.stringify(cardsForAi.map(c=>c.id))));

                const arrangement = simpleAiArrangeCards(cardsForAi); 

                if (arrangement && arrangement.frontHand && Array.isArray(arrangement.frontHand) &&
                    arrangement.middleHand && Array.isArray(arrangement.middleHand) &&
                    arrangement.backHand && Array.isArray(arrangement.backHand)) {
                    
                    // --- 修改点：在设置状态前，再次验证AI返回的卡片对象是否包含必要属性 ---
                    const validateCardsArray = (arrName, arr) => {
                        if (!arr.every(c => c && c.id && c.value && c.suit && c.imageName)) {
                            console.error(`AI返回的 ${arrName} 包含无效卡片对象:`, arr);
                            throw new Error(`AI返回的 ${arrName} 结构错误`);
                        }
                        return arr;
                    };

                    let newHandsSetup = {
                        frontHand: { ...initialHandsState.frontHand, cards: validateCardsArray("frontHand", arrangement.frontHand), evalText: '' },
                        middleHand: { ...initialHandsState.middleHand, cards: validateCardsArray("middleHand", arrangement.middleHand), evalText: '' },
                        backHand: { ...initialHandsState.backHand, cards: validateCardsArray("backHand", arrangement.backHand), evalText: '' },
                    };
                    
                    newHandsSetup = updateFrontendEvalTexts(newHandsSetup); 
                    console.log("GameBoard: Setting hands from AI (validated):", JSON.parse(JSON.stringify(newHandsSetup)));
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
    
    return ( /* ... (JSX 与上一版本相同) ... */ );
};

export default GameBoard;
