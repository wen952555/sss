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

    const updateFrontendEvalTexts = (currentHands) => {
        const updatedHands = { ...currentHands };
        Object.keys(updatedHands).forEach(handKey => {
            const hand = updatedHands[handKey];
            if (hand.limit) { 
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
            }
        });
        return updatedHands;
    };

    const dealNewCards = useCallback(async () => {
        setIsLoading(true);
        setMessage({ text: '', type: '' });
        setAllPlayerCards([]); 
        try {
            const data = await fetchInitialCards();
            if (data && data.cards) {
                setAllPlayerCards(data.cards); 
                let newHandsSetup = { 
                    frontHand: { ...initialHandsState.frontHand, cards: [], evalText: '' },
                    middleHand: { ...initialHandsState.middleHand, cards: data.cards, evalText: '' },
                    backHand: { ...initialHandsState.backHand, cards: [], evalText: '' },
                };
                newHandsSetup = updateFrontendEvalTexts(newHandsSetup); // 发牌后也尝试预览
                setHands(newHandsSetup);
            } else {
                console.error("从服务器获取的牌数据格式无效:", data);
                setMessage({ text: '无法从服务器获取牌局数据，请稍后再试。', type: 'error' });
                setHands(initialHandsState);
            }
        } catch (error) {
            console.error("获取牌局失败:", error);
            setMessage({ text: `获取牌局失败: ${error.message}`, type: 'error' });
        } finally {
            setIsLoading(false);
        }
    }, []); // useCallback 依赖项为空

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
            newHands = updateFrontendEvalTexts(newHands); // 拖拽结束后更新预览
            return newHands;
        });
    };

    const handleSubmitArrangement = async () => { /* ... (与上次提供的版本相同，这里不再重复) ... */ };

    const handleAiArrange = () => {
        if (allPlayerCards.length !== 13) {
            setMessage({ text: '请先发牌，获得13张手牌后再使用AI分牌。', type: 'error' });
            return;
        }
        setMessage({ text: 'AI正在尝试分牌...', type: '' });
        setIsLoading(true); 
        
        setTimeout(() => { 
            try {
                const arrangement = simpleAiArrangeCards(allPlayerCards); 
                if (arrangement && arrangement.frontHand && arrangement.middleHand && arrangement.backHand) {
                    let newHandsSetup = {
                        frontHand: { ...initialHandsState.frontHand, cards: arrangement.frontHand, evalText: '' },
                        middleHand: { ...initialHandsState.middleHand, cards: arrangement.middleHand, evalText: '' },
                        backHand: { ...initialHandsState.backHand, cards: arrangement.backHand, evalText: '' },
                    };
                    newHandsSetup = updateFrontendEvalTexts(newHandsSetup); // AI分牌后更新预览
                    setHands(newHandsSetup); 
                    setMessage({ text: 'AI分牌完成！请检查。', type: 'success' });
                } else {
                    console.error("AI分牌返回了无效的arrangement结构:", arrangement);
                    setMessage({ text: 'AI分牌失败或返回结果异常，请手动摆牌。', type: 'error' });
                }
            } catch (aiError) {
                console.error("AI 分牌或后续处理时发生错误:", aiError);
                setMessage({ text: 'AI分牌时出现内部错误。', type: 'error' });
            } finally {
                setIsLoading(false);
            }
        }, 50); 
    };
    
    return ( /* ... (JSX 与上次提供的版本相同，这里不再重复) ... */ );
};

export default GameBoard;
