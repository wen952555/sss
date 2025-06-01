// frontend/js/main.js
import { showGameMessage, configureButton } from './ui.js';
import { fetchDealCards, fetchSubmitArrangement, fetchAISuggestion } from './api.js'; // Added fetchAISuggestion
import {
    initializeArrangeUIDependencies,
    initializeArrangement,
    resetArrangement,
    getArrangedPilesData,
    setupPileClickHandlers,
    clearBoardForNewGame,
    applyAISuggestion // Import applyAISuggestion
} from './arrange.js';

let dealCardsBtn, resetArrangementBtn, submitArrangementBtn, aiSuggestBtn; // Added aiSuggestBtn

function initializeMainUIDependencies() {
    dealCardsBtn = document.getElementById('dealCardsBtn');
    resetArrangementBtn = document.getElementById('resetArrangementBtn');
    submitArrangementBtn = document.getElementById('submitArrangementBtn');
    aiSuggestBtn = document.getElementById('aiSuggestBtn'); // Get AI button

    if (!dealCardsBtn || !resetArrangementBtn || !submitArrangementBtn || !aiSuggestBtn) {
        console.error("MAIN.JS Error: One or more control buttons not found! Check HTML IDs.");
    }
}

let currentRawHand = []; // Stores the 13 cards from backend {rank, suit} - used for AI
let aiSuggestedHashes = []; // Stores hashes of AI suggestions already shown in this round

async function handleDealCards() {
    if (!dealCardsBtn) return;
    showGameMessage("正在发牌...");
    configureButton('dealCardsBtn', { enable: false });
    configureButton('resetArrangementBtn', { show: false });
    configureButton('submitArrangementBtn', { show: false });
    configureButton('aiSuggestBtn', { show: false });

    clearBoardForNewGame();
    aiSuggestedHashes = []; // Reset AI suggestion history for new hand

    try {
        const cards = await fetchDealCards(); // cards is [{rank, suit}, ...]
        currentRawHand = cards; // Store the raw hand for AI
        initializeArrangement(cards); // arrange.js will map this to its fullHandData
        configureButton('resetArrangementBtn', { show: true, enable: true });
        configureButton('aiSuggestBtn', { show: true, enable: true });
    } catch (error) {
        showGameMessage(`发牌错误: ${error.message}`);
        console.error(error);
        clearBoardForNewGame();
    } finally {
        configureButton('dealCardsBtn', { enable: true });
    }
}

function handleReset() {
    if (!resetArrangementBtn) return;
    aiSuggestedHashes = []; // Reset AI history on manual reset
    resetArrangement();
}

async function handleSubmit() {
    if (!submitArrangementBtn) return;
    const arrangedPiles = getArrangedPilesData();
    if (!arrangedPiles) { return; }

    showGameMessage("正在提交牌型...");
    configureButton('submitArrangementBtn', { enable: false });
    configureButton('resetArrangementBtn', { enable: false });
    configureButton('aiSuggestBtn', { enable: false }); // Disable AI while submitting

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
            configureButton('aiSuggestBtn', { enable: false });
            // configureButton('submitArrangementBtn', { show: true, enable: false });
        } else {
            // Re-enable buttons if submission failed or invalid, and cards are present
            // Check arrange.js's fullHandData (need to import it or get its state)
            // For simplicity, just re-enable based on currentRawHand for now.
            if (currentRawHand.length > 0) {
                 configureButton('resetArrangementBtn', { enable: true });
                 configureButton('aiSuggestBtn', { enable: true });
                 // Submit button state will be re-evaluated by arrange.js's checkAndHandleGameStateTransition
                 // if the state is still ARRANGEMENT_COMPLETE
                 const arrangeModule = await import('./arrange.js'); // Dynamic import for getArrangedPilesData
                 if (arrangeModule.getArrangedPilesData()) { // Check if still submittable
                     configureButton('submitArrangementBtn', { enable: true });
                 } else {
                     configureButton('submitArrangementBtn', { show: false }); // Hide if not submittable
                 }
            }
        }
    } catch (error) {
        showGameMessage(`提交错误: ${error.message}`);
        console.error(error);
        if (currentRawHand.length > 0) {
            configureButton('resetArrangementBtn', { enable: true });
            configureButton('aiSuggestBtn', { enable: true });
            // Re-check if still submittable
            const arrangeModule = await import('./arrange.js');
            if (arrangeModule.getArrangedPilesData()) {
                configureButton('submitArrangementBtn', { enable: true });
            } else {
                configureButton('submitArrangementBtn', { show: false });
            }
        }
    }
}

async function handleAISuggest() {
    if (!aiSuggestBtn) return;
    if (currentRawHand.length !== 13) {
        showGameMessage("请先发牌获得完整手牌。", "warning");
        return;
    }

    showGameMessage("AI正在思考...", "info");
    configureButton('aiSuggestBtn', { enable: false });
    configureButton('resetArrangementBtn', { enable: false });

    try {
        const result = await fetchAISuggestion(currentRawHand, aiSuggestedHashes);

        if (result.success && result.arrangement) {
            applyAISuggestion(result.arrangement); // arrange.js function
            if (result.hash && !aiSuggestedHashes.includes(result.hash)) {
                aiSuggestedHashes.push(result.hash);
            }
            if (result.all_tried_reset) { // Backend signals to reset client-side hash list
                // showGameMessage("AI已展示所有组合，将从头开始。", "info"); // applyAISuggestion will show its own message
                aiSuggestedHashes = [];
                if (result.hash) { // Add the "first" one back so next click is different
                    aiSuggestedHashes.push(result.hash);
                }
            }
        } else {
            // Handle cases where AI call was successful but no new arrangement (e.g., all tried)
            showGameMessage(result.message || "AI没有新的建议。", "info");
            if (result.message && result.message.includes("没有更多")) { // Or a specific flag from backend
                 aiSuggestedHashes = []; // Allow looping from the start
                 showGameMessage("AI已展示所有组合，再次点击将循环。", "info");
            }
        }
    } catch (error) {
        showGameMessage(`AI建议错误: ${error.message}`, "error");
        console.error(error);
    } finally {
        configureButton('aiSuggestBtn', { enable: true });
        configureButton('resetArrangementBtn', { enable: true });
    }
}

function init() {
    initializeMainUIDependencies();
    initializeArrangeUIDependencies();

    if (dealCardsBtn) dealCardsBtn.addEventListener('click', handleDealCards);
    if (aiSuggestBtn) aiSuggestBtn.addEventListener('click', handleAISuggest); // Add listener
    if (resetArrangementBtn) resetArrangementBtn.addEventListener('click', handleReset);
    if (submitArrangementBtn) submitArrangementBtn.addEventListener('click', handleSubmit);

    setupPileClickHandlers();
    clearBoardForNewGame();
    showGameMessage("欢迎！点击“发牌”开始。");
    // configureButton('aiSuggestBtn', { show: false }); // clearBoardForNewGame handles this
}

document.addEventListener('DOMContentLoaded', init);
