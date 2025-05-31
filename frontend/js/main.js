// frontend/js/main.js
import * as GameLogic from './gameLogic.js';
import * as UIManager from './uiManager.js';
import { playSound, toggleSound } from './soundManager.js'; // 假设我们会有 soundManager.js
import { loadSettings, saveSettings, resetHighScore } from './settingsManager.js'; // 假设会有 settingsManager.js

document.addEventListener('DOMContentLoaded', () => {
    const elements = {
        dealButton: document.getElementById('dealButton'),
        sortHandButton: document.getElementById('sortHandButton'),
        rulesButton: document.getElementById('rulesButton'),
        settingsButton: document.getElementById('settingsButton'),
        
        playerHandDiv: document.getElementById('playerHand'),
        frontHandDiv: document.getElementById('frontHand'),
        middleHandDiv: document.getElementById('middleHand'),
        backHandDiv: document.getElementById('backHand'),
        
        aiFrontHandDiv: document.getElementById('aiFrontHand'), // AI牌墩
        aiMiddleHandDiv: document.getElementById('aiMiddleHand'),
        aiBackHandDiv: document.getElementById('aiBackHand'),
        aiStatusSpan: document.getElementById('aiStatus'), // AI状态显示
        aiFrontHandTypeSpan: document.getElementById('aiFrontHandType'),
        aiMiddleHandTypeSpan: document.getElementById('aiMiddleHandType'),
        aiBackHandTypeSpan: document.getElementById('aiBackHandType'),


        playerFrontHandTypeSpan: document.getElementById('playerFrontHandType'),
        playerMiddleHandTypeSpan: document.getElementById('playerMiddleHandType'),
        playerBackHandTypeSpan: document.getElementById('playerBackHandType'),

        messageArea: document.getElementById('messageArea'),
        scoreArea: document.getElementById('scoreArea'),
        highScoreSpan: document.getElementById('highScore'), // 最高分显示
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

        // dropZones 包含玩家的，AI的墩是只读的
        dropZones: [
            document.getElementById('frontHand'), 
            document.getElementById('middleHand'), 
            document.getElementById('backHand')
        ]
    };

    // 初始化UI管理器，传入DOM元素和GameLogic的回调
    UIManager.initUIManager(elements, GameLogic.handleCardMovement);
    
    // 初始化游戏逻辑，传入UIManager以便回调 (或者UIManager导入GameLogic)
    // GameLogic.initGameLogic(UIManager, ApiService); // 这种方式也可以

    // 加载设置
    const initialSettings = loadSettings();
    elements.soundToggleCheckbox.checked = initialSettings.soundEnabled;
    elements.aiDifficultySelect.value = initialSettings.aiDifficulty;
    UIManager.updateHighScoreDisplay(initialSettings.highScore);


    // 事件监听
    elements.dealButton.addEventListener('click', () => {
        playSound('deal'); // 播放发牌音效
        GameLogic.startNewGame(elements.aiDifficultySelect.value); // 传递AI难度
    });
    elements.sortHandButton.addEventListener('click', () => {
        playSound('click');
        GameLogic.sortPlayerHand();
    });
    elements.submitArrangementButton.addEventListener('click', () => {
        playSound('click');
        GameLogic.handleSubmit();
    });

    // 规则弹窗
    elements.rulesButton.addEventListener('click', () => UIManager.openModal(elements.rulesModal));
    elements.closeRulesModal.addEventListener('click', () => UIManager.closeModal(elements.rulesModal));

    // 设置弹窗
    elements.settingsButton.addEventListener('click', () => UIManager.openModal(elements.settingsModal));
    elements.closeSettingsModal.addEventListener('click', () => UIManager.closeModal(elements.settingsModal));
    elements.soundToggleCheckbox.addEventListener('change', (event) => {
        toggleSound(event.target.checked);
        saveSettings({ soundEnabled: event.target.checked });
    });
    elements.aiDifficultySelect.addEventListener('change', (event) => {
        saveSettings({ aiDifficulty: event.target.value });
        // 可以在这里提示用户新难度将在下一局生效
        UIManager.updateMessage(`AI难度已设为 ${event.target.options[event.target.selectedIndex].text}，下一局生效。`, 'info');
    });
    elements.resetHighScoreButton.addEventListener('click', () => {
        if (confirm("确定要重置最高分记录吗？")) {
            resetHighScore();
            UIManager.updateHighScoreDisplay(0);
            UIManager.updateMessage("最高分已重置。", "info");
        }
    });

    // 点击模态框外部关闭
    window.addEventListener('click', (event) => {
        if (event.target == elements.rulesModal) UIManager.closeModal(elements.rulesModal);
        if (event.target == elements.settingsModal) UIManager.closeModal(elements.settingsModal);
    });


    // 初始状态
    UIManager.updateMessage('点击“开始游戏”与AI对战。', 'info');
    UIManager.toggleSubmitButton(false);
    // UIManager.updateScoreDisplay(0); // scoreArea 由 GameLogic 初始化或 loadSettings 后更新
});
