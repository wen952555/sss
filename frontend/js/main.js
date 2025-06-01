// frontend/js/main.js
import { showGameMessage, configureButton } from './ui.js'; // 使用新的ui.js
import { fetchDealCards, fetchSubmitArrangement } from './api.js';
import {
    initializeArrangement,
    resetArrangement,
    getArrangedPilesData,
    checkArrangementCompletion,
    setupPileClickHandlers,
    clearBoardForNewGame // 新增
} from './arrange.js';

const dealCardsBtn = document.getElementById('dealCardsBtn');
const resetArrangementBtn = document.getElementById('resetArrangementBtn');
const submitArrangementBtn = document.getElementById('submitArrangementBtn');
// const startArrangementBtn = document.getElementById('startArrangementBtn'); // 已移除

let currentRawHand = [];

async function handleDealCards() {
    showGameMessage("正在发牌...");
    configureButton('dealCardsBtn', { enable: false });
    configureButton('resetArrangementBtn', { show: false });
    configureButton('submitArrangementBtn', { show: false });

    clearBoardForNewGame(); // 清理旧牌局

    try {
        const cards = await fetchDealCards();
        currentRawHand = cards;
        initializeArrangement(currentRawHand); // 直接初始化理牌模块
        showGameMessage("发牌完成！请理牌。");
        configureButton('resetArrangementBtn', { show: true, enable: true });
        // submitArrangementBtn 由 checkArrangementCompletion 控制
    } catch (error) {
        showGameMessage(`发牌错误: ${error.message}`);
        console.error(error);
    } finally {
        configureButton('dealCardsBtn', { enable: true });
    }
}

function handleReset() {
    if (currentRawHand.length === 0) {
        showGameMessage("没有牌可以重置。");
        return;
    }
    resetArrangement();
    configureButton('submitArrangementBtn', { show: false }); // 重置后通常不能直接提交
}

async function handleSubmit() {
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
            // 可以在这里决定是否允许重新发牌
            // configureButton('dealCardsBtn', { enable: true });
        }
        showGameMessage(message);
        if (result.success && result.isValid) {
            // 成功且有效，可以冻结重置和提交，提示发新牌
            configureButton('resetArrangementBtn', { enable: false });
            configureButton('submitArrangementBtn', { show: true, enable: false }); // 显示但禁用
        }

    } catch (error) {
        showGameMessage(`提交错误: ${error.message}`);
        console.error(error);
    } finally {
        // 除非是成功且有效的提交，否则恢复按钮
        if (!(document.getElementById('submitArrangementBtn').disabled && currentRawHand.length > 0)) {
             configureButton('submitArrangementBtn', { enable: checkArrangementCompletion() }); // 根据当前状态决定是否启用
        }
        if (currentRawHand.length > 0) { // 只有在有牌时才启用重置
            configureButton('resetArrangementBtn', { enable: true });
        }
    }
}

function init() {
    dealCardsBtn.addEventListener('click', handleDealCards);
    resetArrangementBtn.addEventListener('click', handleReset);
    submitArrangementBtn.addEventListener('click', handleSubmit);

    setupPileClickHandlers();

    clearBoardForNewGame(); // 初始清理
    showGameMessage("欢迎！点击“发牌”开始。");
    configureButton('resetArrangementBtn', { show: false });
    configureButton('submitArrangementBtn', { show: false });
}

document.addEventListener('DOMContentLoaded', init);
