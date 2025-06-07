// frontend/src/components/GameBoard.js
import React, { useState, useEffect, useCallback } from 'react';
import { DragDropContext } from 'react-beautiful-dnd';
import HandArea from './HandArea';
import { fetchInitialCards, evaluateArrangement } from '../utils/api';

// 中文化牌墩标题
const initialHandsState = {
    playerPool: { id: 'playerPool', title: '我的手牌', cards: [] },
    frontHand: { id: 'frontHand', title: '前墩', cards: [], limit: 3, evalText: '' },
    middleHand: { id: 'middleHand', title: '中墩', cards: [], limit: 5, evalText: '' },
    backHand: { id: 'backHand', title: '后墩', cards: [], limit: 5, evalText: '' },
};

const GameBoard = () => {
    const [hands, setHands] = useState(initialHandsState);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' }); // type: 'success' or 'error'

    const dealNewCards = useCallback(async () => {
        setIsLoading(true);
        setMessage({ text: '', type: '' });
        try {
            const data = await fetchInitialCards();
            if (data && data.cards) {
                setHands({
                    playerPool: { ...initialHandsState.playerPool, cards: data.cards },
                    frontHand: { ...initialHandsState.frontHand, cards: [], evalText: '' },
                    middleHand: { ...initialHandsState.middleHand, cards: [], evalText: '' },
                    backHand: { ...initialHandsState.backHand, cards: [], evalText: '' },
                });
            } else {
                // 如果后端返回的数据不符合预期，或者根本没有 cards 字段
                console.error("从服务器获取的牌数据格式无效:", data);
                setMessage({ text: '无法从服务器获取牌局数据，请稍后再试。', type: 'error' });
                // 可以选择设置一个空的手牌或保留旧手牌
                setHands(prev => ({
                    ...prev,
                    playerPool: { ...initialHandsState.playerPool, cards: [] }, // 清空手牌
                }));
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
            const newHands = JSON.parse(JSON.stringify(prevHands)); 
            const sourceCards = Array.from(newHands[sourceHandId].cards);
            const destCards = Array.from(newHands[destHandId].cards);
            const [movedCard] = sourceCards.splice(source.index, 1);

            if (newHands[destHandId].limit && destCards.length >= newHands[destHandId].limit) {
                setMessage({ text: `${newHands[destHandId].title} 最多只能放 ${newHands[destHandId].limit} 张牌。`, type: 'error' });
                return prevHands; 
            }

            destCards.splice(destination.index, 0, movedCard);

            newHands[sourceHandId].cards = sourceCards;
            newHands[destHandId].cards = destCards;
            
            setMessage({ text: '', type: '' });
            // 可以在这里选择是否立即评估牌型 (客户端评估)
            return newHands;
        });
    };

    const handleSubmitArrangement = async () => {
        setMessage({ text: '', type: '' });
        if (hands.frontHand.cards.length !== 3 || 
            hands.middleHand.cards.length !== 5 || 
            hands.backHand.cards.length !== 5) {
            setMessage({ text: '请将三墩牌摆完整：前墩 (3张), 中墩 (5张), 后墩 (5张)。', type: 'error' });
            return;
        }

        setIsLoading(true);
        try {
            const prepareHandForApi = (cardArray) => cardArray.map(c => ({
                id: c.id, suit: c.suit, value: c.value, rankValue: c.rankValue, imageName: c.imageName 
            }));

            const result = await evaluateArrangement(
                prepareHandForApi(hands.frontHand.cards),
                prepareHandForApi(hands.middleHand.cards),
                prepareHandForApi(hands.backHand.cards)
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
    
    const canSubmit = hands.frontHand.cards.length === 3 &&
                      hands.middleHand.cards.length === 5 &&
                      hands.backHand.cards.length === 5;

    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <div className="game-board">
                <h1>十三水游戏</h1>
                
                <div className="player-hand-area">
                    <h3>{hands.playerPool.title} ({hands.playerPool.cards.length} 张)</h3>
                    <HandArea droppableId="playerPool" cards={hands.playerPool.cards} type="pool" />
                </div>

                <div className="arranged-hands-area">
                    <h3>已摆好的牌墩</h3>
                    <div className="arranged-hands">
                        <HandArea droppableId="frontHand" cards={hands.frontHand.cards} title={initialHandsState.frontHand.title} type="front" cardLimit={3} evaluationText={hands.frontHand.evalText} />
                        <HandArea droppableId="middleHand" cards={hands.middleHand.cards} title={initialHandsState.middleHand.title} type="middle" cardLimit={5} evaluationText={hands.middleHand.evalText} />
                        <HandArea droppableId="backHand" cards={hands.backHand.cards} title={initialHandsState.backHand.title} type="back" cardLimit={5} evaluationText={hands.backHand.evalText} />
                    </div>
                </div>

                <div className="controls">
                    <button onClick={dealNewCards} disabled={isLoading}>
                        {isLoading ? '正在发牌...' : '重新发牌'}
                    </button>
                    <button onClick={handleSubmitArrangement} disabled={isLoading || !canSubmit}>
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
