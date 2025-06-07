// frontend/src/components/GameBoard.js
import React, { useState, useEffect, useCallback } from 'react';
import { DragDropContext } from 'react-beautiful-dnd';
import HandArea from './HandArea';
import { fetchInitialCards, evaluateArrangement } from '../utils/api';
import { simpleAiArrangeCards } from '../utils/thirteenAi'; // 引入AI分牌函数

// ... (initialHandsState 保持不变)
const initialHandsState = {
    frontHand: { id: 'frontHand', title: '前墩', cards: [], limit: 3, evalText: '' }, 
    middleHand: { id: 'middleHand', title: '中墩', cards: [], limit: 5, evalText: '' },
    backHand: { id: 'backHand', title: '后墩', cards: [], limit: 5, evalText: '' },
};

const GameBoard = () => {
    // ... (useState, dealNewCards, useEffect, onDragEnd, handleSubmitArrangement 保持不变)
    const [hands, setHands] = useState(initialHandsState);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });
    const [allPlayerCards, setAllPlayerCards] = useState([]); // 新增：存储当前玩家的13张手牌

    const dealNewCards = useCallback(async () => {
        setIsLoading(true);
        setMessage({ text: '', type: '' });
        setAllPlayerCards([]); // 清空之前的牌
        try {
            const data = await fetchInitialCards();
            if (data && data.cards) {
                setAllPlayerCards(data.cards); // 存储原始13张牌
                setHands({ // 默认放中墩
                    frontHand: { ...initialHandsState.frontHand, cards: [], evalText: '' },
                    middleHand: { ...initialHandsState.middleHand, cards: data.cards, evalText: '' },
                    backHand: { ...initialHandsState.backHand, cards: [], evalText: '' },
                });
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
    }, []);

    useEffect(() => {
        dealNewCards();
    }, [dealNewCards]);

    const onDragEnd = (result) => {
        // ... (保持不变)
        const { source, destination } = result;
        if (!destination) return;
        const sourceHandId = source.droppableId;
        const destHandId = destination.droppableId;
        if (sourceHandId === destHandId && source.index === destination.index) return;
        setHands(prevHands => {
            const newHands = JSON.parse(JSON.stringify(prevHands)); 
            const sourceCards = Array.from(newHands[sourceHandId].cards);
            const destCards = newHands[destHandId].cards ? Array.from(newHands[destHandId].cards) : [];
            const [movedCard] = sourceCards.splice(source.index, 1);
            destCards.splice(destination.index, 0, movedCard);
            newHands[sourceHandId].cards = sourceCards;
            newHands[destHandId].cards = destCards;
            setMessage({ text: '', type: '' }); 
            newHands.frontHand.evalText = '';
            newHands.middleHand.evalText = '';
            newHands.backHand.evalText = '';
            return newHands;
        });
    };

    const handleSubmitArrangement = async () => {
        // ... (保持不变)
        setMessage({ text: '', type: '' }); 
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
            const result = await evaluateArrangement(
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

    // 新增：AI分牌按钮点击事件
    const handleAiArrange = () => {
        if (allPlayerCards.length !== 13) {
            setMessage({ text: '请先发牌，获得13张手牌后再使用AI分牌。', type: 'error' });
            return;
        }
        setMessage({ text: 'AI正在尝试分牌...', type: '' });
        const arrangement = simpleAiArrangeCards(allPlayerCards); // 使用原始13张牌进行AI计算
        if (arrangement) {
            setHands({
                frontHand: { ...initialHandsState.frontHand, cards: arrangement.frontHand, evalText: '' },
                middleHand: { ...initialHandsState.middleHand, cards: arrangement.middleHand, evalText: '' },
                backHand: { ...initialHandsState.backHand, cards: arrangement.backHand, evalText: '' },
            });
            setMessage({ text: 'AI分牌完成！请检查并确认牌型。', type: 'success' });
        } else {
            setMessage({ text: 'AI分牌失败，请手动摆牌或重试。', type: 'error' });
        }
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
                        {isLoading ? '正在发牌...' : '重新发牌'}
                    </button>
                    {/* 新增AI分牌按钮 */}
                    <button onClick={handleAiArrange} disabled={isLoading || allPlayerCards.length !== 13}>
                        AI分牌
                    </button>
                    <button onClick={handleSubmitArrangement} disabled={isLoading}>
                        {isLoading ? '正在检查...' : '确定牌型'}
                    </button>
                </div>

                {message.text && (
                    <div className={`message-area ${message.type}`}>
                        {message.text}
                    </div>
                )}
                {isLoading && !message.text && <div className="loading-indicator">加载中...</div>}
            </div>
        </DragDropContext>
    );
};

export default GameBoard;
