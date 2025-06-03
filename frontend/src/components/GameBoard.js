// frontend/src/components/GameBoard.js
import React, { useState, useEffect, useMemo } from 'react'; // Keep hooks for now, will remove if not used in simplified version
// import socket from '../socket'; // Temporarily remove if not used
import HandDisplay from './HandDisplay';
// import { sortHand } from '../utils/cardUtils'; // Temporarily remove if not used
// import { DragDropContext } from 'react-beautiful-dnd'; // Temporarily remove DND
import './GameBoard.css';

// ★★★ 确保此区域绝对干净，只有 imports 和 const 定义 ★★★

const DUN_NAMES = { FRONT: "头墩", MIDDLE: "中墩", BACK: "尾墩" };
// const DROPPABLE_IDS = { /* ... */ }; // DND related, remove for now

const GameBoard = ({ roomId, myPlayerId, initialHand, onArrangementInvalid }) => {
    // ★★★ 确保这里，在函数体开始处，没有 return ★★★

    // 简化状态，只保留最基本的显示
    const [frontDunCards, setFrontDunCards] = useState([]);
    const [middleDunCards, setMiddleDunCards] = useState([]); // This will be the "true" middle dun
    const [backDunCards, setBackDunCards] = useState([]);
    const [currentHandPool, setCurrentHandPool] = useState([]); // All cards not in a dun

    // 简化 middleDunIsActivePlacementArea
    const middleDunIsActivePlacementArea = useMemo(() => {
        return frontDunCards.length === 3 && backDunCards.length === 5;
    }, [frontDunCards.length, backDunCards.length]);

    useEffect(() => {
        if (initialHand && initialHand.length === 13) {
            // setCurrentHandPool(sortHand([...initialHand])); // sortHand might not be imported
            setCurrentHandPool([...initialHand]); // Simplified
            setFrontDunCards([]);
            setMiddleDunCards([]);
            setBackDunCards([]);
        } else {
            setCurrentHandPool([]);
            setFrontDunCards([]);
            setMiddleDunCards([]);
            setBackDunCards([]);
        }
    }, [initialHand]);

    // 暂时移除所有事件处理器和复杂逻辑
    // const onDragEnd = (result) => { /* ... */ };
    // const handleAiArrange = () => { /* ... */ };
    // const handleSubmitArrangement = () => { /* ... */ };
    // ... other useEffects for socket events ...

    if (!initialHand || initialHand.length === 0) {
        return <div className="game-board-container"><p className="loading-text-inner">等待手牌 (简化版)...</p></div>;
    }

    return (
        // <DragDropContext onDragEnd={onDragEnd}> // Temporarily remove DND Context
        <> {/* Use Fragment or a div */}
            <div className="dun-area header-dun-area">
                <HandDisplay
                    title={DUN_NAMES.FRONT}
                    // droppableId={DROPPABLE_IDS.FRONT_DUN} // DND related
                    cards={frontDunCards}
                    // isDropDisabled={/*...*/}
                />
            </div>

            <div className="hand-middle-dun-area">
                {!middleDunIsActivePlacementArea ? (
                    <HandDisplay
                        title="手牌区 (简化版)"
                        // droppableId={DROPPABLE_IDS.CURRENT_HAND_POOL} // DND related
                        cards={currentHandPool}
                        // isDropDisabled={/*...*/}
                        // type="HAND_POOL"
                        containerClassName="is-hand-pool"
                    />
                ) : (
                    <>
                        <HandDisplay
                            title={DUN_NAMES.MIDDLE}
                            // droppableId={DROPPABLE_IDS.MIDDLE_DUN_LOGICAL} // DND related
                            cards={middleDunCards}
                            // isDropDisabled={/*...*/}
                        />
                        {currentHandPool.length > 0 && (
                            <div className="remaining-for-middle-dun">
                                <HandDisplay
                                    title="剩余手牌 (简化版)"
                                    // droppableId={DROPPABLE_IDS.CURRENT_HAND_POOL} // DND related
                                    cards={currentHandPool}
                                    // isDropDisabled={/*...*/}
                                    // type="HAND_POOL"
                                    containerClassName="is-hand-pool"
                                />
                            </div>
                        )}
                    </>
                )}
            </div>
            
            <div className="dun-area footer-dun-area">
                <HandDisplay
                    title={DUN_NAMES.BACK}
                    // droppableId={DROPPABLE_IDS.BACK_DUN} // DND related
                    cards={backDunCards}
                    // isDropDisabled={/*...*/}
                />
            </div>

            <div className="action-buttons-banner">
                {/* 暂时移除按钮以简化 */}
                <p>(按钮区简化版)</p> 
            </div>
        </>
        // </DragDropContext>
    );
};

export default GameBoard;
