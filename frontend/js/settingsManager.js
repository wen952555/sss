// frontend/js/settingsManager.js
import { AI_DIFFICULTY } from './constants.js'; // 引入AI难度常量

const SETTINGS_KEY = 'thirteenWaterGameSettings';

const defaultSettings = {
    soundEnabled: true,
    aiDifficulty: AI_DIFFICULTY.MEDIUM, // 默认中等难度
    highScore: 0,
    // 可以添加更多设置，如牌背选择等
    // cardBack: 'default',
};

export function loadSettings() {
    try {
        const storedSettings = localStorage.getItem(SETTINGS_KEY);
        if (storedSettings) {
            const parsedSettings = JSON.parse(storedSettings);
            // 合并默认设置，以防localStorage中缺少某些新加的设置项
            return { ...defaultSettings, ...parsedSettings };
        }
    } catch (error) {
        console.error("Error loading settings from localStorage:", error);
    }
    return { ...defaultSettings }; // 返回默认设置副本
}

export function saveSettings(newSettings) {
    try {
        const currentSettings = loadSettings();
        const updatedSettings = { ...currentSettings, ...newSettings };
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(updatedSettings));
        // 如果音效设置改变，通知 soundManager (或者 soundManager 自己监听事件)
        if (typeof newSettings.soundEnabled === 'boolean' && typeof window.toggleSoundGlobal === 'function') {
             window.toggleSoundGlobal(newSettings.soundEnabled); // 假设soundManager将其暴露到全局
        }

    } catch (error) {
        console.error("Error saving settings to localStorage:", error);
    }
}

export function saveHighScore(score) {
    const currentSettings = loadSettings();
    if (score > currentSettings.highScore) {
        saveSettings({ highScore: score });
        return true; // 新高分
    }
    return false; // 未破纪录
}

export function resetHighScore() {
    saveSettings({ highScore: 0 });
}

export function getHighScore() {
    return loadSettings().highScore;
}

export function getAIDifficulty() {
    return loadSettings().aiDifficulty;
}

export function isSoundCurrentlyEnabled() { // 便于其他模块查询
    return loadSettings().soundEnabled;
}
