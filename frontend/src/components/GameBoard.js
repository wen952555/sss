// frontend/src/components/GameBoard.js
import React, { useState, useEffect, useCallback } from 'react';
import { DragDropContext } from 'react-beautiful-dnd';
import HandArea from './HandArea';
import { fetchInitialCards, evaluateArrangement } from '../utils/api'; // evaluateArrangement 会被 handleSubmitArrangement 使用
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
        setMessage({ text: '正在发牌...', type: '' }); 
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
    }, []); 

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
            newHands = updateFrontendEvalTextsInternal(newHands); 
            return newHands;
        });
    };

    // --- 修改点：恢复 handleSubmitArrangement 的完整函数体 ---
    const handleSubmitArrangement = async () => { 
        setMessage({ text: '正在检查牌型...', type: '' }); // 设置初始加载消息
        const { frontHand, middleHand, backHand } = hands;
        const totalCardsInDuns = frontHand.cards.length + middleHand.cards.length + backHand.cards.length;
        
        if (totalCardsInDuns !== 13) {
             setMessage({ text: `总牌数应为13张，当前已分配 ${totalCardsInDuns} 张。请确保所有13张牌都在墩中。`, type: 'error' });
             return;
        }
        if (frontHand.cards.length !== 3) {
            setMessage({ text: `前墩需要 3 张牌，当前有 ${frontHand.cards.length} 张。`, type: 'error' });
            return;
        }
        if (middleHand.cards.length !== 5) {
            setMessage({ text: `中墩需要 5 张牌，当前有 ${middleHand.cards.length} 张。`, type: 'error' });
            return;
        }
        if (backHand.cards.length !== 5) {
            setMessage({ text: `后墩需要 5 张牌，当前有 ${backHand.cards.length} 张。`, type: 'error' });
            return;
        }
        setIsLoading(true);
        try {
            const prepareHandForApi = (cardArray) => cardArray.map(c => ({
                id: c.id, suit: c.suit, value: c.value, rankValue: c.rankValue, imageName: c.imageName 
            }));
            // 调用导入的 evaluateArrangement
            const result = await evaluateArrangement(
                prepareHandForApi(frontHand.cards),
                prepareHandForApi(middleHand.cards),
                prepareHandForApi(backHand.cards)
            );
            if (result.success) {
                setMessage({ text: result.validation.message, type: result.validation.isValid ? 'success' : 'error' });
                // 最终牌型以后端为准
                setHands(prev => ({
                    ...prev,
                    frontHand: {...prev.frontHand, evalText: result.evaluations.front.type_name },
                    middleHand: {...prev.middleHand, evalText: result.evaluations.middle.type_name },
                    backHand: {...prev.backHand, evalText: result.evaluations.back.type_name },
                }));
            } else {
                setMessage({ text: result.message || '牌型评估失败，请检查后端服务。', type: 'error' });
            }
        } catch (error) {
            console.error("评估牌型出错:", error);
            setMessage({ text: `评估出错: ${error.message}`, type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleAiArrange = () => { /* ... (与上一版本相同) ... */ };
    
    const getLoadingText = () => { /* ... (与上一版本相同) ... */ };

    return ( /* ... (JSX 与上一版本相同) ... */ );
};

export default GameBoard;
