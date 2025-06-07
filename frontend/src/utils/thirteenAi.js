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

    const dealNewCards = useCallback(async () => {
        // ... (与上一版本相同)
        setIsLoading(true);
        setMessage({ text: '', type: '' });
        setAllPlayerCards([]); 
        try {
            const data = await fetchInitialCards();
            if (data && data.cards) {
                setAllPlayerCards(data.cards); 
                const initialMiddleCards = data.cards;
                let initialMiddleEvalText = '';
                // AI或拖拽后会重新计算，初始发牌时中墩牌数不一定是limit，不计算evalText
                // if (initialMiddleCards.length === initialHandsState.middleHand.limit) { 
                //     const evalResult = evaluateHandSimpleFrontend(initialMiddleCards);
                //     initialMiddleEvalText = evalResult.name || '未知';
                // }
                setHands({ 
                    frontHand: { ...initialHandsState.frontHand, cards: [], evalText: '' },
                    middleHand: { ...initialHandsState.middleHand, cards: initialMiddleCards, evalText: initialMiddleEvalText },
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
        // ... (与上一版本相同，包含前端牌型预览逻辑)
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
            Object.keys(newHands).forEach(handKey => {
                const hand = newHands[handKey];
                if (hand.limit) { 
                    if (hand.cards.length === hand.limit) {
                        const evalResult = evaluateHandSimpleFrontend(hand.cards);
                        hand.evalText = evalResult.name || '未知'; 
                    } else {
                        hand.evalText = ''; 
                    }
                }
            });
            return newHands;
        });
    };

    const handleSubmitArrangement = async () => {
        // ... (与上一版本相同)
        setMessage({ text: '', type: '' }); 
        const { frontHand, middleHand, backHand } = hands;
        const totalCardsInDuns = frontHand.cards.length + middleHand.cards.length + backHand.cards.length;
        if (totalCardsInDuns !== 13) {
             setMessage({ text: `总牌数应为13张，当前已分配 ${totalCardsInDuns} 张。请确保所有13张牌都在墩中。`, type: 'error' });
             return;
        }
        if (frontHand.cards.length !== 3) {setMessage({ text: `前墩需要 3 张牌，当前有 ${frontHand.cards.length} 张。`, type: 'error' }); return;}
        if (middleHand.cards.length !== 5) {setMessage({ text: `中墩需要 5 张牌，当前有 ${middleHand.cards.length} 张。`, type: 'error' }); return;}
        if (backHand.cards.length !== 5) {setMessage({ text: `后墩需要 5 张牌，当前有 ${backHand.cards.length} 张。`, type: 'error' }); return;}
        setIsLoading(true);
        try {
            const prepareHandForApi = (cardArray) => cardArray.map(c => ({id: c.id, suit: c.suit, value: c.value, rankValue: c.rankValue, imageName: c.imageName }));
            const result = await evaluateArrangement( prepareHandForApi(frontHand.cards), prepareHandForApi(middleHand.cards), prepareHandForApi(backHand.cards));
            if (result.success) {
                setMessage({ text: result.validation.message, type: result.validation.isValid ? 'success' : 'error' });
                setHands(prev => ({ ...prev,
                    frontHand: {...prev.frontHand, evalText: result.evaluations.front.type_name },
                    middleHand: {...prev.middleHand, evalText: result.evaluations.middle.type_name },
                    backHand: {...prev.backHand, evalText: result.evaluations.back.type_name },
                }));
            } else { setMessage({ text: result.message || '牌型评估失败，请检查后端服务。', type: 'error' }); }
        } catch (error) { console.error("评估牌型出错:", error); setMessage({ text: `评估出错: ${error.message}`, type: 'error' });
        } finally { setIsLoading(false); }
    };

    const handleAiArrange = () => {
        if (allPlayerCards.length !== 13) {
            setMessage({ text: '请先发牌，获得13张手牌后再使用AI分牌。', type: 'error' });
            return;
        }
        setMessage({ text: 'AI正在尝试分牌...', type: '' });
        setIsLoading(true); 
        
        setTimeout(async () => { // async 关键字在这里不是必需的，因为 simpleAiArrangeCards 是同步的
            try {
                const arrangement = simpleAiArrangeCards(allPlayerCards); 
                if (arrangement && arrangement.frontHand && arrangement.middleHand && arrangement.backHand) { // 增加对 arrangement 结构的检查
                    // --- 修改点：暂时只更新牌墩的 cards，不更新 evalText ---
                    const newHandsSetup = {
                        frontHand: { ...initialHandsState.frontHand, cards: arrangement.frontHand, evalText: '' }, // evalText暂时清空
                        middleHand: { ...initialHandsState.middleHand, cards: arrangement.middleHand, evalText: '' },// evalText暂时清空
                        backHand: { ...initialHandsState.backHand, cards: arrangement.backHand, evalText: '' },// evalText暂时清空
                    };
                    
                    // --- 关键调试点：打印将要 setHands 的数据 ---
                    console.log("Setting hands from AI:", JSON.parse(JSON.stringify(newHandsSetup)));

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
    
    return (
        // ... (JSX 结构与上一版本相同)
        <DragDropContext onDragEnd={onDragEnd}>
            <div className="game-board">
                <h1>十三水游戏</h1>
                <div className="arranged-hands-area banners-layout">
                    <HandArea droppableId="frontHand" cards={hands.frontHand.cards} title={initialHandsState.frontHand.title} type="front" cardLimit={initialHandsState.frontHand.limit} evaluationText={hands.frontHand.evalText} isBanner={true} />
                    <HandArea droppableId="middleHand" cards={hands.middleHand.cards} title={initialHandsState.middleHand.title} type="middle" cardLimit={initialHandsState.middleHand.limit} evaluationText={hands.middleHand.evalText} isBanner={true} />
                    <HandArea droppableId="backHand" cards={hands.backHand.cards} title={initialHandsState.backHand.title} type="back" cardLimit={initialHandsState.backHand.limit} evaluationText={hands.backHand.evalText} isBanner={true} />
                </div>
                <div className="controls">
                    <button onClick={dealNewCards} disabled={isLoading}>{isLoading && message.text.includes('发牌') ? '正在发牌...' : '重新发牌'}</button>
                    <button onClick={handleAiArrange} disabled={isLoading || allPlayerCards.length !== 13}>{isLoading && message.text.includes('AI') ? 'AI计算中...' : 'AI分牌'}</button>
                    <button onClick={handleSubmitArrangement} disabled={isLoading}>{isLoading && message.text.includes('检查') ? '正在检查...' : '确定牌型'}</button>
                </div>
                {message.text && !isLoading && (<div className={`message-area ${message.type}`}>{message.text}</div>)}
                {isLoading && (<div className="loading-indicator">
                        {message.text.includes('发牌') ? '正在发牌...' : message.text.includes('AI') ? 'AI计算中...' : message.text.includes('检查') ? '正在检查牌型...' : '加载中...'}
                     </div>)}
            </div>
        </DragDropContext>
    );
};

export default GameBoard;
