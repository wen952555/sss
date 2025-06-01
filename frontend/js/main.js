// frontend/js/main.js
// ... (import 语句保持不变)
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
    // ... (DOM元素获取和初始设置保持不变，为简洁省略)
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
    function setInitialButtonStates() { /* ... 内容省略 ... */ }
    setInitialButtonStates();
    clearAllHandEvaluationDisplays();
    dealButton.addEventListener('click', handleDeal);
    resetButton.addEventListener('click', handleReset);
    confirmHandsButton.addEventListener('click', handleConfirmHands);


    async function handleDeal() { /* ... 内容保持不变，为简洁省略 ... */ }
    function handleReset() { /* ... 内容保持不变，为简洁省略 ... */ }

    async function handleConfirmHands() {
        setButtonDisabled(confirmHandsButton, true);
        setButtonDisabled(dealButton, true);
        setButtonDisabled(resetButton, true);

        updateStatusMessage('正在提交牌型进行校验...', 'info', statusMessageElement);
        
        const handsData = {
            front: getCardsFromContainerForApi(frontHandContainer),
            middle: getCardsFromContainerForApi(middleHandContainer),
            back: getCardsFromContainerForApi(backHandContainer)
        };

        if (handsData.front.length !== requiredCardCounts.front ||
            handsData.middle.length !== requiredCardCounts.middle ||
            handsData.back.length !== requiredCardCounts.back) {
            updateStatusMessage('牌数不正确！头道3张，中尾道各5张。', 'error', statusMessageElement);
            setButtonDisabled(confirmHandsButton, false);
            setButtonDisabled(dealButton, false);
            setButtonDisabled(resetButton, false);
            return;
        }

        let submissionResult = null; // 在 try 外部声明，以便 finally 可以访问

        try {
            submissionResult = await submitArrangedHands(handsData); // API 调用结果赋值给外部变量
            if (submissionResult && typeof submissionResult.message !== 'undefined') { // 确保有 message 属性

                // *** 新增：处理并显示13张牌的特殊牌型 ***
                let finalMessage = submissionResult.message;
                if (submissionResult.thirteen_card_special && submissionResult.thirteen_card_special.type !== 0) { // 0 是 TYPE_NONE
                    // 如果有13张牌的特殊牌型，将其信息附加到主消息中或覆盖
                    finalMessage = `特殊牌型【${submissionResult.thirteen_card_special.name}】! ` + (submissionResult.is_daoshui ? finalMessage : ""); // 如果倒水，保留倒水信息
                     updateStatusMessage(finalMessage, submissionResult.is_daoshui ? 'error' : 'success', statusMessageElement); // 使用更新后的消息
                } else {
                    updateStatusMessage(finalMessage, submissionResult.is_daoshui ? 'error' : 'success', statusMessageElement);
                }


                // 更新三道牌的牌型显示
                updateHandEvaluationDisplay('front', submissionResult.front_eval?.type_name || '---', 
                    submissionResult.is_daoshui && submissionResult.daoshui_details?.includes("头道大于中道"));
                updateHandEvaluationDisplay('middle', submissionResult.middle_eval?.type_name || '---', 
                    submissionResult.is_daoshui && (submissionResult.daoshui_details?.includes("头道大于中道") || submissionResult.daoshui_details?.includes("中道大于尾道")));
                updateHandEvaluationDisplay('back', submissionResult.back_eval?.type_name || '---', 
                    submissionResult.is_daoshui && submissionResult.daoshui_details?.includes("中道大于尾道"));

                if(submissionResult.is_daoshui && submissionResult.daoshui_details && submissionResult.daoshui_details.length > 0){
                    submissionResult.daoshui_details.forEach(detail => {
                        if(detail.includes("头道大于中道")){
                            const frontText = submissionResult.front_eval?.type_name || '---';
                            const middleText = submissionResult.middle_eval?.type_name || '---';
                            updateHandEvaluationDisplay('front', `${frontText} (倒!)`, true);
                            updateHandEvaluationDisplay('middle', `${middleText} (被倒!)`, true);
                        }
                        if(detail.includes("中道大于尾道")){
                            const middleText = submissionResult.middle_eval?.type_name || '---';
                            const backText = submissionResult.back_eval?.type_name || '---';
                            const currentMiddleEval = document.getElementById('middle-hand-eval');
                            // 如果中道已因头道被标红，则附加信息而不是覆盖
                            if (currentMiddleEval && currentMiddleEval.classList.contains('error') && currentMiddleEval.textContent.includes('(被倒!)')) {
                                updateHandEvaluationDisplay('middle', `${middleText} (也倒尾道!)`, true);
                            } else {
                                updateHandEvaluationDisplay('middle', `${middleText} (倒!)`, true);
                            }
                            updateHandEvaluationDisplay('back', `${backText} (被倒!)`, true);
                        }
                    });
                }
                
                // 如果没有13张特殊牌型，并且牌型有效（不倒水），则锁定牌局
                const noOverallSpecial = !submissionResult.thirteen_card_special || submissionResult.thirteen_card_special.type === 0;
                if (noOverallSpecial && !submissionResult.is_daoshui) {
                    allDropZoneElements.forEach(zone => zone.classList.remove('drop-zone'));
                    document.querySelectorAll('.card').forEach(card => card.draggable = false);
                }

            } else {
                throw new Error("服务器返回的校验结果格式不正确或不包含message。");
            }

        } catch (error) {
            console.error('提交牌型失败:', error);
            updateStatusMessage(`提交错误: ${error.message || '未知错误'}`, 'error', statusMessageElement);
            setButtonDisabled(confirmHandsButton, false); // 允许重试
            // 其他按钮状态也应恢复
            setButtonDisabled(dealButton, false);
            setButtonDisabled(resetButton, false);

        } finally {
            // 根据 submissionResult 来决定按钮的最终状态
            const isValidAndConfirmed = submissionResult && !submissionResult.is_daoshui && 
                                      (!submissionResult.thirteen_card_special || submissionResult.thirteen_card_special.type === 0);
            
            // 如果有13张特殊牌型，通常也算一局结束
            const isSpecialConfirmed = submissionResult && submissionResult.thirteen_card_special && submissionResult.thirteen_card_special.type !== 0;

            setButtonDisabled(dealButton, isValidAndConfirmed || isSpecialConfirmed);
            setButtonDisabled(resetButton, isValidAndConfirmed || isSpecialConfirmed);
            // confirmButton 在 submissionResult 为 null (即 fetch 失败) 时已经在 catch 中处理
            // 如果 fetch 成功，则 confirmButton 通常保持禁用，除非是可恢复的错误
            if (submissionResult) {
                // 如果是倒水，允许重新确认（如果用户想调整）或者重新发牌/整理
                if (submissionResult.is_daoshui) {
                    setButtonDisabled(confirmHandsButton, false); // 允许重新尝试确认（调整后）
                } else {
                     // 否则，保持禁用 (因为已经有效确认或有特殊牌型)
                    setButtonDisabled(confirmHandsButton, true);
                }
            }
        }
    }

    function onCardDrop() { /* ... 内容保持不变，为简洁省略 ... */ }
    
    // --- Initialization ---
    setupDropZones(allDropZoneElements, statusMessageElement, onCardDrop);
    testBackend().then(data => console.log('Backend test successful:', data?.message || 'OK')).catch(error => console.error('Backend test failed:', error.message));
});
