// frontend/js/main.js
import { displayPlayerHand, showGameMessage, toggleButton } from './ui.js';
import { fetchDealCards, fetchSubmitArrangement } from './api.js';
import {
    initializeArrangement,
    resetArrangement,
    getArrangedPilesData,
    checkArrangementCompletion,
    setupPileClickHandlers
} from './arrange.js';

const dealCardsBtn = document.getElementById('dealCardsBtn');
const startArrangementBtn = document.getElementById('startArrangementBtn');
const resetArrangementBtn = document.getElementById('resetArrangementBtn');
const submitArrangementBtn = document.getElementById('submitArrangementBtn');

const playerHandDisplayArea = document.getElementById('playerHandArea'); // 原始手牌显示区（理牌时也用它）
const arrangementUIArea = document.getElementById('arrangementArea'); // 包含三墩的区域

let currentRawHand = []; // 存储后端发来的13张牌 [{rank, suit}, ...]

async function handleDealCards() {
    showGameMessage("正在发牌...", "info");
    dealCardsBtn.disabled = true;
    toggleButton('startArrangementBtn', false);
    toggleButton('resetArrangementBtn', false);
    toggleButton('submitArrangementBtn', false);
    arrangementUIArea.style.display = 'none'; // 理牌前隐藏三墩
    playerHandDisplayArea.style.display = 'block'; // 显示手牌区

    try {
        const cards = await fetchDealCards();
        currentRawHand = cards;
        displayPlayerHand(cards); // 初始显示13张牌在手牌区 (会被理牌模块接管)
        showGameMessage("发牌完成！点击“开始理牌”进行操作。", "success");
        toggleButton('startArrangementBtn', true);
    } catch (error) {
        showGameMessage(`发牌错误: ${error.message}`, "error");
        console.error(error);
    } finally {
        dealCardsBtn.disabled = false;
    }
}

function handleStartArrangement() {
    if (currentRawHand.length !== 13) {
        showGameMessage("请先成功发牌！", "warning");
        return;
    }
    showGameMessage("理牌开始！点击手牌选择，再点击目标墩放置。", "info");
    // playerHandDisplayArea.style.display = 'block'; // 手牌选择区一直显示
    arrangementUIArea.style.display = 'block'; // 显示三墩UI

    toggleButton('startArrangementBtn', false); // 隐藏“开始理牌”
    toggleButton('resetArrangementBtn', true); // 显示“重置”
    // “提交”按钮由 checkArrangementCompletion 控制

    initializeArrangement(currentRawHand); // 使用原始牌数据初始化理牌模块
}

function handleReset() {
    if (currentRawHand.length === 0) {
        showGameMessage("没有牌可以重置。", "info");
        return;
    }
    resetArrangement(); // 调用理牌模块的重置
}

async function handleSubmit() {
    const arrangedPiles = getArrangedPilesData();
    if (!arrangedPiles) {
        // getArrangedPilesData 内部会显示错误信息
        return;
    }

    showGameMessage("正在提交牌型...", "info");
    submitArrangementBtn.disabled = true;
    resetArrangementBtn.disabled = true; // 提交期间禁止重置

    try {
        const result = await fetchSubmitArrangement(arrangedPiles);
        let message = `提交结果: ${result.message || (result.success ? '成功' : '失败')}`;
        if (result.success) {
            message += result.isValid ? " (牌型有效)" : " (牌型无效)";
            if (result.handTypeDetails) {
                message += `<br>头墩: ${result.handTypeDetails.head.name}`;
                message += `<br>中墩: ${result.handTypeDetails.middle.name}`;
                message += `<br>尾墩: ${result.handTypeDetails.tail.name}`;
            }
            if (typeof result.score !== 'undefined') {
                message += `<br>得分: ${result.score}`;
            }
            showGameMessage(message, result.isValid ? "success" : "warning"); // 无效但成功提交也算warning
            toggleButton('dealCardsBtn', true); // 允许开始新一局
        } else {
            showGameMessage(message, "error"); // API调用层面就失败了
        }
    } catch (error) {
        showGameMessage(`提交时发生错误: ${error.message}`, "error");
        console.error(error);
    } finally {
        submitArrangementBtn.disabled = false; // 无论成功失败，恢复按钮
        resetArrangementBtn.disabled = false;
        // 提交后不自动隐藏提交按钮，除非开始新一局
        if(!checkArrangementCompletion()){ // 如果提交后状态变为未完成（例如后端逻辑导致），则隐藏
             toggleButton('submitArrangementBtn', false);
        }
    }
}

function init() {
    dealCardsBtn.addEventListener('click', handleDealCards);
    startArrangementBtn.addEventListener('click', handleStartArrangement);
    resetArrangementBtn.addEventListener('click', handleReset);
    submitArrangementBtn.addEventListener('click', handleSubmit);

    setupPileClickHandlers(); // 为墩区设置点击监听器

    displayPlayerHand([]); // 初始显示空手牌区域
    showGameMessage("欢迎来到十三水游戏！点击“发牌”开始。", "info");
    arrangementUIArea.style.display = 'none';
    toggleButton('startArrangementBtn', false);
    toggleButton('resetArrangementBtn', false);
    toggleButton('submitArrangementBtn', false);
}

document.addEventListener('DOMContentLoaded', init);
