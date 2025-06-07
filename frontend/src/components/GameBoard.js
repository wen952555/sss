// frontend/src/components/GameBoard.js
import React, { useState, useEffect, useCallback } from 'react';
import { DragDropContext } from 'react-beautiful-dnd';
import HandArea from './HandArea';
import { fetchInitialCards, evaluateArrangement } from '../utils/api'; // 这些现在会被调用
// --- 修改点：确保导入的是 smartAiArrangeCards ---
import { smartAiArrangeCards, evaluateHandSimple as evaluateHandSimpleFrontend } from '../utils/thirteenAi';

const initialHandsState = { /* ... (与上一版本相同) ... */ };

const GameBoard = () => {
    const [hands, setHands] = useState(initialHandsState);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });
    const [allPlayerCards, setAllPlayerCards] = useState([]); // 这个 state 会被使用

    const updateFrontendEvalTextsInternal = (currentHands) => { /* ... (与上一版本相同) ... */ };

    const dealNewCards = useCallback(async () => {
        setIsLoading(true);
        setMessage({ text: '正在发牌...', type: '' }); 
        setAllPlayerCards([]); // 使用了 setAllPlayerCards
        setHands(initialHandsState); 
        try {
            const data = await fetchInitialCards(); // 使用了 fetchInitialCards
            if (data && Array.isArray(data.cards) && data.cards.length > 0) { 
                const validCards = data.cards.filter(c => c && c.id && c.value && c.suit && c.imageName);
                if (validCards.length !== data.cards.length) { console.warn("API返回的牌数据中包含无效卡片对象，已过滤。"); }
                if (validCards.length === 0) {
                    setMessage({ text: 'API未返回有效的卡片数据。', type: 'error' });
                    setAllPlayerCards([]); 
                    setHands(initialHandsState); 
                    setIsLoading(false); return;
                }
                setAllPlayerCards(validCards); // 使用了 setAllPlayerCards
                let newHandsSetup = { 
                    frontHand: { ...initialHandsState.frontHand, cards: [], evalText: '' },
                    middleHand: { ...initialHandsState.middleHand, cards: [...validCards], evalText: '' }, 
                    backHand: { ...initialHandsState.backHand, cards: [], evalText: '' },
                };
                newHandsSetup = updateFrontendEvalTextsInternal(newHandsSetup); // evaluateHandSimpleFrontend 在这里被间接调用
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

    const onDragEnd = (result) => { /* ... (与上一版本相同，确保调用 updateFrontendEvalTextsInternal) ... */ };

    // --- 修改点：恢复 handleSubmitArrangement 的完整函数体，它调用 evaluateArrangement ---
    const handleSubmitArrangement = async () => { 
        setMessage({ text: '正在检查牌型...', type: '' }); 
        const { frontHand, middleHand, backHand } = hands;
        const totalCardsInDuns = frontHand.cards.length + middleHand.cards.length + backHand.cards.length;
        if (totalCardsInDuns !== 13) { setMessage({ text: `总牌数应为13张，当前已分配 ${totalCardsInDuns} 张。请确保所有13张牌都在墩中。`, type: 'error' }); return; }
        if (frontHand.cards.length !== 3) { setMessage({ text: `前墩需要 3 张牌，当前有 ${frontHand.cards.length} 张。`, type: 'error' }); return; }
        if (middleHand.cards.length !== 5) { setMessage({ text: `中墩需要 5 张牌，当前有 ${middleHand.cards.length} 张。`, type: 'error' }); return; }
        if (backHand.cards.length !== 5) { setMessage({ text: `后墩需要 5 张牌，当前有 ${backHand.cards.length} 张。`, type: 'error' }); return; }
        setIsLoading(true);
        try {
            const prepareHandForApi = (cardArray) => cardArray.map(c => ({ id: c.id, suit: c.suit, value: c.value, rankValue: c.rankValue, imageName: c.imageName }));
            const result = await evaluateArrangement( // <--- 调用 evaluateArrangement
                prepareHandForApi(frontHand.cards),
                prepareHandForApi(middleHand.cards),
                prepareHandForApi(backHand.cards)
            );
            if (result.success) {
                setMessage({ text: result.validation.message, type: result.validation.isValid ? 'success' : 'error' });
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
                const arrangement = smartAiArrangeCards(cardsForAi); // <--- 调用 smartAiArrangeCards

                if (arrangement && arrangement.frontHand && Array.isArray(arrangement.frontHand) &&
                    arrangement.middleHand && Array.isArray(arrangement.middleHand) &&
                    arrangement.backHand && Array.isArray(arrangement.backHand)) {
                    const validateCardsArray = (arrName, arr) => { /* ... (与上一版本相同) ... */ };
                    let newHandsSetup = {
                        frontHand: { ...initialHandsState.frontHand, cards: validateCardsArray("frontHand", arrangement.frontHand), evalText: '' },
                        middleHand: { ...initialHandsState.middleHand, cards: validateCardsArray("middleHand", arrangement.middleHand), evalText: '' },
                        backHand: { ...initialHandsState.backHand, cards: validateCardsArray("backHand", arrangement.backHand), evalText: '' },
                    };
                    newHandsSetup = updateFrontendEvalTextsInternal(newHandsSetup); // evaluateHandSimpleFrontend 在这里被间接调用
                    setHands(newHandsSetup); 
                    setMessage({ text: 'AI智能分牌完成！请检查。', type: 'success' });
                } else { /* ... */ }
            } catch (aiError) { /* ... */ }
            finally { setIsLoading(false); }
        }, 50); 
    };
    
    const getLoadingText = () => { /* ... (与上一版本相同) ... */ };
    return ( /* ... (JSX 与上一版本相同) ... */ );
};
export default GameBoard;
