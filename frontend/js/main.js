// frontend/js/main.js
import { fetchDeal, testBackend } from './apiService.js';
import { displayCards, updateStatusMessage, clearHandContainers, toggleButtonVisibility, setButtonText, setButtonDisabled } from './ui.js';
import { initializeHandData, getOriginalHandDataArray, makeCardsDraggable, setupDropZones, checkArrangementComplete, getCardsFromContainer } from './gameLogic.js';

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const dealButton = document.getElementById('deal-button');
    const resetButton = document.getElementById('reset-button');
    // const compareButton = document.getElementById('compare-hands-button'); // 未来功能

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
    // toggleButtonVisibility(compareButton, false);

    // Event Listeners
    dealButton.addEventListener('click', handleDeal);
    resetButton.addEventListener('click', handleReset);
    // compareButton.addEventListener('click', handleCompare); // 未来功能

    // --- Event Handlers ---
    async function handleDeal() {
        setButtonDisabled(dealButton, true);
        updateStatusMessage('正在发牌...', 'info', statusMessageElement);
        clearHandContainers(allDropZoneElements); // 清空所有牌区

        try {
            const dealData = await fetchDeal(); // {hand: [], message: ""}
            if (dealData && dealData.hand) {
                const initialCardsForUI = initializeHandData(dealData.hand); // 添加ID并存储
                displayCards(initialCardsForUI, playerHandContainer);
                makeCardsDraggable('.card');
                updateStatusMessage(dealData.message || '发牌成功！请拖动牌。', 'success', statusMessageElement);
                toggleButtonVisibility(resetButton, true);
                // toggleButtonVisibility(compareButton, false); // 确保比较按钮在发牌后隐藏，直到牌摆好
                setButtonText(dealButton, '重新发牌');
            } else {
                throw new Error('从后端获取牌数据格式不正确');
            }
        } catch (error) {
            console.error('发牌失败:', error);
            updateStatusMessage(`发牌错误: ${error.message || '未知错误'}`, 'error', statusMessageElement);
        } finally {
            setButtonDisabled(dealButton, false);
        }
    }

    function handleReset() {
        clearHandContainers(arrangedHandDropZones);
        const originalCardsForUI = getOriginalHandDataArray();
        displayCards(originalCardsForUI, playerHandContainer); // 使用原始手牌数据
        makeCardsDraggable('.card');
        updateStatusMessage('牌已重置到初始位置。', 'success', statusMessageElement);
        // toggleButtonVisibility(compareButton, false);
    }

    // --- Callback for Drop Event ---
    function onCardDrop() {
        const arrangementComplete = checkArrangementComplete(arrangedHandElements, playerHandContainer, requiredCardCounts);

        if (arrangementComplete) {
            updateStatusMessage('牌已摆放完毕！', 'success', statusMessageElement);
            // toggleButtonVisibility(compareButton, true); // 显示比较按钮
        } else {
            // toggleButtonVisibility(compareButton, false); // 隐藏比较按钮
            if (playerHandContainer.children.length > 0) {
                updateStatusMessage('请将所有牌摆放到头、中、尾道。', 'info', statusMessageElement);
            } else {
                // 检查各道牌数是否正确，给出更详细提示
                let message = "请正确摆放牌：";
                if (frontHandContainer.children.length !== requiredCardCounts.front) message += ` 头道需${requiredCardCounts.front}张 (当前${frontHandContainer.children.length})。`;
                if (middleHandContainer.children.length !== requiredCardCounts.middle) message += ` 中道需${requiredCardCounts.middle}张 (当前${middleHandContainer.children.length})。`;
                if (backHandContainer.children.length !== requiredCardCounts.back) message += ` 尾道需${requiredCardCounts.back}张 (当前${backHandContainer.children.length})。`;
                updateStatusMessage(message, 'info', statusMessageElement);
            }
        }
    }

    // --- Initialization ---
    setupDropZones(allDropZoneElements, statusMessageElement, onCardDrop);

    // Optional: Test backend connection on load
    testBackend()
        .then(data => console.log('Backend test successful:', data.message))
        .catch(error => console.error('Backend test failed:', error.message));
});
