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
    const confirmHandsButton = document.getElementById('confirm-hands-button');

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

    // Function to set initial button states
    function setInitialButtonStates() {
        setButtonDisabled(dealButton, false); // 发牌按钮可用
        toggleButtonVisibility(resetButton, false); // 重置按钮初始隐藏
        setButtonDisabled(resetButton, true);      // 重置按钮初始禁用 (即使可见也应禁用)
        toggleButtonVisibility(confirmHandsButton, false); // 确认按钮初始隐藏
        setButtonDisabled(confirmHandsButton, true);  // 确认按钮初始禁用
        setButtonText(dealButton, '发牌');
    }

    // --- Initial UI State ---
    setInitialButtonStates();
    clearAllHandEvaluationDisplays();


    // --- Event Listeners ---
    dealButton.addEventListener('click', handleDeal);
    resetButton.addEventListener('click', handleReset);
    confirmHandsButton.addEventListener('click', handleConfirmHands);


    // --- Event Handlers ---
    async function handleDeal() {
        // 禁用所有操作按钮，防止重复点击
        setButtonDisabled(dealButton, true);
        setButtonDisabled(resetButton, true);
        setButtonDisabled(confirmHandsButton, true);
        toggleButtonVisibility(confirmHandsButton, false); // 确保确认按钮先隐藏

        updateStatusMessage('正在发牌...', 'info', statusMessageElement);
        clearHandContainers(allDropZoneElements);
        clearAllHandEvaluationDisplays();

        try {
            const dealData = await fetchDeal();
            if (dealData && dealData.hand && dealData.hand.length > 0) { // 确保有牌发出
                const initialCardsForUI = initializeHandData(dealData.hand);
                displayCards(initialCardsForUI, playerHandContainer);
                makeCardsDraggable('.card'); // 确保为新卡片启用拖拽

                updateStatusMessage(dealData.message || '发牌成功！请拖动牌。', 'success', statusMessageElement);
                setButtonText(dealButton, '重新发牌');
                toggleButtonVisibility(resetButton, true); // 显示重置按钮
                setButtonDisabled(resetButton, false);     // 启用重置按钮
            } else {
                // 如果后端没返回牌，或者返回空数组
                updateStatusMessage('发牌失败：未收到有效的牌数据。', 'error', statusMessageElement);
                setInitialButtonStates(); // 恢复到初始按钮状态
                return; // 提前退出，不修改dealButton的禁用状态
            }
        } catch (error) {
            console.error('发牌失败:', error);
            updateStatusMessage(`发牌错误: ${error.message || '未知错误'}`, 'error', statusMessageElement);
            setInitialButtonStates(); // 出错时恢复到初始按钮状态
            return; 
        } finally {
            // dealButton 的禁用状态在成功或失败时单独处理
            // 如果成功，dealButton仍然是'重新发牌'，应该是可用的
            // 如果失败，setInitialButtonStates会处理
            if (dealData && dealData.hand && dealData.hand.length > 0) { // 仅在成功发牌后启用dealButton（作为重新发牌）
                 setButtonDisabled(dealButton, false);
            }
        }
    }

    function handleReset() {
        clearHandContainers(arrangedHandDropZones);
        clearAllHandEvaluationDisplays();
        const originalCardsForUI = getOriginalHandDataArray();

        if (originalCardsForUI && originalCardsForUI.length > 0) {
            displayCards(originalCardsForUI, playerHandContainer);
            makeCardsDraggable('.card');
            updateStatusMessage('牌已重置到初始位置。', 'success', statusMessageElement);
        } else {
            // 如果没有原始手牌数据 (例如，还没成功发过牌就点了重置 - 虽然按钮应该被禁用)
            updateStatusMessage('没有可重置的牌。请先发牌。', 'info', statusMessageElement);
            // 这种情况理论上不应发生，因为resetButton在没有牌时应被禁用
        }
       
        toggleButtonVisibility(confirmHandsButton, false); // 隐藏确认按钮
        setButtonDisabled(confirmHandsButton, true);     // 禁用确认按钮
        // 重置后，用户应该可以重新发牌或再次整理（如果牌还在初始区）
        // resetButton 保持可用，dealButton 保持可用（作为“重新发牌”）
        setButtonDisabled(dealButton, false);
        setButtonDisabled(resetButton, false); // 重置按钮本身保持可用，除非没有牌可重置
    }

    async function handleConfirmHands() {
        setButtonDisabled(confirmHandsButton, true); // 禁用自己
        setButtonDisabled(dealButton, true);
        setButtonDisabled(resetButton, true);

        updateStatusMessage('正在提交牌型进行校验...', 'info', statusMessageElement);
        // clearAllHandEvaluationDisplays(); // 在提交前不清空，等待后端结果再更新

        const handsData = {
            front: getCardsFromContainerForApi(frontHandContainer),
            middle: getCardsFromContainerForApi(middleHandContainer),
            back: getCardsFromContainerForApi(backHandContainer)
        };

        if (handsData.front.length !== requiredCardCounts.front ||
            handsData.middle.length !== requiredCardCounts.middle ||
            handsData.back.length !== requiredCardCounts.back) {
            updateStatusMessage('牌数不正确！头道3张，中尾道各5张。', 'error', statusMessageElement);
            // 允许用户修正后再次点击，所以重新启用相关按钮
            setButtonDisabled(confirmHandsButton, false); // 允许再次确认
            setButtonDisabled(dealButton, false); // 允许重新发牌
            setButtonDisabled(resetButton, false); // 允许重置
            return;
        }

        try {
            const result = await submitArrangedHands(handsData);
            if (result) { // 假设后端总会返回一个包含success和message的对象
                updateStatusMessage(result.message || '牌型校验完成。', result.is_daoshui ? 'error' : 'success', statusMessageElement);

                // 更新牌型显示
                updateHandEvaluationDisplay('front', result.front_eval?.type_name || '---', result.is_daoshui && result.daoshui_details?.includes("头道大于中道"));
                updateHandEvaluationDisplay('middle', result.middle_eval?.type_name || '---', result.is_daoshui && (result.daoshui_details?.includes("头道大于中道") || result.daoshui_details?.includes("中道大于尾道")));
                updateHandEvaluationDisplay('back', result.back_eval?.type_name || '---', result.is_daoshui && result.daoshui_details?.includes("中道大于尾道"));

                if(result.is_daoshui){
                    // 可以根据 daoshui_details 进一步高亮倒水的牌道
                    if(result.daoshui_details?.includes("头道大于中道")){
                        const frontEvalText = result.front_eval?.type_name || '---';
                        const middleEvalText = result.middle_eval?.type_name || '---';
                        updateHandEvaluationDisplay('front', `${frontEvalText} (倒!)`, true);
                        updateHandEvaluationDisplay('middle', `${middleEvalText} (被倒!)`, true);
                    }
                    // 注意：如果头道倒中道，中道也倒尾道，中道会同时是倒水者和被倒水者，UI上需要清晰表达
                    if(result.daoshui_details?.includes("中道大于尾道")){
                        const middleEvalText = result.middle_eval?.type_name || '---';
                        const backEvalText = result.back_eval?.type_name || '---';
                         // 如果中道已被标记为被头道倒，不要覆盖这个信息，而是附加
                        const currentMiddleText = document.getElementById('middle-hand-eval').textContent;
                        if (currentMiddleText.includes("(被倒!)")) {
                             updateHandEvaluationDisplay('middle', `${middleEvalText} (倒尾道!)`, true); // (倒!)
                        } else {
                             updateHandEvaluationDisplay('middle', `${middleEvalText} (倒!)`, true);
                        }
                        updateHandEvaluationDisplay('back', `${backEvalText} (被倒!)`, true);
                    }
                }
                // 游戏结束或进入下一阶段的逻辑...
                // 例如，如果校验通过且不是倒水，则可以禁用拖拽等
                if (!result.is_daoshui) {
                    // 牌型有效，可以锁定牌，禁用拖拽
                    allDropZoneElements.forEach(zone => zone.classList.remove('drop-zone')); // 移除drop-zone特性
                    document.querySelectorAll('.card').forEach(card => card.draggable = false); // 禁止卡片拖拽
                    updateStatusMessage("牌型已确认！" + (result.message || ''), 'success', statusMessageElement);
                }


            } else {
                throw new Error("服务器返回的校验结果格式不正确。");
            }

        } catch (error) {
            console.error('提交牌型失败:', error);
            updateStatusMessage(`提交错误: ${error.message || '未知错误'}`, 'error', statusMessageElement);
             // 出错时，应该允许用户重新尝试或操作
            setButtonDisabled(confirmHandsButton, false); // 如果因为网络等问题失败，允许重试
        } finally {
            // 确认牌型后，通常会进入下一阶段，deal和reset按钮状态根据游戏逻辑设定
            // 如果牌型有效且确认，则deal和reset应该禁用，直到游戏结束或新一轮
            // 如果倒水或校验失败，则deal和reset应该可用
            const isConfirmedAndValid = result && !result.is_daoshui;
            setButtonDisabled(dealButton, isConfirmedAndValid); // 如果有效确认，则禁用发牌
            setButtonDisabled(resetButton, isConfirmedAndValid); // 如果有效确认，则禁用重置
            // confirm按钮在点击后就应该禁用，除非出错允许重试
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
            if (playerHandContainer.children.length > 0) {
                updateStatusMessage('请将所有牌摆放到头、中、尾道。', 'info', statusMessageElement);
            } else {
                // 提示牌数不足
                let message = "请正确摆放牌：";
                if (arrangedHandElements.front.children.length !== requiredCardCounts.front) message += ` 头道${requiredCardCounts.front}张 (差${requiredCardCounts.front - arrangedHandElements.front.children.length})。`;
                if (arrangedHandElements.middle.children.length !== requiredCardCounts.middle) message += ` 中道${requiredCardCounts.middle}张 (差${requiredCardCounts.middle - arrangedHandElements.middle.children.length})。`;
                if (arrangedHandElements.back.children.length !== requiredCardCounts.back) message += ` 尾道${requiredCardCounts.back}张 (差${requiredCardCounts.back - arrangedHandElements.back.children.length})。`;
                updateStatusMessage(message, 'info', statusMessageElement);
            }
        }
        // 每次拖放后都清除牌型显示，因为牌已改变，之前的评估不再有效
        clearAllHandEvaluationDisplays();
    }

    // --- Initialization ---
    setupDropZones(allDropZoneElements, statusMessageElement, onCardDrop);

    // 初始时测试后端连接 (可选)
    testBackend()
        .then(data => console.log('Backend test successful:', data?.message || 'OK'))
        .catch(error => console.error('Backend test failed:', error.message));

});
