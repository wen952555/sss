// frontend/src/components/GameBoard.js
import React, { useState, useEffect, useCallback } from 'react';
import { DragDropContext } from 'react-beautiful-dnd';
import HandArea from './HandArea';
import { fetchInitialCards, evaluateArrangement } from '../utils/api';
import { smartAiArrangeCards, evaluateHandSimple as evaluateHandSimpleFrontend } from '../utils/thirteenAi'; // 使用新的AI

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
            } else if (hand.limit) { // Ensure evalText is cleared if cards is not an array
                 hand.evalText = '';
            }
        });
        return updatedHands;
    };

    const dealNewCards = useCallback(async () => {
        setIsLoading(true);
        setMessage({ text: '正在发牌...', type: '' });
        setAllPlayerCards([]);
        setHands(initialHandsState);
        try {
            const data = await fetchInitialCards();
            if (data && Array.isArray(data.cards) && data.cards.length > 0) {
                const validCards = data.cards.filter(c => c && typeof c.id === 'string' && typeof c.value === 'string' && typeof c.suit === 'string' && typeof c.imageName === 'string');
                if (validCards.length !== data.cards.length) {
                    console.warn("API返回的牌数据中包含无效卡片对象，已过滤。");
                }
                if (validCards.length === 0) {
                    setMessage({ text: 'API未返回有效的卡片数据。', type: 'error' });
                    setAllPlayerCards([]);
                    setHands(initialHandsState);
                    // setIsLoading(false); // finally will handle
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
                setMessage({ text: '', type: '' });
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
    }, []); // updateFrontendEvalTextsInternal is stable within component scope

    useEffect(() => {
        dealNewCards();
    }, [dealNewCards]);

    const onDragEnd = (result) => { /* ... (与上一个修复 TypeError 的版本相同) ... */ };
    const handleSubmitArrangement = async () => { /* ... (与上一个修复 no-unused-vars 的版本相同) ... */ };

    const handleAiArrange = () => {
        if (!allPlayerCards || !Array.isArray(allPlayerCards) || allPlayerCards.length !== 13) {
            setMessage({ text: 'AI分牌失败：手牌数据无效或不完整。请重新发牌。', type: 'error' });
            console.error("尝试AI分牌时，allPlayerCards 无效:", allPlayerCards);
            return;
        }
        setMessage({ text: 'AI智能计算中...', type: '' });
        setIsLoading(true);
        setTimeout(() => {
            try {
                const cardsForAi = allPlayerCards.map(c => ({...c}));
                const arrangement = smartAiArrangeCards(cardsForAi); // 使用 smartAiArrangeCards

                if (arrangement && arrangement.frontHand && Array.isArray(arrangement.frontHand) &&
                    arrangement.middleHand && Array.isArray(arrangement.middleHand) &&
                    arrangement.backHand && Array.isArray(arrangement.backHand)) {
                    
                    const validateCardsArray = (arrName, arr) => {
                        if (!arr.every(c => c && typeof c.id === 'string' && typeof c.value === 'string' && typeof c.suit === 'string' && typeof c.imageName === 'string')) {
                            console.error(`AI返回的 ${arrName} 包含无效卡片对象或属性类型错误:`, arr);
                            const badCard = arr.find(c => !(c && typeof c.id === 'string' && typeof c.value === 'string' && typeof c.suit === 'string' && typeof c.imageName === 'string'));
                            console.error("Problematic card in AI result:", badCard);
                            throw new Error(`AI返回的 ${arrName} 结构或类型错误`);
                        }
                        return arr;
                    };

                    // --- 仔细检查这里的对象字面量语法 ---
                    let newHandsSetup = {
                        frontHand: { 
                            ...initialHandsState.frontHand, 
                            cards: validateCardsArray("frontHand", arrangement.frontHand), 
                            evalText: '' 
                        }, // 确保逗号正确
                        middleHand: { 
                            ...initialHandsState.middleHand, 
                            cards: validateCardsArray("middleHand", arrangement.middleHand), 
                            evalText: '' 
                        }, // 确保逗号正确
                        backHand: { 
                            ...initialHandsState.backHand, 
                            cards: validateCardsArray("backHand", arrangement.backHand), 
                            evalText: '' 
                        }  // 对象最后一个属性后没有逗号
                    }; // 对象定义结束
                    
                    newHandsSetup = updateFrontendEvalTextsInternal(newHandsSetup);
                    // console.log("GameBoard: Setting hands from AI (validated):", JSON.parse(JSON.stringify(newHandsSetup)));
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
    
    const getLoadingText = () => { /* ... (与上一版本相同) ... */ };

    return ( /* ... (JSX 与上一版本相同) ... */ );
};

export default GameBoard;
