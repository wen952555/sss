// frontend/js/main.js
import { showGameMessage, configureButton } from './ui.js';
import { fetchDealCards, fetchSubmitArrangement } from './api.js';
import {
    initializeArrangeUIDependencies, // Import the new init function
    initializeArrangement,
    resetArrangement,
    getArrangedPilesData,
    setupPileClickHandlers,
    clearBoardForNewGame
} from './arrange.js';

// DOM button elements (assuming these IDs are correct in your HTML)
let dealCardsBtn, resetArrangementBtn, submitArrangementBtn;

function initializeMainUIDependencies() {
    dealCardsBtn = document.getElementById('dealCardsBtn');
    resetArrangementBtn = document.getElementById('resetArrangementBtn');
    submitArrangementBtn = document.getElementById('submitArrangementBtn');

    if (!dealCardsBtn || !resetArrangementBtn || !submitArrangementBtn) {
        console.error("MAIN.JS Error: One or more control buttons not found!");
    }
}

let currentRawHand = [];

async function handleDealCards() {
    if (!dealCardsBtn) return; // Guard
    showGameMessage("正在发牌...");
    configureButton('dealCardsBtn', { enable: false });
    configureButton('resetArrangementBtn', { show: false });
    configureButton('submitArrangementBtn', { show: false });

    clearBoardForNewGame();

    try {
        const cards = await fetchDealCards();
        currentRawHand = cards;
        initializeArrangement(cards);
        configureButton('resetArrangementBtn', { show: true, enable: true });
    } catch (error) {
        showGameMessage(`发牌错误: ${error.message}`);
        console.error(error);
        clearBoardForNewGame();
    } finally {
        configureButton('dealCardsBtn', { enable: true });
    }
}

function handleReset() {
    if (!resetArrangementBtn) return; // Guard
    resetArrangement();
}

async function handleSubmit() {
    if (!submitArrangementBtn) return; // Guard
    const arrangedPiles = getArrangedPilesData();
    if (!arrangedPiles) {
        return;
    }

    showGameMessage("正在提交牌型...");
    configureButton('submitArrangementBtn', { enable: false });
    configureButton('resetArrangementBtn', { enable: false });

    try {
        const result = await fetchSubmitArrangement(arrangedPiles);
        let message = `${result.message || (result.success ? '提交成功' : '提交失败')}`;
        if (result.success) {
            message += result.isValid ? " (牌型有效)" : " (牌型无效)";
            if (result.handTypeDetails) {
                message += ` 头:${result.handTypeDetails.head.name}, 中:${result.handTypeDetails.middle.name}, 尾:${result.handTypeDetails.tail.name}.`;
            }
        }
        showGameMessage(message);

        if (result.success && result.isValid) {
            configureButton('resetArrangementBtn', { enable: false });
            // configureButton('submitArrangementBtn', { show: true, enable: false }); // Keep visible but disabled
        } else {
            // Allow re-arranging if submission failed or invalid (and cards are present)
            if (fullHandData && fullHandData.length > 0) { // Check fullHandData from arrange.js
                 configureButton('resetArrangementBtn', { enable: true });
                 // Submit button state will be re-evaluated by arrange.js if it's still in ARRANGEMENT_COMPLETE
                 // For safety, explicitly re-enable if still possible to submit
                 const arrangeModule = await import('./arrange.js'); // Dynamically import to access gameState if needed
                 if (arrangeModule.getArrangedPilesData()) { // Re-check if arrangement is valid
                     configureButton('submitArrangementBtn', { enable: true });
                 }
            }
        }
    } catch (error) {
        showGameMessage(`提交错误: ${error.message}`);
        console.error(error);
        if (currentRawHand.length > 0) { // Allow retry if API error
            configureButton('resetArrangementBtn', { enable: true });
            // Check if submission is still possible
            const arrangeModule = await import('./arrange.js');
            if (arrangeModule.getArrangedPilesData()) {
                configureButton('submitArrangementBtn', { enable: true });
            }
        }
    }
}

function init() {
    initializeMainUIDependencies(); // Initialize main.js UI elements
    initializeArrangeUIDependencies(); // Initialize arrange.js UI elements

    if (dealCardsBtn) dealCardsBtn.addEventListener('click', handleDealCards);
    if (resetArrangementBtn) resetArrangementBtn.addEventListener('click', handleReset);
    if (submitArrangementBtn) submitArrangementBtn.addEventListener('click', handleSubmit);

    setupPileClickHandlers();
    clearBoardForNewGame();
    showGameMessage("欢迎！点击“发牌”开始。");
}

document.addEventListener('DOMContentLoaded', init);
