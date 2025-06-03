// frontend/src/components/GameBoard.js
// ... (imports and top-level constants/state/effects remain the same) ...
// ... (onDragEnd, handleAiArrange, other handlers remain the same) ...

    // ... (inside the return statement of GameBoard) ...
    return (
        <DragDropContext onDragEnd={onDragEnd}>
            {/* 头墩区 */}
            <div className="dun-area header-dun-area">
                <HandDisplay
                    title={DUN_NAMES.FRONT}
                    droppableId={DROPPABLE_IDS.FRONT_DUN}
                    cards={frontDunCards}
                    isDropDisabled={isAiProcessing || isSubmitting || frontDunCards.length >= 3}
                    // containerClassName="" // 普通墩不需要特殊类
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
                        containerClassName="is-hand-pool" // ★★★ 为手牌区添加特殊类 ★★★
                    />
                ) : (
                    <>
                        <HandDisplay
                            title={DUN_NAMES.MIDDLE}
                            droppableId={DROPPABLE_IDS.MIDDLE_DUN_LOGICAL}
                            cards={middleDunCards}
                            isDropDisabled={isAiProcessing || isSubmitting || middleDunCards.length >= 5}
                            // containerClassName=""
                        />
                        {currentHandPool.length > 0 && (
                            <div className="remaining-for-middle-dun">
                                <HandDisplay
                                    title="剩余手牌 (拖拽到中墩)"
                                    droppableId={DROPPABLE_IDS.CURRENT_HAND_POOL} 
                                    cards={currentHandPool}
                                    isDropDisabled={isAiProcessing || isSubmitting}
                                    type="HAND_POOL"
                                    containerClassName="is-hand-pool" // ★★★ 中墩候选区也视为手牌池类型 ★★★
                                />
                            </div>
                        )}
                        {/* ... (info prompts) ... */}
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
                    // containerClassName=""
                />
            </div>

            {/* ... (action-buttons-banner remains the same) ... */}
        </DragDropContext>
    );
// ... (rest of the GameBoard component) ...
