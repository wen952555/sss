// frontend/js/main.js
import { fetchDeal, testBackend, testEvaluateHand, submitArrangedHands } from './apiService.js';
import {
    displayCards, updateStatusMessage, clearHandContainers,
    toggleButtonVisibility, setButtonText, setButtonDisabled,
    updateHandEvaluationDisplay, clearAllHandEvaluationDisplays
} from './ui.js';
import {
    initializeHandData, getOriginalHandDataArray, makeCardsDraggable,
    setupDropZones, checkArrangementComplete, getCardsFromContainerForApi
} from './gameLogic.js';

document.addEventListener('DOMContentLoaded', () => {
    const dealButton = document.getElementById('deal-button');
    const resetButton = document.getElementById('reset-button');
    const confirmHandsButton = document.getElementById('confirm-hands-button');
    const playerHandContainer = document.getElementById('player-hand');
    const frontHandContainer = document.getElementById('front-hand');
    const middleHandContainer = document.getElementById('middle-hand');
    const backHandContainer = document.getElementById('back-hand');
    const statusMessageElement = document.getElementById('status-message');
    const arrangedHandElements = { front: frontHandContainer, middle: middleHandContainer, back: backHandContainer };
    const allDropZoneElements = [playerHandContainer, frontHandContainer, middleHandContainer, backHandContainer];
    const arrangedHandDropZones = [frontHandContainer, middleHandContainer, backHandContainer];
    const requiredCardCounts = { front: 3, middle: 5, back: 5 };

    function setInitialButtonStates(isErrorState = false) {
        setButtonDisabled(dealButton, false);
        setButtonText(dealButton, '发牌');
        toggleButtonVisibility(resetButton, isErrorState ? true : false); // 如果是错误恢复，重置按钮可能需要可见
        setButtonDisabled(resetButton, isErrorState ? false : true);
        toggleButtonVisibility(confirmHandsButton, false);
        setButtonDisabled(confirmHandsButton, true);
    }

    setInitialButtonStates();
    clearAllHandEvaluationDisplays();

    dealButton.addEventListener('click', handleDeal);
    resetButton.addEventListener('click', handleReset);
    confirmHandsButton.addEventListener('click', handleConfirmHands);

    async function handleDeal() {
        setButtonDisabled(dealButton, true); setButtonDisabled(resetButton, true);
        setButtonDisabled(confirmHandsButton, true); toggleButtonVisibility(confirmHandsButton, false);
        updateStatusMessage('正在发牌...', 'info', statusMessageElement);
        clearHandContainers(allDropZoneElements); clearAllHandEvaluationDisplays();
        let dealData = null;
        try {
            dealData = await fetchDeal(); // {hand: [], message: ""}
            if (dealData && dealData.hand && dealData.hand.length > 0) {
                const initialCardsForUI = initializeHandData(dealData.hand);
                displayCards(initialCardsForUI, playerHandContainer);
                makeCardsDraggable('.card');
                updateStatusMessage(dealData.message || '发牌成功！请拖动牌。', 'success', statusMessageElement);
                setButtonText(dealButton, '重新发牌');
                toggleButtonVisibility(resetButton, true); setButtonDisabled(resetButton, false);
                setButtonDisabled(dealButton, false); // 重新发牌可用
            } else {
                throw new Error(dealData?.message || '未收到有效的牌数据。');
            }
        } catch (error) {
            console.error('发牌操作失败:', error);
            updateStatusMessage(`发牌错误: ${error.message}`, 'error', statusMessageElement);
            setInitialButtonStates(true); // 传入true表示是错误恢复状态
        }
    }

    function handleReset() {
        clearHandContainers(arrangedHandDropZones); clearAllHandEvaluationDisplays();
        const originalCardsForUI = getOriginalHandDataArray();
        if (originalCardsForUI && originalCardsForUI.length > 0) {
            displayCards(originalCardsForUI, playerHandContainer); makeCardsDraggable('.card');
            updateStatusMessage('牌已重置到初始位置。', 'success', statusMessageElement);
        } else {
            updateStatusMessage('没有可重置的牌。请先成功发牌。', 'info', statusMessageElement);
        }
        toggleButtonVisibility(confirmHandsButton, false); setButtonDisabled(confirmHandsButton, true);
        setButtonDisabled(dealButton, false); // 重置后，允许重新发牌
        // resetButton 保持可用，除非没有牌 (这种情况已在上面处理)
    }

    async function handleConfirmHands() {
        setButtonDisabled(confirmHandsButton, true); setButtonDisabled(dealButton, true); setButtonDisabled(resetButton, true);
        updateStatusMessage('正在提交牌型进行校验...', 'info', statusMessageElement);
        const handsData = {
            front: getCardsFromContainerForApi(frontHandContainer),
            middle: getCardsFromContainerForApi(middleHandContainer),
            back: getCardsFromContainerForApi(backHandContainer)
        };
        if (handsData.front.length !== requiredCardCounts.front || handsData.middle.length !== requiredCardCounts.middle || handsData.back.length !== requiredCardCounts.back) {
            updateStatusMessage('牌数不正确！头道3张，中尾道各5张。', 'error', statusMessageElement);
            setButtonDisabled(confirmHandsButton, false); setButtonDisabled(dealButton, false); setButtonDisabled(resetButton, false);
            return;
        }
        let submissionResult = null;
        try {
            submissionResult = await submitArrangedHands(handsData);
            if (submissionResult && typeof submissionResult.message !== 'undefined') {
                let finalMessage = submissionResult.message;
                if (submissionResult.thirteen_card_special && submissionResult.thirteen_card_special.type !== 0) {
                    finalMessage = `特殊牌型【${submissionResult.thirteen_card_special.name}】! ` + (submissionResult.is_daoshui ? submissionResult.message : "");
                }
                updateStatusMessage(finalMessage, submissionResult.is_daoshui ? 'error' : 'success', statusMessageElement);
                updateHandEvaluationDisplay('front', submissionResult.front_eval?.type_name || '---', submissionResult.is_daoshui && submissionResult.daoshui_details?.includes("头道大于中道"));
                updateHandEvaluationDisplay('middle', submissionResult.middle_eval?.type_name || '---', submissionResult.is_daoshui && (submissionResult.daoshui_details?.includes("头道大于中道") || submissionResult.daoshui_details?.includes("中道大于尾道")));
                updateHandEvaluationDisplay('back', submissionResult.back_eval?.type_name || '---', submissionResult.is_daoshui && submissionResult.daoshui_details?.includes("中道大于尾道"));
                if(submissionResult.is_daoshui && submissionResult.daoshui_details && submissionResult.daoshui_details.length > 0){ /* ... 倒水高亮逻辑省略 ... */ }
                
                const noOverallSpecial = !submissionResult.thirteen_card_special || submissionResult.thirteen_card_special.type === 0;
                if (noOverallSpecial && !submissionResult.is_daoshui) {
                    allDropZoneElements.forEach(zone => zone.classList.remove('drop-zone'));
                    document.querySelectorAll('.card').forEach(card => card.draggable = false);
                }
            } else { throw new Error("服务器校验结果格式不正确。"); }
        } catch (error) {
            console.error('提交牌型失败:', error);
            updateStatusMessage(`提交错误: ${error.message}`, 'error', statusMessageElement);
            setButtonDisabled(confirmHandsButton, false); setButtonDisabled(dealButton, false); setButtonDisabled(resetButton, false);
        } finally {
            if (submissionResult) {
                const isValidAndConfirmed = !submissionResult.is_daoshui && (!submissionResult.thirteen_card_special || submissionResult.thirteen_card_special.type === 0);
                const isSpecialConfirmed = submissionResult.thirteen_card_special && submissionResult.thirteen_card_special.type !== 0;
                setButtonDisabled(dealButton, isValidAndConfirmed || isSpecialConfirmed);
                setButtonDisabled(resetButton, isValidAndConfirmed || isSpecialConfirmed);
                setButtonDisabled(confirmHandsButton, submissionResult.is_daoshui ? false : true);
            }
        }
    }

    function onCardDrop() {
        const arrangementComplete = checkArrangementComplete(arrangedHandElements, playerHandContainer, requiredCardCounts);
        toggleButtonVisibility(confirmHandsButton, arrangementComplete);
        setButtonDisabled(confirmHandsButton, !arrangementComplete);
        if (arrangementComplete) {
            updateStatusMessage('牌已摆放完毕！请点击“确认牌型”。', 'success', statusMessageElement);
        } else {
            if (playerHandContainer.children.length > 0) { updateStatusMessage('请将所有牌摆放到头、中、尾道。', 'info', statusMessageElement); }
            else { /* ... 提示牌数不足逻辑省略 ... */ }
        }
        clearAllHandEvaluationDisplays();
    }
    
    setupDropZones(allDropZoneElements, statusMessageElement, onCardDrop);
    testBackend()
        .then(data => {
            console.log('Backend test successful:', data);
            if (data && data.success) { // 检查后端的 success 标志
                 updateStatusMessage(`后端连接: ${data.message || '成功'}`, 'info', statusMessageElement);
            } else {
                 updateStatusMessage(`后端连接测试返回非成功: ${data?.message || '未知错误'}`, 'error', statusMessageElement);
            }
        })
        .catch(error => {
            console.error('Backend test failed in main.js:', error);
            updateStatusMessage(`后端连接测试失败: ${error.message}`, 'error', statusMessageElement);
        });
});
