// frontend/src/components/GameBoard.js
import React, { useState, useEffect, useMemo } from 'react';
import socket from '../socket';
// import Card from './Card'; // Card is used by HandDisplay
import HandDisplay from './HandDisplay';
import { sortHand } from '../utils/cardUtils';
import { DragDropContext } from 'react-beautiful-dnd';
import './GameBoard.css';

const DUN_NAMES = { FRONT: "头墩", MIDDLE: "中墩", BACK: "尾墩" };
const DROPPABLE_IDS = {
    FRONT_DUN: 'FRONT_DUN_ID',
    MIDDLE_DUN_LOGICAL: 'MIDDLE_DUN_LOGICAL_ID', // The actual middle dun placement area
    BACK_DUN: 'BACK_DUN_ID',
    CURRENT_HAND_POOL: 'CURRENT_HAND_POOL_ID'   // Where remaining cards are initially or returned to
};

const GameBoard = ({ roomId, myPlayerId, initialHand, onArrangementInvalid }) => {
    const [frontDunCards, setFrontDunCards] = useState([]);
    const [middleDunCards, setMiddleDunCards] = useState([]); // This is the ACTUAL middle dun
    const [backDunCards, setBackDunCards] = useState([]);
    const [currentHandPool, setCurrentHandPool] = useState([]); // Cards not yet in any of the 3 duns
    
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isAiProcessing, setIsAiProcessing] = useState(false);

    const middleDunIsActivePlacementArea = useMemo(() => {
        // console.log("Checking middleDunIsActive:", frontDunCards.length, backDunCards.length);
        return frontDunCards.length === 3 && backDunCards.length === 5;
    }, [frontDunCards.length, backDunCards.length]);

    useEffect(() => {
        if (initialHand && initialHand.length === 13) {
            setCurrentHandPool(sortHand([...initialHand]));
            setFrontDunCards([]);
            setMiddleDunCards([]); // Middle dun starts empty
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

        // Determine source list and its setter
        if (source.droppableId === DROPPABLE_IDS.CURRENT_HAND_POOL) {
            sourceList = [...currentHandPool];
            setSourceListFunc = setCurrentHandPool;
        } else if (source.droppableId === DROPPABLE_IDS.FRONT_DUN) {
            sourceList = [...frontDunCards];
            setSourceListFunc = setFrontDunCards;
        } else if (source.droppableId === DROPPABLE_IDS.MIDDLE_DUN_LOGICAL) { // Moving FROM actual middle dun
            sourceList = [...middleDunCards];
            setSourceListFunc = setMiddleDunCards;
        } else if (source.droppableId === DROPPABLE_IDS.BACK_DUN) {
            sourceList = [...backDunCards];
            setSourceListFunc = setBackDunCards;
        } else { return; }
        
        draggedCard = sourceList.find(card => card.id === draggableId);
        if (!draggedCard) return;
        const newSourceList = sourceList.filter(card => card.id !== draggableId);

        // Determine destination list, its setter, capacity, and name
        let destList, setDestListFunc, destCapacity, destListName;
        let isValidDestination = true;

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
        } else if (destination.droppableId === DROPPABLE_IDS.MIDDLE_DUN_LOGICAL) {
            if (!middleDunIsActivePlacementArea) {
                setError("请先将头墩(3张)和尾墩(5张)摆满，才能操作中墩。");
                isValidDestination = false;
            } else {
                destList = [...middleDunCards.filter(card => card.id !== draggableId)];
                setDestListFunc = setMiddleDunCards;
                destCapacity = 5;
                destListName = DUN_NAMES.MIDDLE;
            }
        } else if (destination.droppableId === DROPPABLE_IDS.BACK_DUN) {
            destList = [...backDunCards.filter(card => card.id !== draggableId)];
            setDestListFunc = setBackDunCards;
            destCapacity = 5;
            destListName = DUN_NAMES.BACK;
        } else {
            isValidDestination = false; 
        }

        if (!isValidDestination) {
            // No state change needed if destination is invalid, card remains in source effectively
            return;
        }

        if (destList.length >= destCapacity && destination.droppableId !== DROPPABLE_IDS.CURRENT_HAND_POOL) {
            setError(`${destListName} 已满 (${destCapacity}张)。`);
            return; 
        }
        
        // Only update source list if card is successfully moved to a valid, non-full destination
        setSourceListFunc(sortHand(newSourceList));

        const newDestList = [...destList];
        newDestList.splice(destination.index, 0, draggedCard);
        setDestListFunc(sortHand(newDestList));
    };

    // AI and other handlers remain largely the same
    const handleAiArrange = () => { /* ... (保持不变) ... */ 
        if (!initialHand || initialHand.length !== 13) { setError("手牌信息不完整，无法使用AI分牌。"); return; }
        if (isAiProcessing || isSubmitting) return;
        setError(''); setIsAiProcessing(true);
        setFrontDunCards([]); setMiddleDunCards([]); setBackDunCards([]);
        setCurrentHandPool([]); 
        socket.emit('requestAIArrangement', { roomId });
    };
    useEffect(() => { /* ... (AI 结果处理，确保 setCurrentHandPool([]) 且三墩被正确设置) ... */ 
        const handleAiArrangementReady = ({ arrangement }) => {
            if (!initialHand || initialHand.length === 0) { setIsAiProcessing(false); setError("AI分牌时手牌数据丢失，请重试。"); if (initialHand && initialHand.length === 13) { setCurrentHandPool(sortHand([...initialHand]));} return; }
            const mapIdsToCardsFromInitial = (ids) => ids.map(id => initialHand.find(card => card.id === id)).filter(Boolean);
            const aiFront = sortHand(mapIdsToCardsFromInitial(arrangement.front));
            const aiMiddle = sortHand(mapIdsToCardsFromInitial(arrangement.middle));
            const aiBack = sortHand(mapIdsToCardsFromInitial(arrangement.back));
            if (aiFront.length !== 3 || aiMiddle.length !== 5 || aiBack.length !== 5) { setError("AI返回的牌墩数量错误，请手动摆牌。"); setCurrentHandPool(sortHand([...initialHand]));
            } else { setFrontDunCards(aiFront); setMiddleDunCards(aiMiddle); setBackDunCards(aiBack); setCurrentHandPool([]); setError(''); } // AI分配了所有牌
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
        if (currentHandPool.length > 0) { setError('您还有未分配到墩的牌。'); return; } // 确保所有牌都从手牌池分配出去了
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
    
    // console.log("Middle Dun Active:", middleDunIsActivePlacementArea, "Hand Pool:", currentHandPool.length, "Middle Dun:", middleDunCards.length);

    return (
        <DragDropContext onDragEnd={onDragEnd}>
            {/* 头墩区 */}
            <div className="dun-area header-dun-area">
                <HandDisplay
                    title={DUN_NAMES.FRONT}
                    droppableId={DROPPABLE_IDS.FRONT_DUN}
                    cards={frontDunCards}
                    isDropDisabled={isAiProcessing || isSubmitting || frontDunCards.length >= 3}
                />
            </div>

            {/* 中间区域：根据 middleDunIsActivePlacementArea 切换 */}
            <div className="hand-middle-dun-area">
                {!middleDunIsActivePlacementArea ? (
                    // 状态1: 作为手牌池 (头尾未满)
                    <HandDisplay
                        title="手牌区 (请先摆满头尾墩)" // 这个title会作为背景文字
                        droppableId={DROPPABLE_IDS.CURRENT_HAND_POOL}
                        cards={currentHandPool} // 显示所有未分配的牌
                        isDropDisabled={isAiProcessing || isSubmitting}
                        type="HAND_POOL" // 可以给手牌池一个不同的类型
                    />
                ) : (
                    // 状态2: 作为中墩置牌区 (头尾已满)
                    <>
                        <HandDisplay
                            title={DUN_NAMES.MIDDLE} // 背景文字是“中墩”
                            droppableId={DROPPABLE_IDS.MIDDLE_DUN_LOGICAL}
                            cards={middleDunCards} // 显示已放入中墩的牌
                            isDropDisabled={isAiProcessing || isSubmitting || middleDunCards.length >= 5}
                        />
                        {/* 如果手牌池还有牌 (即中墩的候选牌)，则显示出来 */}
                        {currentHandPool.length > 0 && (
                            <div className="remaining-for-middle-dun">
                                <HandDisplay
                                    title="剩余手牌 (拖拽到中墩)" // 背景文字
                                    droppableId={DROPPABLE_IDS.CURRENT_HAND_POOL} // 拖到这里也算回手牌池
                                    cards={currentHandPool}
                                    isDropDisabled={isAiProcessing || isSubmitting}
                                    type="HAND_POOL"
                                />
                            </div>
                        )}
                         {currentHandPool.length === 0 && middleDunCards.length < 5 && (
                            <p className="info-prompt">中墩还未摆满 ({middleDunCards.length}/5)。</p>
                         )}
                    </>
                )}
            </div>
            
            {/* 尾墩区 */}
            <div className="dun-area footer-dun-area">
                <HandDisplay
                    title={DUN_NAMES.BACK}
                    droppableId={DROPPABLE_IDS.BACK_DUN}
                    cards={backDunCards}
                    isDropDisabled={isAiProcessing || isSubmitting || backDunCards.length >= 5}
                />
            </div>

            {/* 按钮区 */}
            <div className="action-buttons-banner">
                {error && <p className="error-message gameboard-error">{error}</p>}
                <button /* ... AI button ... */ 
                    className="ai-arrange-button"
                    onClick={handleAiArrange}
                    disabled={isAiProcessing || isSubmitting || !initialHand || initialHand.length !== 13}
                >
                    {isAiProcessing ? 'AI计算中...' : 'AI自动分牌'}
                </button>
                <button /* ... Submit button ... */
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
