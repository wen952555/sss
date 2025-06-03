// frontend/src/components/GameBoard.js
import React, { useState, useEffect, useMemo } from 'react'; // 确保 React 和 Hooks 正确导入
import socket from '../socket';
import HandDisplay from './HandDisplay'; // Card 组件由 HandDisplay 内部使用
import { sortHand } from '../utils/cardUtils';
import { DragDropContext } from 'react-beautiful-dnd';
import './GameBoard.css';

// ★★★ 确保在这个位置 (import之后，组件定义之前) 没有任何 'return' 语句 ★★★
// ★★★ 也没有任何未赋值的JSX表达式或其他游离的JavaScript代码 ★★★

const DUN_NAMES = { FRONT: "头墩", MIDDLE: "中墩", BACK: "尾墩" };
const DROPPABLE_IDS = {
    FRONT_DUN: 'FRONT_DUN_ID',
    MIDDLE_DUN_LOGICAL: 'MIDDLE_DUN_LOGICAL_ID',
    BACK_DUN: 'BACK_DUN_ID',
    CURRENT_HAND_POOL: 'CURRENT_HAND_POOL_ID'
};

const GameBoard = ({ roomId, myPlayerId, initialHand, onArrangementInvalid }) => {
    // ★★★ 确保这里 (useState等hooks调用之前) 也没有 'return' ★★★
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
        // ★★★ 确保 onDragEnd 函数体内的所有 return 都在正确的逻辑分支中 ★★★
        const { source, destination, draggableId } = result;
        if (!destination || (source.droppableId === destination.droppableId && source.index === destination.index)) {
            return; // 合法的 return
        }
        setError('');
        if (isAiProcessing || isSubmitting) return; // 合法的 return

        let draggedCard;
        let sourceList, setSourceListFunc;

        if (source.droppableId === DROPPABLE_IDS.CURRENT_HAND_POOL) {
            sourceList = [...currentHandPool];
            setSourceListFunc = setCurrentHandPool;
        } else if (source.droppableId === DROPPABLE_IDS.FRONT_DUN) {
            sourceList = [...frontDunCards];
            setSourceListFunc = setFrontDunCards;
        } else if (source.droppableId === DROPPABLE_IDS.MIDDLE_DUN_LOGICAL) {
            sourceList = [...middleDunCards];
            setSourceListFunc = setMiddleDunCards;
        } else if (source.droppableId === DROPPABLE_IDS.BACK_DUN) {
            sourceList = [...backDunCards];
            setSourceListFunc = setBackDunCards;
        } else { 
            console.warn("onDragEnd: Unknown source droppableId", source.droppableId);
            return; // 合法的 return
        }
        
        draggedCard = sourceList.find(card => card.id === draggableId);
        if (!draggedCard) {
            console.error("onDragEnd: Dragged card not found in source list", draggableId, sourceList);
            return; // 合法的 return
        }
        const newSourceList = sourceList.filter(card => card.id !== draggableId);

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
            return; // 合法的 return
        }

        if (destList.length >= destCapacity && destination.droppableId !== DROPPABLE_IDS.CURRENT_HAND_POOL) {
            setError(`${destListName} 已满 (${destCapacity}张)。`);
            return; // 合法的 return
        }
        
        setSourceListFunc(sortHand(newSourceList));
        const newDestList = [...destList];
        newDestList.splice(destination.index, 0, draggedCard);
        setDestListFunc(sortHand(newDestList));
    };

    const handleAiArrange = () => { 
        if (!initialHand || initialHand.length !== 13) { setError("手牌信息不完整，无法使用AI分牌。"); return; }
        if (isAiProcessing || isSubmitting) return;
        setError(''); setIsAiProcessing(true);
        setFrontDunCards([]); setMiddleDunCards([]); setBackDunCards([]);
        setCurrentHandPool([]); 
        socket.emit('requestAIArrangement', { roomId });
    };
    useEffect(() => { 
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
    }, [initialHand, roomId]); // roomId was missing as a dependency in some previous versions, ensure it's there if used in effect

    useEffect(() => { 
        const handleManualArrangementInvalid = (message) => { if (onArrangementInvalid) { setError(message); setIsSubmitting(false); } };
        socket.on('arrangementInvalid', handleManualArrangementInvalid); 
        return () => { socket.off('arrangementInvalid', handleManualArrangementInvalid); };
    }, [onArrangementInvalid]);

    const handleSubmitArrangement = () => { 
        if (isAiProcessing || isSubmitting) return;
        setError('');
        if (frontDunCards.length !== 3 || middleDunCards.length !== 5 || backDunCards.length !== 5) { setError('三墩牌必须完整摆放 (头3, 中5, 尾5)。'); return; }
        if (currentHandPool.length > 0) { setError('您还有未分配到墩的牌。'); return; }
        const arrangementIds = { front: frontDunCards.map(c => c.id), middle: middleDunCards.map(c => c.id), back: backDunCards.map(c => c.id) };
        setIsSubmitting(true);
        socket.emit('submitArrangement', { roomId, arrangement: arrangementIds });
    };
    
    if (!initialHand || initialHand.length === 0) {
        // 这个 return 是在函数组件 GameBoard 内部，是合法的
        return <div className="game-board-container"><p className="loading-text-inner">等待手牌...</p></div>;
    }
    
    const allCardsPlacedInDuns = currentHandPool.length === 0 && 
                                 frontDunCards.length === 3 &&
                                 middleDunCards.length === 5 &&
                                 backDunCards.length === 5;

    // ★★★ 这是 GameBoard 组件的主 return 语句，必须在函数体最后 ★★★
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

            {/* 中间区域 */}
            <div className="hand-middle-dun-area">
                {!middleDunIsActivePlacementArea ? (
                    <HandDisplay
                        title="手牌区 (请先摆满头尾墩)"
                        droppableId={DROPPABLE_IDS.CURRENT_HAND_POOL}
                        cards={currentHandPool}
                        isDropDisabled={isAiProcessing || isSubmitting}
                        type="HAND_POOL"
                        containerClassName="is-hand-pool"
                    />
                ) : (
                    <>
                        <HandDisplay
                            title={DUN_NAMES.MIDDLE}
                            droppableId={DROPPABLE_IDS.MIDDLE_DUN_LOGICAL}
                            cards={middleDunCards}
                            isDropDisabled={isAiProcessing || isSubmitting || middleDunCards.length >= 5}
                        />
                        {currentHandPool.length > 0 && (
                            <div className="remaining-for-middle-dun">
                                <HandDisplay
                                    title="剩余手牌 (拖拽到中墩)"
                                    droppableId={DROPPABLE_IDS.CURRENT_HAND_POOL}
                                    cards={currentHandPool}
                                    isDropDisabled={isAiProcessing || isSubmitting}
                                    type="HAND_POOL"
                                    containerClassName="is-hand-pool"
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
}; // ★★★ 确保 GameBoard 函数定义的 '}' 在这里正确闭合 ★★★

export default GameBoard;
