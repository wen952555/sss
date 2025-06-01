// frontend/js/main.js
import { showGameMessage, configureButton } from './ui.js';
import { fetchDealCards, fetchSubmitArrangement } from './api.js';
import {
    initializeArrangement,
    resetArrangement,
    getArrangedPilesData,
    setupPileClickHandlers,
    clearBoardForNewGame
} from './arrange.js';

const dealCardsBtn = document.getElementById('dealCardsBtn');
const resetArrangementBtn = document.getElementById('resetArrangementBtn');
const submitArrangementBtn = document.getElementById('submitArrangementBtn');

let currentRawHand = []; // To store the originally dealt cards if needed for reset

async function handleDealCards() {
    showGameMessage("正在发牌...");
    configureButton('dealCardsBtn', { enable: false });
    configureButton('resetArrangementBtn', { show: false });
    configureButton('submitArrangementBtn', { show: false });

    clearBoardForNewGame(); // Resets arrange.js state and UI

    try {
        const cards = await fetchDealCards();
        currentRawHand = cards; // Store for potential use (e.g. if reset needs original full hand)
        initializeArrangement(cards); // This will put all cards in middlePile (as hand source)
        // Message is now handled within initializeArrangement or by subsequent actions
        configureButton('resetArrangementBtn', { show: true, enable: true });
        // Submit button visibility is handled by arrange.js's checkAndHandleGameStateTransition
    } catch (error) {
        showGameMessage(`发牌错误: ${error.message}`);
        console.error(error);
        clearBoardForNewGame(); // Ensure clean state on error
    } finally {
        configureButton('dealCardsBtn', { enable: true });
    }
}

function handleReset() {
    if (currentRawHand.length === 0 && document.getElementById('middlePileCards').children.length === 0) { // Check if any cards were dealt
        showGameMessage("没有牌可以重置。");
        return;
    }
    resetArrangement(); // arrange.js handles resetting its state and UI
    // Submit button visibility will be handled by checkAndHandleGameStateTransition in resetArrangement
}

async function handleSubmit() {
    const arrangedPiles = getArrangedPilesData(); // arrange.js now checks for ARRANGEMENT_COMPLETE state
    if (!arrangedPiles) {
        // getArrangedPilesData will show a message if not ready
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
            // Game ended successfully, disable further arrangement until new deal
            configureButton('resetArrangementBtn', { enable: false });
            // Submit button can remain visible but disabled, or hidden
            // configureButton('submitArrangementBtn', { show: true, enable: false });
            // Or prepare for new game:
            // showGameMessage(message + " 点击发牌开始新一局。");
        } else {
            // If submission failed or invalid, re-enable buttons if appropriate
             if (currentRawHand.length > 0) {
                configureButton('resetArrangementBtn', { enable: true });
                // Submit button state will be re-evaluated by arrange.js if it's still in ARRANGEMENT_COMPLETE
                // For safety, explicitly re-enable if still possible to submit
                if (document.getElementById('headPileCards').children.length === 3 &&
                    document.getElementById('tailPileCards').children.length === 5 &&
                    document.getElementById('middlePileCards').children.length === 5) {
                    configureButton('submitArrangementBtn', { enable: true });
                }
            }
        }

    } catch (error) {
        showGameMessage(`提交错误: ${error.message}`);
        console.error(error);
        if (currentRawHand.length > 0) { // Allow retry if error
            configureButton('resetArrangementBtn', { enable: true });
            configureButton('submitArrangementBtn', { enable: true }); // Or based on current state
        }
    }
}

function init() {
    dealCardsBtn.addEventListener('click', handleDealCards);
    resetArrangementBtn.addEventListener('click', handleReset);
    submitArrangementBtn.addEventListener('click', handleSubmit);

    setupPileClickHandlers(); // From arrange.js

    clearBoardForNewGame(); // Initial setup
    showGameMessage("欢迎！点击“发牌”开始。");
}

document.addEventListener('DOMContentLoaded', init);
