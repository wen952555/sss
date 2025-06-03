// frontend/src/components/GameBoard.js
import React, { useState, useEffect, useMemo } from 'react';
import socket from '../socket';
import Card from './Card';
import HandDisplay from './HandDisplay';
import { sortHand } from '../utils/cardUtils';
import './GameBoard.css';

const DUN_NAMES = { FRONT: "头墩", MIDDLE: "中墩", BACK: "尾墩" };
const DUN_TARGETS = {
    FRONT_DUN: 'FRONT_DUN',
    MIDDLE_DUN_AS_HAND: 'MIDDLE_DUN_AS_HAND',
    MIDDLE_DUN_AS_PLACEMENT: 'MIDDLE_DUN_AS_PLACEMENT',
    BACK_DUN: 'BACK_DUN',
};

const GameBoard = ({ roomId, myPlayerId, initialHand, onArrangementInvalid }) => {
    const [frontDunCards, setFrontDunCards] = useState([]);
    const [middleDunCards, setMiddleDunCards] = useState([]);
    const [backDunCards, setBackDunCards] = useState([]);
    const [currentHandPool, setCurrentHandPool] = useState([]);
    const [selectedCards, setSelectedCards] = useState([]);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isAiProcessing, setIsAiProcessing] = useState(false);

    const middleDunIsActivePlacementArea = useMemo(() => {
        return frontDunCards.length === 3 && backDunCards.length === 5;
    }, [frontDunCards, backDunCards]);

    useEffect(() => {
        if (initialHand && initialHand.length === 13) {
            setCurrentHandPool(sortHand([...initialHand]));
            setFrontDunCards([]);
            setMiddleDunCards([]);
            setBackDunCards([]);
            setSelectedCards([]);
            setError('');
            setIsSubmitting(false);
            setIsAiProcessing(false);
        } else {
            setCurrentHandPool([]);
            setFrontDunCards([]);
            setMiddleDunCards([]);
            setBackDunCards([]);
            setSelectedCards([]);
        }
    }, [initialHand]);

    const handleCardClickInPool = (card) => {
        if (isAiProcessing || isSubmitting) return;
        setError('');
        setSelectedCards(prev =>
            prev.find(c => c.id === card.id)
                ? prev.filter(c => c.id !== card.id)
                : [...prev, card]
        );
    };
    
    const placeSelectedCardsToDun = (targetDun) => {
        if (isAiProcessing || isSubmitting || selectedCards.length === 0) return;
        setError('');
        let dunCardsState, setDunCardsState, capacity;

        if (targetDun === DUN_TARGETS.FRONT_DUN) {
            [dunCardsState, setDunCardsState, capacity] = [frontDunCards, setFrontDunCards, 3];
        } else if (targetDun === DUN_TARGETS.BACK_DUN) {
            [dunCardsState, setDunCardsState, capacity] = [backDunCards, setBackDunCards, 5];
        } else if (targetDun === DUN_TARGETS.MIDDLE_DUN_AS_PLACEMENT && middleDunIsActivePlacementArea) {
            [dunCardsState, setDunCardsState, capacity] = [middleDunCards, setMiddleDunCards, 5];
        } else {
            if (targetDun === DUN_TARGETS.MIDDLE_DUN_AS_PLACEMENT && !middleDunIsActivePlacementArea) {
                setError("请先将头墩和尾墩摆满 (头3张，尾5张)，才能摆放中墩。");
            }
            setSelectedCards([]); // 清空选择，因为放置操作未执行
            return;
        }

        if (dunCardsState.length + selectedCards.length > capacity) {
            setError(`${DUN_NAMES[targetDun.replace('_DUN','').replace('_AS_PLACEMENT','')] || '该墩'} 最多只能放 ${capacity} 张牌。`);
            setSelectedCards([]);
            return;
        }

        setDunCardsState(prevDun => sortHand([...prevDun, ...selectedCards]));
        setCurrentHandPool(prevPool => prevPool.filter(cardInPool => !selectedCards.find(sc => sc.id === cardInPool.id)));
        setSelectedCards([]);
    };

    const returnCardFromDunToPool = (cardToRemove, sourceDunName) => {
        if (isAiProcessing || isSubmitting) return;
        setError('');
        let setDunState; // 只解构需要的 setDunState

        if (sourceDunName === DUN_NAMES.FRONT) { 
            // eslint-disable-next-line no-unused-vars
            let _unusedDunCards; // 明确告诉 ESLint 我们知道它未使用
            [_unusedDunCards, setDunState] = [frontDunCards, setFrontDunCards]; 
        } else if (sourceDunName === DUN_NAMES.MIDDLE && middleDunIsActivePlacementArea) { 
            // eslint-disable-next-line no-unused-vars
            let _unusedDunCards;
            [_unusedDunCards, setDunState] = [middleDunCards, setMiddleDunCards]; 
        } else if (sourceDunName === DUN_NAMES.BACK) { 
            // eslint-disable-next-line no-unused-vars
            let _unusedDunCards;
            [_unusedDunCards, setDunState] = [backDunCards, setBackDunCards]; 
        } else {
            return; 
        }
        
        if (!setDunState) return; // 防御性检查

        setDunState(prevDun => prevDun.filter(c => c.id !== cardToRemove.id));
        setCurrentHandPool(prevPool => sortHand([...prevPool, cardToRemove]));
        setSelectedCards([]);
    };

    const handleAiArrange = () => {
        if (!initialHand || initialHand.length !== 13) {
            setError("手牌信息不完整，无法使用AI分牌。");
            return;
        }
        if (isAiProcessing || isSubmitting) return;
        setError('');
        setIsAiProcessing(true);
        setFrontDunCards([]);
        setMiddleDunCards([]);
        setBackDunCards([]);
        setCurrentHandPool([]);
        setSelectedCards([]);
        socket.emit('requestAIArrangement', { roomId });
    };

    useEffect(() => {
        const handleAiArrangementReady = ({ arrangement }) => {
            if (!initialHand || initialHand.length === 0) {
                setIsAiProcessing(false);
                setError("AI分牌时手牌数据丢失，请重试。");
                if (initialHand && initialHand.length === 13) { // 尝试恢复手牌池
                     setCurrentHandPool(sortHand([...initialHand]));
                }
                return;
            }
            const mapIdsToCardsFromInitial = (ids) => 
                ids.map(id => initialHand.find(card => card.id === id)).filter(Boolean);

            const aiFront = sortHand(mapIdsToCardsFromInitial(arrangement.front));
            const aiMiddle = sortHand(mapIdsToCardsFromInitial(arrangement.middle));
            const aiBack = sortHand(mapIdsToCardsFromInitial(arrangement.back));

            if (aiFront.length !== 3 || aiMiddle.length !== 5 || aiBack.length !== 5) {
                setError("AI返回的牌墩数量错误，请手动摆牌。");
                setCurrentHandPool(sortHand([...initialHand]));
            } else {
                setFrontDunCards(aiFront);
                setMiddleDunCards(aiMiddle);
                setBackDunCards(aiBack);
                setCurrentHandPool([]);
                setError('');
            }
            setIsAiProcessing(false);
        };
        const handleAiError = (message) => {
            if (message.toLowerCase().includes("ai")) {
                setIsAiProcessing(false);
                setError(message);
                if (initialHand && initialHand.length === 13) {
                     setCurrentHandPool(sortHand([...initialHand]));
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

    const handleSubmitArrangement = () => {
        if (isAiProcessing || isSubmitting) return;
        setError('');
        if (frontDunCards.length !== 3 || middleDunCards.length !== 5 || backDunCards.length !== 5) {
            setError('三墩牌必须完整摆放 (头3, 中5, 尾5)。');
            return;
        }
        if (currentHandPool.length > 0) {
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

    if (!initialHand || initialHand.length === 0) {
        return <div className="game-board-container"><p className="loading-text-inner">等待手牌...</p></div>;
    }
    
    const allCardsPlacedInDuns = currentHandPool.length === 0 && 
                                 frontDunCards.length === 3 &&
                                 middleDunCards.length === 5 &&
                                 backDunCards.length === 5;

    return (
        <>
            <div className="dun-area header-dun-area">
                <HandDisplay
                    title={DUN_NAMES.FRONT}
                    cardObjects={frontDunCards}
                    onCardClick={(card) => returnCardFromDunToPool(card, DUN_NAMES.FRONT)}
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

            <div className="hand-middle-dun-area">
                {!middleDunIsActivePlacementArea ? (
                    <>
                        <h4>手牌区 (请先摆满头尾墩)</h4>
                        <div className="current-hand-pool-display cards-wrapper">
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
                        <HandDisplay
                            title={DUN_NAMES.MIDDLE}
                            cardObjects={middleDunCards}
                            onCardClick={(card) => returnCardFromDunToPool(card, DUN_NAMES.MIDDLE)}
                        />
                        {selectedCards.length > 0 && currentHandPool.length === 0 && (
                             <button 
                                className="place-here-button middle-place-button"
                                onClick={() => placeSelectedCardsToDun(DUN_TARGETS.MIDDLE_DUN_AS_PLACEMENT)}
                                disabled={isAiProcessing || isSubmitting || middleDunCards.length >= 5}
                            >
                                放中墩 ({middleDunCards.length}/5)
                            </button>
                        )}
                        {middleDunIsActivePlacementArea && currentHandPool.length > 0 && selectedCards.length === 0 && (
                            <p className="info-prompt">请从下方“剩余手牌”中选择并放入中墩。</p>
                        )}
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

            <div className="action-buttons-banner">
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
