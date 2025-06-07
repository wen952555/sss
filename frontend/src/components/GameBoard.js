// frontend/src/components/GameBoard.js
import React, { useState, useEffect, useCallback } from 'react';
import { DragDropContext } from 'react-beautiful-dnd';
import HandArea from './HandArea';
import { fetchInitialCards, evaluateArrangement } from '../utils/api';

// 调整初始状态，移除 playerPool
// 初始时可以将所有牌都放在一个墩里，例如前墩，让用户去分配
const initialHandsState = {
    frontHand: { id: 'frontHand', title: '前墩', cards: [], limit: 3, evalText: '' },
    middleHand: { id: 'middleHand', title: '中墩', cards: [], limit: 5, evalText: '' },
    backHand: { id: 'backHand', title: '后墩', cards: [], limit: 5, evalText: '' },
};

const GameBoard = () => {
    const [hands, setHands] = useState(initialHandsState);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });

    const dealNewCards = useCallback(async () => {
        setIsLoading(true);
        setMessage({ text: '', type: '' });
        try {
            const data = await fetchInitialCards();
            if (data && data.cards) {
                // 发牌后，所有牌先放入前墩 (或其他任一墩)
                setHands({
                    frontHand: { ...initialHandsState.frontHand, cards: data.cards, evalText: '' },
                    middleHand: { ...initialHandsState.middleHand, cards: [], evalText: '' },
                    backHand: { ...initialHandsState.backHand, cards: [], evalText: '' },
                });
            } else {
                console.error("从服务器获取的牌数据格式无效:", data);
                setMessage({ text: '无法从服务器获取牌局数据，请稍后再试。', type: 'error' });
                setHands(initialHandsState); // 重置为空状态
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
            const destCards = newHands[destHandId].cards ? Array.from(newHands[destHandId].cards) : []; // 确保 destCards 是数组
            
            const [movedCard] = sourceCards.splice(source.index, 1);

            // 检查目标牌墩的牌数限制
            if (newHands[destHandId].limit && destCards.length >= newHands[destHandId].limit) {
                setMessage({ text: `${newHands[destHandId].title} 最多只能放 ${newHands[destHandId].limit} 张牌。`, type: 'error' });
                // 保持原状或将牌放回原处 (当前逻辑是保持原状，不移动)
                // 如果要放回，需要更复杂的逻辑来处理 sourceCards
                return prevHands; 
            }

            destCards.splice(destination.index, 0, movedCard);

            newHands[sourceHandId].cards = sourceCards;
            newHands[destHandId].cards = destCards;
            
            setMessage({ text: '', type: '' });
            return newHands;
        });
    };

    const handleSubmitArrangement = async () => {
        setMessage({ text: '', type: '' });
        const totalCardsInDuns = hands.frontHand.cards.length + hands.middleHand.cards.length + hands.backHand.cards.length;
        
        if (totalCardsInDuns !== 13) {
             setMessage({ text: `总牌数应为13张，当前共 ${totalCardsInDuns} 张，请确保所有牌都已分配到墩中。`, type: 'error' });
             return;
        }

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
                
                {/* 移除了 player-hand-area */}

                <div className="arranged-hands-area banners-layout"> {/* 添加 banners-layout 类 */}
                    {/* <h3>请将13张牌分配到三墩</h3> */} {/* 可以添加一个总的提示 */}
                    <HandArea droppableId="frontHand" cards={hands.frontHand.cards} title={initialHandsState.frontHand.title} type="front" cardLimit={3} evaluationText={hands.frontHand.evalText} isBanner={true} />
                    <HandArea droppableId="middleHand" cards={hands.middleHand.cards} title={initialHandsState.middleHand.title} type="middle" cardLimit={5} evaluationText={hands.middleHand.evalText} isBanner={true} />
                    <HandArea droppableId="backHand" cards={hands.backHand.cards} title={initialHandsState.backHand.title} type="back" cardLimit={5} evaluationText={hands.backHand.evalText} isBanner={true} />
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
