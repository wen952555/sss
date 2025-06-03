// frontend/src/components/GameBoard.js
import React, { useState, useEffect, useMemo } from 'react'; // 添加 useMemo
import socket from '../socket';
import Card from './Card';
import HandDisplay from './HandDisplay'; // HandDisplay 将用于所有墩位
import { sortHand } from '../utils/cardUtils';
import './GameBoard.css';

const DUN_NAMES = { FRONT: "头墩", MIDDLE: "中墩", BACK: "尾墩" };
const DUN_TARGETS = { // 用于拖拽或点击放置的目标区域标识
    FRONT_DUN: 'FRONT_DUN',
    MIDDLE_DUN_AS_HAND: 'MIDDLE_DUN_AS_HAND', // 中墩区域作为手牌区时
    MIDDLE_DUN_AS_PLACEMENT: 'MIDDLE_DUN_AS_PLACEMENT', // 中墩区域作为置牌区时
    BACK_DUN: 'BACK_DUN',
    // HAND_POOL: 'HAND_POOL' // 如果需要一个独立逻辑上的手牌池
};

const GameBoard = ({ roomId, myPlayerId, initialHand, onArrangementInvalid }) => {
    // initialHand 是从 Room 组件传过来的当前玩家的13张完整牌对象数组

    // 墩牌状态 (存储牌对象)
    const [frontDunCards, setFrontDunCards] = useState([]);
    const [middleDunCards, setMiddleDunCards] = useState([]); // 这个墩在特定条件下才可用
    const [backDunCards, setBackDunCards] = useState([]);
    
    // 逻辑上的手牌池 (所有未放入确定墩的牌)
    const [currentHandPool, setCurrentHandPool] = useState([]);

    const [selectedCards, setSelectedCards] = useState([]); // 当前点击选中的牌 (来自手牌池)
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isAiProcessing, setIsAiProcessing] = useState(false);

    // 核心状态：判断中墩区域是作为手牌区还是置牌区
    // 当头墩有3张且尾墩有5张时，中墩区域才激活为置牌区
    const middleDunIsActivePlacementArea = useMemo(() => {
        return frontDunCards.length === 3 && backDunCards.length === 5;
    }, [frontDunCards, backDunCards]);


    // 初始化和手牌重置逻辑
    useEffect(() => {
        if (initialHand && initialHand.length === 13) {
            setCurrentHandPool(sortHand([...initialHand]));
            setFrontDunCards([]);
            setMiddleDunCards([]); // 初始中墩为空
            setBackDunCards([]);
            setSelectedCards([]);
            setError('');
            setIsSubmitting(false);
            setIsAiProcessing(false);
        } else {
            setCurrentHandPool([]);
            // ... (清空其他状态)
        }
    }, [initialHand]);

    // 点击手牌池中的牌进行选择
    const handleCardClickInPool = (card) => {
        if (isAiProcessing || isSubmitting) return;
        setError('');
        setSelectedCards(prev =>
            prev.find(c => c.id === card.id)
                ? prev.filter(c => c.id !== card.id)
                : [...prev, card]
        );
    };
    
    // 将选中的牌放入指定的墩
    const placeSelectedCardsToDun = (targetDun) => {
        if (isAiProcessing || isSubmitting || selectedCards.length === 0) return;
        setError('');

        let dunCardsState, setDunCardsState, capacity;

        if (targetDun === DUN_TARGETS.FRONT_DUN) {
            [dunCardsState, setDunCardsState, capacity] = [frontDunCards, setFrontDunCards, 3];
        } else if (targetDun === DUN_TARGETS.BACK_DUN) {
            [dunCardsState, setDunCardsState, capacity] = [backDunCards, setBackDunCards, 5];
        } else if (targetDun === DUN_TARGETS.MIDDLE_DUN_AS_PLACEMENT && middleDunIsActivePlacementArea) {
            // 只有在中墩作为置牌区激活时才能放入
            [dunCardsState, setDunCardsState, capacity] = [middleDunCards, setMiddleDunCards, 5];
        } else {
            if (targetDun === DUN_TARGETS.MIDDLE_DUN_AS_PLACEMENT && !middleDunIsActivePlacementArea) {
                setError("请先将头墩和尾墩摆满 (头3张，尾5张)，才能摆放中墩。");
            }
            return; // 无效目标或条件不满足
        }

        if (dunCardsState.length + selectedCards.length > capacity) {
            setError(`${DUN_NAMES[targetDun.replace('_DUN','').replace('_AS_PLACEMENT','')] || '该墩'} 最多只能放 ${capacity} 张牌。`);
            setSelectedCards([]);
            return;
        }

        // 更新墩和手牌池
        setDunCardsState(prevDun => sortHand([...prevDun, ...selectedCards]));
        setCurrentHandPool(prevPool => prevPool.filter(cardInPool => !selectedCards.find(sc => sc.id === cardInPool.id)));
        setSelectedCards([]);
    };

    // 从墩中取回牌到手牌池
    const returnCardFromDunToPool = (cardToRemove, sourceDunName) => {
        if (isAiProcessing || isSubmitting) return;
        setError('');
        let currentDunCards, setDunState;

        if (sourceDunName === DUN_NAMES.FRONT) { [currentDunCards, setDunState] = [frontDunCards, setFrontDunCards]; }
        else if (sourceDunName === DUN_NAMES.MIDDLE && middleDunIsActivePlacementArea) { [currentDunCards, setDunState] = [middleDunCards, setMiddleDunCards]; }
        else if (sourceDunName === DUN_NAMES.BACK) { [currentDunCards, setDunState] = [backDunCards, setBackDunCards]; }
        else return; // 不能从非激活的中墩或无效墩取牌

        setDunState(prevDun => prevDun.filter(c => c.id !== cardToRemove.id));
        setCurrentHandPool(prevPool => sortHand([...prevPool, cardToRemove]));
        setSelectedCards([]); // 清空之前的选择
    };


    // AI 自动分牌请求 (AI结果会直接设置三个墩)
    const handleAiArrange = () => {
        if (!initialHand || initialHand.length !== 13) {
            setError("手牌信息不完整，无法使用AI分牌。");
            return;
        }
        if (isAiProcessing || isSubmitting) return;
        setError('');
        setIsAiProcessing(true);
        // AI分牌会直接覆盖所有墩，所以先清空当前用户摆放
        setFrontDunCards([]);
        setMiddleDunCards([]);
        setBackDunCards([]);
        setCurrentHandPool([]); // AI会分配所有牌
        setSelectedCards([]);
        socket.emit('requestAIArrangement', { roomId });
    };

    // 监听后端返回的 AI 排列结果
    useEffect(() => {
        const handleAiArrangementReady = ({ arrangement }) => {
            if (!initialHand || initialHand.length === 0) {
                setIsAiProcessing(false);
                setError("AI分牌时手牌数据丢失，请重试。");
                return;
            }
            const mapIdsToCardsFromInitial = (ids) => 
                ids.map(id => initialHand.find(card => card.id === id)).filter(Boolean);

            const aiFront = sortHand(mapIdsToCardsFromInitial(arrangement.front));
            const aiMiddle = sortHand(mapIdsToCardsFromInitial(arrangement.middle));
            const aiBack = sortHand(mapIdsToCardsFromInitial(arrangement.back));

            if (aiFront.length !== 3 || aiMiddle.length !== 5 || aiBack.length !== 5) {
                setError("AI返回的牌墩数量错误，请手动摆牌。");
                setCurrentHandPool(sortHand([...initialHand])); // 恢复手牌池
            } else {
                setFrontDunCards(aiFront);
                setMiddleDunCards(aiMiddle); // AI直接设置中墩
                setBackDunCards(aiBack);
                setCurrentHandPool([]); // 所有牌都被AI分配
                setError('');
            }
            setIsAiProcessing(false);
        };
        const handleAiError = (message) => {
            if (message.toLowerCase().includes("ai")) {
                setIsAiProcessing(false);
                setError(message);
                if (initialHand && initialHand.length === 13) {
                     setCurrentHandPool(sortHand([...initialHand])); // AI失败，恢复手牌池
                }
            }
        };
        socket.on('aiArrangementReady', handleAiArrangementReady);
        socket.on('errorMsg', handleAiError);
        return () => {
            socket.off('aiArrangementReady', handleAiArrangementReady);
            socket.off('errorMsg', handleAiError);
        };
    }, [initialHand, roomId]);

    // 监听手动摆牌无效的错误
    useEffect(() => {
        const handleManualArrangementInvalid = (message) => {
            if (onArrangementInvalid) {
                setError(message);
                setIsSubmitting(false);
            }
        };
        socket.on('arrangementInvalid', handleManualArrangementInvalid); 
        return () => {
            socket.off('arrangementInvalid', handleManualArrangementInvalid);
        };
    }, [onArrangementInvalid]);

    // 提交最终牌型
    const handleSubmitArrangement = () => {
        if (isAiProcessing || isSubmitting) return;
        setError('');
        if (frontDunCards.length !== 3 || middleDunCards.length !== 5 || backDunCards.length !== 5) {
            setError('三墩牌必须完整摆放 (头3, 中5, 尾5)。');
            return;
        }
        if (currentHandPool.length > 0) { // 确保所有牌都已分配
            setError('您还有未分配到墩的牌。');
            return;
        }
        
        const arrangementIds = {
            front: frontDunCards.map(c => c.id),
            middle: middleDunCards.map(c => c.id),
            back: backDunCards.map(c => c.id),
        };
        setIsSubmitting(true);
        socket.emit('submitArrangement', { roomId, arrangement: arrangementIds });
    };

    // 如果 initialHand 还未加载，显示加载状态
    if (!initialHand || initialHand.length === 0) {
        // 这个状态应该由 Room.js 控制，GameBoard 被调用时 initialHand 应该已经有了
        // 但作为防御，可以加一个提示
        return <div className="game-board-container"><p className="loading-text-inner">等待手牌...</p></div>;
    }

    const allCardsPlacedInDuns = currentHandPool.length === 0 &&
                                 frontDunCards.length === 3 &&
                                 middleDunCards.length === 5 &&
                                 backDunCards.length === 5;

    return (
        <> {/* 使用 Fragment 包裹，因为 GameBoard 现在是 Room 内布局的一部分 */}
            {/* 第2道横幅：头墩置牌区 */}
            <div className="dun-area header-dun-area">
                <HandDisplay
                    title={DUN_NAMES.FRONT}
                    cardObjects={frontDunCards}
                    onCardClick={(card) => returnCardFromDunToPool(card, DUN_NAMES.FRONT)}
                    // 可以添加一个高亮或提示，表示这是放置目标
                />
                {selectedCards.length > 0 && (
                    <button 
                        className="place-here-button front-place-button"
                        onClick={() => placeSelectedCardsToDun(DUN_TARGETS.FRONT_DUN)}
                        disabled={isAiProcessing || isSubmitting || frontDunCards.length >= 3}
                    >
                        放头墩 ({frontDunCards.length}/3)
                    </button>
                )}
            </div>

            {/* 第3道横幅：手牌区 / 中墩置牌区 */}
            <div className="hand-middle-dun-area">
                {!middleDunIsActivePlacementArea ? (
                    <>
                        <h4>手牌区 (请先摆满头尾墩)</h4>
                        <div className="current-hand-pool-display cards-wrapper"> {/* 使用.cards-wrapper让卡牌横向排列 */}
                            {currentHandPool.map(card => (
                                <Card
                                    key={card.id}
                                    card={card}
                                    isSelected={selectedCards.some(sc => sc.id === card.id)}
                                    onClick={() => handleCardClickInPool(card)}
                                />
                            ))}
                            {currentHandPool.length === 0 && initialHand.length > 0 && <p>所有牌已放入墩或等待分配中墩。</p>}
                        </div>
                    </>
                ) : (
                    <>
                        {/* 中墩已激活为置牌区 */}
                        <HandDisplay
                            title={DUN_NAMES.MIDDLE}
                            cardObjects={middleDunCards}
                            onCardClick={(card) => returnCardFromDunToPool(card, DUN_NAMES.MIDDLE)}
                        />
                        {selectedCards.length > 0 && currentHandPool.length === 0 && ( // 只有手牌池空了（意味着所有牌都在墩或选中）才显示放中墩
                             <button 
                                className="place-here-button middle-place-button"
                                onClick={() => placeSelectedCardsToDun(DUN_TARGETS.MIDDLE_DUN_AS_PLACEMENT)}
                                disabled={isAiProcessing || isSubmitting || middleDunCards.length >= 5}
                            >
                                放中墩 ({middleDunCards.length}/5)
                            </button>
                        )}
                        {/* 如果中墩激活了，但手牌池还有牌，提示玩家将剩余牌放入中墩 */}
                        {middleDunIsActivePlacementArea && currentHandPool.length > 0 && selectedCards.length === 0 && (
                            <p className="info-prompt">请从下方“剩余手牌”中选择并放入中墩。</p>
                        )}
                         {/* 当中墩激活后，如果手牌池还有牌，单独显示这些牌作为中墩的候选 */}
                         {middleDunIsActivePlacementArea && currentHandPool.length > 0 && (
                            <div className="remaining-for-middle-dun cards-wrapper">
                                <h5>剩余手牌 (用于中墩):</h5>
                                {currentHandPool.map(card => (
                                    <Card
                                        key={`middle-cand-${card.id}`}
                                        card={card}
                                        isSelected={selectedCards.some(sc => sc.id === card.id)}
                                        onClick={() => handleCardClickInPool(card)}
                                    />
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
            
            {/* 第5道横幅：尾墩置牌区 (移到按钮区上方，更符合操作逻辑) */}
            <div className="dun-area footer-dun-area">
                <HandDisplay
                    title={DUN_NAMES.BACK}
                    cardObjects={backDunCards}
                    onCardClick={(card) => returnCardFromDunToPool(card, DUN_NAMES.BACK)}
                />
                {selectedCards.length > 0 && (
                    <button 
                        className="place-here-button back-place-button"
                        onClick={() => placeSelectedCardsToDun(DUN_TARGETS.BACK_DUN)}
                        disabled={isAiProcessing || isSubmitting || backDunCards.length >= 5}
                    >
                        放尾墩 ({backDunCards.length}/5)
                    </button>
                )}
            </div>

            {/* 第4道横幅：按钮区 */}
            <div className="action-buttons-banner"> {/* 使用Room.css中定义的类名 */}
                {error && <p className="error-message gameboard-error">{error}</p>}
                <button 
                    className="ai-arrange-button"
                    onClick={handleAiArrange}
                    disabled={isAiProcessing || isSubmitting || !initialHand || initialHand.length !== 13}
                >
                    {isAiProcessing ? 'AI计算中...' : 'AI自动分牌'}
                </button>
                <button 
                    className="submit-arrangement-button"
                    onClick={handleSubmitArrangement}
                    disabled={isAiProcessing || isSubmitting || !allCardsPlacedInDuns}
                >
                    {isSubmitting ? '提交中...' : '确认出牌'}
                </button>
            </div>
        </>
    );
};

export default GameBoard;
