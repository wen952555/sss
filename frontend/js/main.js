// frontend/js/main.js
import { fetchDeal, testBackend, submitArrangedHands } from './apiService.js';
import { displayCards, updateStatusMessage, clearHandContainers, toggleButtonVisibility, setButtonText, setButtonDisabled, updateHandEvaluationDisplay, clearAllHandEvaluationDisplays } from './ui.js';
import { initializeHandData, getOriginalHandDataArray, makeCardsDraggable, setupDropZones, checkArrangementComplete, getCardsFromContainerForApi } from './gameLogic.js';

document.addEventListener('DOMContentLoaded', () => {
    const dealButton = document.getElementById('deal-button'), resetButton = document.getElementById('reset-button'), confirmHandsButton = document.getElementById('confirm-hands-button');
    const playerHandContainer = document.getElementById('player-hand'), frontHandContainer = document.getElementById('front-hand'), middleHandContainer = document.getElementById('middle-hand'), backHandContainer = document.getElementById('back-hand'), statusMessageElement = document.getElementById('status-message');
    const arrangedHandElements = { front: frontHandContainer, middle: middleHandContainer, back: backHandContainer };
    const allDropZoneElements = [playerHandContainer, frontHandContainer, middleHandContainer, backHandContainer];
    const arrangedHandDropZones = [frontHandContainer, middleHandContainer, backHandContainer];
    const requiredCardCounts = { front: 3, middle: 5, back: 5 };
    let currentDealData = null; // To store server response for handleConfirmHands

    function setInitialButtonStates() {
        setButtonDisabled(dealButton, false); toggleButtonVisibility(resetButton, false); setButtonDisabled(resetButton, true);
        toggleButtonVisibility(confirmHandsButton, false); setButtonDisabled(confirmHandsButton, true); setButtonText(dealButton, '发牌');
    }
    setInitialButtonStates(); clearAllHandEvaluationDisplays();

    dealButton.addEventListener('click', handleDeal); resetButton.addEventListener('click', handleReset); confirmHandsButton.addEventListener('click', handleConfirmHands);

    async function handleDeal() {
        setButtonDisabled(dealButton, true); setButtonDisabled(resetButton, true); setButtonDisabled(confirmHandsButton, true); toggleButtonVisibility(confirmHandsButton, false);
        updateStatusMessage('正在发牌...', 'info', statusMessageElement); clearHandContainers(allDropZoneElements); clearAllHandEvaluationDisplays();
        currentDealData = null; // Reset current deal data

        try {
            const dealData = await fetchDeal(); currentDealData = dealData; // Store response
            if (dealData && dealData.hand && dealData.hand.length > 0) {
                const initialCardsForUI = initializeHandData(dealData.hand); displayCards(initialCardsForUI, playerHandContainer); makeCardsDraggable('.card');
                updateStatusMessage(dealData.message || '发牌成功！请拖动牌。', 'success', statusMessageElement);
                setButtonText(dealButton, '重新发牌'); toggleButtonVisibility(resetButton, true); setButtonDisabled(resetButton, false);
                setButtonDisabled(dealButton, false); // Enable re-deal
            } else { updateStatusMessage('发牌失败：未收到有效的牌数据。', 'error', statusMessageElement); setInitialButtonStates(); return; }
        } catch (error) { console.error('发牌失败:', error); updateStatusMessage(`发牌错误: ${error.message || '未知错误'}`, 'error', statusMessageElement); setInitialButtonStates(); }
    }

    function handleReset() {
        clearHandContainers(arrangedHandDropZones); clearAllHandEvaluationDisplays();
        const originalCardsForUI = getOriginalHandDataArray();
        if (originalCardsForUI && originalCardsForUI.length > 0) {
            displayCards(originalCardsForUI, playerHandContainer); makeCardsDraggable('.card');
            updateStatusMessage('牌已重置到初始位置。', 'success', statusMessageElement);
        } else { updateStatusMessage('没有可重置的牌。请先发牌。', 'info', statusMessageElement); }
        toggleButtonVisibility(confirmHandsButton, false); setButtonDisabled(confirmHandsButton, true);
        setButtonDisabled(dealButton, !(originalCardsForUI && originalCardsForUI.length > 0)); // if no original cards, disable deal
        setButtonDisabled(resetButton, !(originalCardsForUI && originalCardsForUI.length > 0));
    }

    async function handleConfirmHands() {
        setButtonDisabled(confirmHandsButton, true); setButtonDisabled(dealButton, true); setButtonDisabled(resetButton, true);
        updateStatusMessage('正在提交牌型进行校验...', 'info', statusMessageElement);
        const handsData = { front: getCardsFromContainerForApi(frontHandContainer), middle: getCardsFromContainerForApi(middleHandContainer), back: getCardsFromContainerForApi(backHandContainer) };
        if (handsData.front.length !== requiredCardCounts.front || handsData.middle.length !== requiredCardCounts.middle || handsData.back.length !== requiredCardCounts.back) {
            updateStatusMessage('牌数不正确！头道3张，中尾道各5张。', 'error', statusMessageElement);
            setButtonDisabled(confirmHandsButton, false); setButtonDisabled(dealButton, false); setButtonDisabled(resetButton, false); return;
        }
        let submissionResult = null; // Variable to store result for finally block
        try {
            submissionResult = await submitArrangedHands(handsData);
            if (submissionResult) {
                updateStatusMessage(submissionResult.message || '牌型校验完成。', submissionResult.is_daoshui ? 'error' : 'success', statusMessageElement);
                updateHandEvaluationDisplay('front', submissionResult.front_eval?.type_name || '---', submissionResult.is_daoshui && submissionResult.daoshui_details?.includes("头道大于中道"));
                updateHandEvaluationDisplay('middle', submissionResult.middle_eval?.type_name || '---', submissionResult.is_daoshui && (submissionResult.daoshui_details?.includes("头道大于中道") || submissionResult.daoshui_details?.includes("中道大于尾道")));
                updateHandEvaluationDisplay('back', submissionResult.back_eval?.type_name || '---', submissionResult.is_daoshui && submissionResult.daoshui_details?.includes("中道大于尾道"));
                if(submissionResult.is_daoshui){ /* detailed daoshui display logic (optional) */ }
                if (!submissionResult.is_daoshui) {
                    allDropZoneElements.forEach(zone => zone.classList.remove('drop-zone')); document.querySelectorAll('.card').forEach(card => card.draggable = false);
                    updateStatusMessage("牌型已确认！" + (submissionResult.message || ''), 'success', statusMessageElement);
                }
            } else { throw new Error("服务器返回的校验结果格式不正确。"); }
        } catch (error) { console.error('提交牌型失败:', error); updateStatusMessage(`提交错误: ${error.message || '未知错误'}`, 'error', statusMessageElement);
            setButtonDisabled(confirmHandsButton, false); // Allow retry on error
        } finally {
            const isConfirmedAndValid = submissionResult && !submissionResult.is_daoshui;
            setButtonDisabled(dealButton, isConfirmedAndValid); setButtonDisabled(resetButton, isConfirmedAndValid);
            // Confirm button remains disabled after a successful valid submission
            // If error or daoshui, it might have been re-enabled in catch or should be here.
            if (!isConfirmedAndValid && !confirmHandsButton.disabled) { // if not valid and confirm button is enabled (e.g. after error)
                 // do nothing, it's already enabled for retry
            } else if (!isConfirmedAndValid && confirmHandsButton.disabled) { // if not valid, and confirm still disabled (e.g. error didn't re-enable)
                setButtonDisabled(confirmHandsButton, false);
            }
        }
    }

    function onCardDrop() {
        const arrangementComplete = checkArrangementComplete(arrangedHandElements, playerHandContainer, requiredCardCounts);
        if (arrangementComplete) {
            updateStatusMessage('牌已摆放完毕！请点击“确认牌型”。', 'success', statusMessageElement);
            toggleButtonVisibility(confirmHandsButton, true); setButtonDisabled(confirmHandsButton, false);
        } else {
            toggleButtonVisibility(confirmHandsButton, false); setButtonDisabled(confirmHandsButton, true);
            if (playerHandContainer.children.length > 0) updateStatusMessage('请将所有牌摆放到头、中、尾道。', 'info', statusMessageElement);
            else { let msg = "请正确摆放牌：";
                if (arrangedHandElements.front.children.length !== requiredCardCounts.front) msg += ` 头道${requiredCardCounts.front}张 (差${requiredCardCounts.front - arrangedHandElements.front.children.length})。`;
                if (arrangedHandElements.middle.children.length !== requiredCardCounts.middle) msg += ` 中道${requiredCardCounts.middle}张 (差${requiredCardCounts.middle - arrangedHandElements.middle.children.length})。`;
                if (arrangedHandElements.back.children.length !== requiredCardCounts.back) msg += ` 尾道${requiredCardCounts.back}张 (差${requiredCardCounts.back - arrangedHandElements.back.children.length})。`;
                updateStatusMessage(msg, 'info', statusMessageElement); }
        }
        clearAllHandEvaluationDisplays();
    }
    setupDropZones(allDropZoneElements, statusMessageElement, onCardDrop);
    testBackend().then(data => console.log('Backend test:', data?.message || 'OK')).catch(err => console.error('Backend test failed:', err.message));
});
