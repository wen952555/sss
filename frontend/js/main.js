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
    // DOM Elements
    const dealButton = document.getElementById('deal-button');
    const resetButton = document.getElementById('reset-button');
    const confirmHandsButton = document.getElementById('confirm-hands-button'); // 新按钮

    const playerHandContainer = document.getElementById('player-hand');
    const frontHandContainer = document.getElementById('front-hand');
    const middleHandContainer = document.getElementById('middle-hand');
    const backHandContainer = document.getElementById('back-hand');
    const statusMessageElement = document.getElementById('status-message');

    const arrangedHandElements = {
        front: frontHandContainer,
        middle: middleHandContainer,
        back: backHandContainer
    };
    const allDropZoneElements = [playerHandContainer, frontHandContainer, middleHandContainer, backHandContainer];
    const arrangedHandDropZones = [frontHandContainer, middleHandContainer, backHandContainer];

    const requiredCardCounts = { front: 3, middle: 5, back: 5 };

    // Initial UI State
    toggleButtonVisibility(resetButton, false);
    toggleButtonVisibility(confirmHandsButton, false);
    clearAllHandEvaluationDisplays();


    // Event Listeners
    dealButton.addEventListener('click', handleDeal);
    resetButton.addEventListener('click', handleReset);
    confirmHandsButton.addEventListener('click', handleConfirmHands);


    // --- Event Handlers ---
    async function handleDeal() {
        setButtonDisabled(dealButton, true);
        setButtonDisabled(confirmHandsButton, true); // 发牌时禁用确认按钮
        updateStatusMessage('正在发牌...', 'info', statusMessageElement);
        clearHandContainers(allDropZoneElements);
        clearAllHandEvaluationDisplays(); // 清除旧的牌型显示
        toggleButtonVisibility(confirmHandsButton, false); // 隐藏确认按钮直到牌摆好

        try {
            const dealData = await fetchDeal();
            if (dealData && dealData.hand) {
                const initialCardsForUI = initializeHandData(dealData.hand);
                displayCards(initialCardsForUI, playerHandContainer);
                makeCardsDraggable('.card');
                updateStatusMessage(dealData.message || '发牌成功！请拖动牌。', 'success', statusMessageElement);
                toggleButtonVisibility(resetButton, true);
                setButtonText(dealButton, '重新发牌');
            } else {
                throw new Error('从后端获取牌数据格式不正确');
            }
        } catch (error) {
            console.error('发牌失败:', error);
            updateStatusMessage(`发牌错误: ${error.message || '未知错误'}`, 'error', statusMessageElement);
        } finally {
            setButtonDisabled(dealButton, false);
            // 确认按钮的状态由 onCardDrop 控制
        }
    }

    function handleReset() {
        clearHandContainers(arrangedHandDropZones);
        clearAllHandEvaluationDisplays();
        const originalCardsForUI = getOriginalHandDataArray();
        if (originalCardsForUI.length > 0) {
            displayCards(originalCardsForUI, playerHandContainer);
            makeCardsDraggable('.card');
             updateStatusMessage('牌已重置到初始位置。', 'success', statusMessageElement);
        } else {
            // 如果还没有发过牌，originalHandDataArray可能是空的
            updateStatusMessage('请先发牌。', 'info', statusMessageElement);
        }
       
        toggleButtonVisibility(confirmHandsButton, false);
        // 确保 dealButton 和 resetButton 的状态正确
        setButtonDisabled(dealButton, false);
        setButtonDisabled(confirmHandsButton, true); // 重置后需要重新摆牌才能确认
    }

    async function handleConfirmHands() {
        setButtonDisabled(confirmHandsButton, true);
        setButtonDisabled(dealButton, true); // 确认期间禁止重新发牌
        setButtonDisabled(resetButton, true); // 确认期间禁止重置

        updateStatusMessage('正在提交牌型进行校验...', 'info', statusMessageElement);
        clearAllHandEvaluationDisplays(); // 清除旧的显示，准备显示新的结果

        const handsData = {
            front: getCardsFromContainerForApi(frontHandContainer),
            middle: getCardsFromContainerForApi(middleHandContainer),
            back: getCardsFromContainerForApi(backHandContainer)
        };

        // 可以在这里添加前端的初步校验，例如牌数是否正确
        if (handsData.front.length !== requiredCardCounts.front ||
            handsData.middle.length !== requiredCardCounts.middle ||
            handsData.back.length !== requiredCardCounts.back) {
            updateStatusMessage('牌数不正确！头道3张，中尾道各5张。', 'error', statusMessageElement);
            setButtonDisabled(confirmHandsButton, false); // 允许用户修正后再次点击
            setButtonDisabled(dealButton, false);
            setButtonDisabled(resetButton, false);
            return;
        }

        try {
            const result = await submitArrangedHands(handsData);
            // 后端返回的 result 结构示例:
            // {
            //   "front_eval": {"type_name": "对子", "strength": [2, 10, 14]},
            //   "middle_eval": {"type_name": "顺子", "strength": [5, 9]},
            //   "back_eval": {"type_name": "同花", "strength": [6, 14, 12, 10, 8, 5]},
            //   "is_daoshui": false,
            //   "message": "牌型校验通过"
            // }
            if (result) {
                updateStatusMessage(result.message || '牌型校验完成。', result.is_daoshui ? 'error' : 'success', statusMessageElement);

                if (result.front_eval) {
                    updateHandEvaluationDisplay('front', result.front_eval.type_name, result.is_daoshui && result.daoshui_offender === 'front');
                }
                if (result.middle_eval) {
                    updateHandEvaluationDisplay('middle', result.middle_eval.type_name, result.is_daoshui && (result.daoshui_offender === 'middle' || result.daoshui_offender === 'front'));
                }
                if (result.back_eval) {
                    updateHandEvaluationDisplay('back', result.back_eval.type_name);
                }

                if(result.is_daoshui){
                    // 可以在此高亮倒水的牌道
                    // 例如，如果 front > middle, 则 front 和 middle 都标红
                    if(result.daoshui_details && result.daoshui_details.includes("头道大于中道")){
                        updateHandEvaluationDisplay('front', result.front_eval.type_name + " (倒)", true);
                        updateHandEvaluationDisplay('middle', result.middle_eval.type_name + " (被倒)", true);
                    }
                    if(result.daoshui_details && result.daoshui_details.includes("中道大于尾道")){
                         if(!result.daoshui_details.includes("头道大于中道")) { // 避免重复标红中道
                            updateHandEvaluationDisplay('middle', result.middle_eval.type_name + " (倒)", true);
                         } else { // 如果头道也倒了中道，中道本身就是被倒
                             updateHandEvaluationDisplay('middle', result.middle_eval.type_name + " (被头道倒)", true);
                         }
                        updateHandEvaluationDisplay('back', result.back_eval.type_name + " (被倒)", true);
                    }
                }

                // 可以在这里根据游戏状态决定下一步操作，例如等待其他玩家或开始比牌
            } else {
                throw new Error("服务器返回的校验结果格式不正确。");
            }

        } catch (error) {
            console.error('提交牌型失败:', error);
            updateStatusMessage(`提交错误: ${error.message || '未知错误'}`, 'error', statusMessageElement);
        } finally {
            // 即使用户倒水，也允许他们重新发牌或重置
            setButtonDisabled(dealButton, false);
            setButtonDisabled(resetButton, false);
            // 确认按钮通常在确认后会保持禁用，直到下一轮开始或重置
            // setButtonDisabled(confirmHandsButton, false); // 或者根据游戏流程决定是否重新启用
        }
    }


    // --- Callback for Drop Event ---
    function onCardDrop() {
        const arrangementComplete = checkArrangementComplete(arrangedHandElements, playerHandContainer, requiredCardCounts);

        if (arrangementComplete) {
            updateStatusMessage('牌已摆放完毕！请点击“确认牌型”。', 'success', statusMessageElement);
            toggleButtonVisibility(confirmHandsButton, true);
            setButtonDisabled(confirmHandsButton, false);
        } else {
            toggleButtonVisibility(confirmHandsButton, false);
            setButtonDisabled(confirmHandsButton, true);
            // ... (之前的提示逻辑)
            if (playerHandContainer.children.length > 0) {
                updateStatusMessage('请将所有牌摆放到头、中、尾道。', 'info', statusMessageElement);
            } else {
                let message = "请正确摆放牌：";
                if (frontHandContainer.children.length !== requiredCardCounts.front) message += ` 头道需${requiredCardCounts.front}张 (当前${frontHandContainer.children.length})。`;
                if (middleHandContainer.children.length !== requiredCardCounts.middle) message += ` 中道需${requiredCardCounts.middle}张 (当前${middleHandContainer.children.length})。`;
                if (backHandContainer.children.length !== requiredCardCounts.back) message += ` 尾道需${requiredCardCounts.back}张 (当前${backHandContainer.children.length})。`;
                updateStatusMessage(message, 'info', statusMessageElement);
            }
        }
        // 每次拖放后都清除牌型显示，因为牌已改变
        clearAllHandEvaluationDisplays();
    }

    // --- Initialization ---
    setupDropZones(allDropZoneElements, statusMessageElement, onCardDrop);

    testBackend()
        .then(data => console.log('Backend test successful:', data.message))
        .catch(error => console.error('Backend test failed:', error.message));

    // 可选: 测试后端的牌型评估 (如果需要)
    // testEvaluateHand()
    //     .then(data => console.log('Backend evaluation test successful:', data))
    //     .catch(error => console.error('Backend evaluation test failed:', error.message));
});
