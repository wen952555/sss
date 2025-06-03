// frontend/src/components/GameBoard.js
import React, { useState, useEffect, useMemo } from 'react';
import socket from '../socket';
// import Card from './Card'; // ★★★ 移除 Card 的导入 ★★★
import HandDisplay from './HandDisplay';
import { sortHand } from '../utils/cardUtils';
import { DragDropContext } from 'react-beautiful-dnd';
import './GameBoard.css';

const DUN_NAMES = { FRONT: "头墩", MIDDLE: "中墩", BACK: "尾墩" };
const DROPPABLE_IDS = {
    FRONT_DUN: 'FRONT_DUN_ID',
    MIDDLE_DUN_LOGICAL: 'MIDDLE_DUN_LOGICAL_ID',
    BACK_DUN: 'BACK_DUN_ID',
    CURRENT_HAND_POOL: 'CURRENT_HAND_POOL_ID'
};

const GameBoard = ({ roomId, myPlayerId, initialHand, onArrangementInvalid }) => {
    const [frontDunCards, setFrontDunCards] = useState([]);
    const [middleDunCards, setMiddleDunCards] = useState([]);
    const [backDunCards, setBackDunCards] = useState([]);
    const [currentHandPool, setCurrentHandPool] = useState([]);
    
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isAiProcessing, setIsAiProcessing] = useState(false);

    const middleDunIsActivePlacementArea = useMemo(() => {
        return frontDunCards.length === 3 && backDunCards.length === 5;
    }, [frontDunCards.length, backDunCards.length]);

    useEffect(() => {
        if (initialHand && initialHand.length === 13) {
            setCurrentHandPool(sortHand([...initialHand]));
            setFrontDunCards([]);
            setMiddleDunCards([]);
            setBackDunCards([]);
            setError('');
            setIsSubmitting(false);
            setIsAiProcessing(false);
        } else {
            setCurrentHandPool([]);
            setFrontDunCards([]);
            setMiddleDunCards([]);
            setBackDunCards([]);
        }
    }, [initialHand]);

    const onDragEnd = (result) => {
        const { source, destination, draggableId } = result;

        if (!destination || (source.droppableId === destination.droppableId && source.index === destination.index)) {
            return;
        }
        
        setError('');
        if (isAiProcessing || isSubmitting) return;

        let draggedCard;
        let sourceList, setSourceListFunc;
        // let sourceListName = ''; // ★★★ 移除 sourceListName ★★★

        if (source.droppableId === DROPPABLE_IDS.CURRENT_HAND_POOL) {
            sourceList = [...currentHandPool];
            setSourceListFunc = setCurrentHandPool;
            // sourceListName = '手牌池';
        } else if (source.droppableId === DROPPABLE_IDS.FRONT_DUN) {
            sourceList = [...frontDunCards];
            setSourceListFunc = setFrontDunCards;
            // sourceListName = DUN_NAMES.FRONT;
        } else if (source.droppableId === DROPPABLE_IDS.MIDDLE_DUN_LOGICAL && middleDunIsActivePlacementArea) {
            sourceList = [...middleDunCards];
            setSourceListFunc = setMiddleDunCards;
            // sourceListName = DUN_NAMES.MIDDLE;
        } else if (source.droppableId === DROPPABLE_IDS.BACK_DUN) {
            sourceList = [...backDunCards];
            setSourceListFunc = setBackDunCards;
            // sourceListName = DUN_NAMES.BACK;
        } else {
            console.warn("onDragEnd: Unknown source droppableId", source.droppableId);
            return;
        }
        
        draggedCard = sourceList.find(card => card.id === draggableId);
        if (!draggedCard) {
            console.error("onDragEnd: Dragged card not found in source list", draggableId, sourceList);
            return;
        }
        const newSourceList = sourceList.filter(card => card.id !== draggableId);
        // setSourceListFunc(sortHand(newSourceList)); // 移动到后面，确保操作失败时能正确回退

        let destList, setDestListFunc, destCapacity, destListName;

        if (destination.droppableId === DROPPABLE_IDS.CURRENT_HAND_POOL) {
            destList = [...currentHandPool.filter(card => card.id !== draggableId)];
            setDestListFunc = setCurrentHandPool;
            destCapacity = 13; 
            destListName = '手牌池';
        } else if (destination.droppableId === DROPPABLE_IDS.FRONT_DUN) {
            destList = [...frontDunCards.filter(card => card.id !== draggableId)];
            setDestListFunc = setFrontDunCards;
            destCapacity = 3;
            destListName = DUN_NAMES.FRONT;
        } else if (destination.droppableId === DROPPABLE_IDS.MIDDLE_DUN_LOGICAL && middleDunIsActivePlacementArea) {
            destList = [...middleDunCards.filter(card => card.id !== draggableId)];
            setDestListFunc = setMiddleDunCards;
            destCapacity = 5;
            destListName = DUN_NAMES.MIDDLE;
        } else if (destination.droppableId === DROPPABLE_IDS.BACK_DUN) {
            destList = [...backDunCards.filter(card => card.id !== draggableId)];
            setDestListFunc = setBackDunCards;
            destCapacity = 5;
            destListName = DUN_NAMES.BACK;
        } else {
            if (destination.droppableId === DROPPABLE_IDS.MIDDLE_DUN_LOGICAL && !middleDunIsActivePlacementArea) {
                setError("请先将头墩和尾墩摆满 (头3张，尾5张)，才能摆放中墩。");
            } else {
                console.warn("onDragEnd: Unknown or invalid destination droppableId", destination.droppableId);
            }
            // 无效目标，不移动卡牌，所以不需要更新源列表
            // setSourceListFunc(sortHand([...newSourceList, draggedCard])); // 错误：这里不应该放回，因为源列表已经过滤了
            return; // 直接返回，不进行任何状态更新
        }

        if (destList.length >= destCapacity && destination.droppableId !== DROPPABLE_IDS.CURRENT_HAND_POOL) {
            setError(`${destListName} 已满 (${destCapacity}张)。`);
            // 目标已满，不移动卡牌，所以不需要更新源列表
            return; // 直接返回
        }
        
        // 只有在所有检查通过后，才真正更新源列表
        setSourceListFunc(sortHand(newSourceList));

        const newDestList = [...destList];
        newDestList.splice(destination.index, 0, draggedCard);
        setDestListFunc(sortHand(newDestList));
    };

    const handleAiArrange = () => { /* ... (保持不变) ... */ 
        if (!initialHand || initialHand.length !== 13) { setError("手牌信息不完整，无法使用AI分牌。"); return; }
        if (isAiProcessing || isSubmitting) return;
        setError(''); setIsAiProcessing(true);
        setFrontDunCards([]); setMiddleDunCards([]); setBackDunCards([]);
        setCurrentHandPool([]); 
        socket.emit('requestAIArrangement', { roomId });
    };

    useEffect(() => { /* ... (AI 结果处理保持不变) ... */ 
        const handleAiArrangementReady = ({ arrangement }) => {
            if (!initialHand || initialHand.length === 0) { setIsAiProcessing(false); setError("AI分牌时手牌数据丢失，请重试。"); if (initialHand && initialHand.length === 13) { setCurrentHandPool(sortHand([...initialHand]));} return; }
            const mapIdsToCardsFromInitial = (ids) => ids.map(id => initialHand.find(card => card.id === id)).filter(Boolean);
            const aiFront = sortHand(mapIdsToCardsFromInitial(arrangement.front));
            const aiMiddle = sortHand(mapIdsToCardsFromInitial(arrangement.middle));
            const aiBack = sortHand(mapIdsToCardsFromInitial(arrangement.back));
            if (aiFront.length !== 3 || aiMiddle.length !== 5 || aiBack.length !== 5) { setError("AI返回的牌墩数量错误，请手动摆牌。"); setCurrentHandPool(sortHand([...initialHand]));
            } else { setFrontDunCards(aiFront); setMiddleDunCards(aiMiddle); setBackDunCards(aiBack); setCurrentHandPool([]); setError(''); }
            setIsAiProcessing(false);
        };
        const handleAiError = (message) => { if (message.toLowerCase().includes("ai")) { setIsAiProcessing(false); setError(message); if (initialHand && initialHand.length === 13) { setCurrentHandPool(sortHand([...initialHand])); } } };
        socket.on('aiArrangementReady', handleAiArrangementReady);
        socket.on('errorMsg', handleAiError);
        return () => { socket.off('aiArrangementReady', handleAiArrangementReady); socket.off('errorMsg', handleAiError); };
    }, [initialHand, roomId]);

    useEffect(() => { /* ... (手动摆牌无效处理保持不变) ... */ 
        const handleManualArrangementInvalid = (message) => { if (onArrangementInvalid) { setError(message); setIsSubmitting(false); } };
        socket.on('arrangementInvalid', handleManualArrangementInvalid); 
        return () => { socket.off('arrangementInvalid', handleManualArrangementInvalid); };
    }, [onArrangementInvalid]);

    const handleSubmitArrangement = () => { /* ... (保持不变) ... */ 
        if (isAiProcessing || isSubmitting) return;
        setError('');
        if (frontDunCards.length !== 3 || middleDunCards.length !== 5 || backDunCards.length !== 5) { setError('三墩牌必须完整摆放 (头3, 中5, 尾5)。'); return; }
        if (currentHandPool.length > 0) { setError('您还有未分配到墩的牌。'); return; }
        const arrangementIds = { front: frontDunCards.map(c => c.id), middle: middleDunCards.map(c => c.id), back: backDunCards.map(c => c.id) };
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
        <DragDropContext onDragEnd={onDragEnd}>
            <div className="dun-area header-dun-area">
                <HandDisplay
                    title={DUN_NAMES.FRONT}
                    droppableId={DROPPABLE_IDS.FRONT_DUN}
                    cards={frontDunCards}
                    isDropDisabled={frontDunCards.length >= 3 || isAiProcessing || isSubmitting}
                />
            </div>

            <div className="hand-middle-dun-area">
                {!middleDunIsActivePlacementArea ? (
                    <>
                        <h4>手牌区 (请先摆满头尾墩)</h4>
                        <HandDisplay
                            title="手牌"
                            droppableId={DROPPABLE_IDS.CURRENT_HAND_POOL}
                            cards={currentHandPool}
                            isDropDisabled={isAiProcessing || isSubmitting}
                        />
                    </>
                ) : (
                    <>
                        <HandDisplay
                            title={DUN_NAMES.MIDDLE}
                            droppableId={DROPPABLE_IDS.MIDDLE_DUN_LOGICAL}
                            cards={middleDunCards}
                            isDropDisabled={middleDunCards.length >= 5 || isAiProcessing || isSubmitting}
                        />
                        {currentHandPool.length > 0 && ( // 只有当手牌池还有牌时才显示这个区域
                            <div className="remaining-for-middle-dun">
                                <h5>剩余手牌 (用于中墩):</h5>
                                 <HandDisplay
                                    title="中墩候选" // 可以用一个不同的title或不显示title
                                    droppableId={DROPPABLE_IDS.CURRENT_HAND_POOL} // 拖到这里等同于放回手牌池
                                    cards={currentHandPool}
                                    isDropDisabled={isAiProcessing || isSubmitting}
                                />
                                <p className="info-prompt">请将上方剩余手牌拖拽到中墩。</p>
                            </div>
                        )}
                    </>
                )}
            </div>
            
            <div className="dun-area footer-dun-area">
                <HandDisplay
                    title={DUN_NAMES.BACK}
                    droppableId={DROPPABLE_IDS.BACK_DUN}
                    cards={backDunCards}
                    isDropDisabled={backDunCards.length >= 5 || isAiProcessing || isSubmitting}
                />
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
        </DragDropContext>
    );
};

export default GameBoard;
