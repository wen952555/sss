// frontend/js/main.js
import * as GameLogic from './gameLogic.js';
import * as UIManager from './uiManager.js';

document.addEventListener('DOMContentLoaded', () => {
    const elements = {
        dealButton: document.getElementById('dealButton'),
        sortHandButton: document.getElementById('sortHandButton'),
        playerHandDiv: document.getElementById('playerHand'),
        frontHandDiv: document.getElementById('frontHand'),
        middleHandDiv: document.getElementById('middleHand'),
        backHandDiv: document.getElementById('backHand'),
        messageArea: document.getElementById('messageArea'),
        scoreArea: document.getElementById('scoreArea'),
        roundLogArea: document.getElementById('roundLogArea'), // 新增回合日志区域
        cardCountSpan: document.getElementById('card-count'),
        submitArrangementButton: document.getElementById('submitArrangement'),
        dropZones: [document.getElementById('frontHand'), document.getElementById('middleHand'), document.getElementById('backHand')]
    };

    UIManager.initUIManager(elements, GameLogic.handleCardMovement); // 将 GameLogic 的回调传入

    elements.dealButton.addEventListener('click', GameLogic.startNewGame);
    elements.sortHandButton.addEventListener('click', GameLogic.sortPlayerHand);
    elements.submitArrangementButton.addEventListener('click', GameLogic.handleSubmit);

    // 初始状态
    UIManager.updateMessage('点击“发牌”开始游戏。', 'info');
    UIManager.toggleSubmitButton(false);
    UIManager.updateScoreDisplay(0);
});
