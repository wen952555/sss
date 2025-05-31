// frontend/js/main.js
import * as GameLogic from './gameLogic.js';
import * as UIManager from './uiManager.js';
import { initSoundManager, playSound, toggleSound as toggleSoundGlobal } from './soundManager.js'; // 引入音效管理
import { loadSettings, saveSettings, resetHighScore as resetHighScoreSetting, getAIDifficulty } from './settingsManager.js'; // 引入设置管理

document.addEventListener('DOMContentLoaded', () => {
    const elements = {
        // ... (所有DOM元素获取，与上一版main.js一致)
        dealButton: document.getElementById('dealButton'),
        sortHandButton: document.getElementById('sortHandButton'),
        rulesButton: document.getElementById('rulesButton'),
        settingsButton: document.getElementById('settingsButton'),
        playerHandDiv: document.getElementById('playerHand'),
        frontHandDiv: document.getElementById('frontHand'),
        middleHandDiv: document.getElementById('middleHand'),
        backHandDiv: document.getElementById('backHand'),
        aiFrontHandDiv: document.getElementById('aiFrontHand'),
        aiMiddleHandDiv: document.getElementById('aiMiddleHand'),
        aiBackHandDiv: document.getElementById('aiBackHand'),
        aiStatusSpan: document.getElementById('aiStatus'),
        aiFrontHandTypeSpan: document.getElementById('aiFrontHandType'),
        aiMiddleHandTypeSpan: document.getElementById('aiMiddleHandType'),
        aiBackHandTypeSpan: document.getElementById('aiBackHandType'),
        playerFrontHandTypeSpan: document.getElementById('playerFrontHandType'),
        playerMiddleHandTypeSpan: document.getElementById('playerMiddleHandType'),
        playerBackHandTypeSpan: document.getElementById('playerBackHandType'),
        messageArea: document.getElementById('messageArea'),
        scoreArea: document.getElementById('scoreArea'),
        highScoreSpan: document.getElementById('highScore'),
        roundLogArea: document.getElementById('roundLogArea'),
        cardCountSpan: document.getElementById('card-count'),
        submitArrangementButton: document.getElementById('submitArrangement'),
        rulesModal: document.getElementById('rulesModal'),
        closeRulesModal: document.getElementById('closeRulesModal'),
        settingsModal: document.getElementById('settingsModal'),
        closeSettingsModal: document.getElementById('closeSettingsModal'),
        soundToggleCheckbox: document.getElementById('soundToggle'),
        aiDifficultySelect: document.getElementById('aiDifficulty'),
        resetHighScoreButton: document.getElementById('resetHighScoreButton'),
        dropZones: [
            document.getElementById('frontHand'), 
            document.getElementById('middleHand'), 
            document.getElementById('backHand')
        ]
    };

    // **修改点：初始化顺序和内容**
    const initialSettings = loadSettings();
    initSoundManager(initialSettings.soundEnabled); // 初始化音效管理器并传入初始设置
    // 将 toggleSoundGlobal 暴露给 settingsManager 使用 (或者使用事件订阅模式)
    window.toggleSoundGlobal = toggleSoundGlobal; // 简单做法

    UIManager.initUIManager(elements, GameLogic.handleCardMovement);
    GameLogic.initializeGameData(); // 初始化游戏数据，包括从 localStorage 加载

    // 更新UI以反映加载的设置
    elements.soundToggleCheckbox.checked = initialSettings.soundEnabled;
    elements.aiDifficultySelect.value = initialSettings.aiDifficulty;
    UIManager.updateHighScoreDisplay(initialSettings.highScore); // UIManager更新最高分显示


    // 事件监听 (与之前版本类似，但playSound的使用更规范)
    elements.dealButton.addEventListener('click', () => {
        // playSound('deal'); // deal音效移到gameLogic中发牌成功后播放
        GameLogic.startNewGame(elements.aiDifficultySelect.value);
    });
    elements.sortHandButton.addEventListener('click', () => {
        playSound('click');
        GameLogic.sortPlayerHand();
    });
    elements.submitArrangementButton.addEventListener('click', () => {
        // playSound('click'); // submit音效移到gameLogic中，根据结果播放win/lose
        GameLogic.handleSubmit();
    });

    elements.rulesButton.addEventListener('click', () => { playSound('click'); UIManager.openModal(elements.rulesModal); });
    elements.closeRulesModal.addEventListener('click', () => { playSound('click'); UIManager.closeModal(elements.rulesModal); });

    elements.settingsButton.addEventListener('click', () => { playSound('click'); UIManager.openModal(elements.settingsModal); });
    elements.closeSettingsModal.addEventListener('click', () => { playSound('click'); UIManager.closeModal(elements.settingsModal); });
    
    elements.soundToggleCheckbox.addEventListener('change', (event) => {
        const enabled = event.target.checked;
        toggleSoundGlobal(enabled); // 直接调用 soundManager 的函数
        saveSettings({ soundEnabled: enabled });
        if (enabled) playSound('click'); // 开音效时播个声音
    });
    elements.aiDifficultySelect.addEventListener('change', (event) => {
        playSound('click');
        saveSettings({ aiDifficulty: event.target.value });
        UIManager.updateMessage(`AI难度已设为 ${event.target.options[event.target.selectedIndex].text}，下一局生效。`, 'info');
    });
    elements.resetHighScoreButton.addEventListener('click', () => {
        playSound('click');
        if (confirm("确定要重置最高分记录吗？")) {
            resetHighScoreSetting(); // 调用 settingsManager 的函数
            GameLogic.gameState.currentHighScore = 0; // 更新 gameLogic 内部状态
            UIManager.updateHighScoreDisplay(0);
            UIManager.updateMessage("最高分已重置。", "info");
            playSound('error'); // 或其他提示音
        }
    });

    window.addEventListener('click', (event) => {
        if (event.target == elements.rulesModal) UIManager.closeModal(elements.rulesModal);
        if (event.target == elements.settingsModal) UIManager.closeModal(elements.settingsModal);
    });

    UIManager.updateMessage('点击“开始游戏”与AI对战。', 'info');
    UIManager.toggleSubmitButton(false);
});
