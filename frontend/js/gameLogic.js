// frontend/js/gameLogic.js
import { DUN_IDS, HAND_TYPES } from './constants.js';
import { sortCards, getCardsFromZone } from './cardUtils.js';
import { evaluateHand, compareSingleHands } // ... (其他导入)
import * as UIManager from './uiManager.js';
import * as ApiService from './apiService.js';

let gameState = {
    isGameOver: false,
    playerHand: [],
    frontDun: [],
    middleDun: [],
    backDun: [],
    totalScore: 0,
    // currentDraggedCardData: null // Not strictly needed
};

// UIManager.domElements.gameState = gameState; // <--- 删除此行

// 新增一个导出函数，让其他模块可以安全地获取 isGameOver 状态
export function isGameCurrentlyOver() {
    return gameState.isGameOver;
}

// --- Game Initialization and Control ---
export async function startNewGame() {
    gameState.isGameOver = false; // 首先设置 gameState
    // ... 其他逻辑与之前相同
    UIManager.makeAllCardsStatic(false); // 确保新局可拖动 (UIManager会自己处理是否根据 isGameOver)
    // ...
}

// ... (其他函数)

export async function handleSubmit() {
    // ...
    try {
        const serverResult = await ApiService.submitHandToServer(arrangedHandData);
        gameState.isGameOver = true; // 在这里设置 isGameOver
        UIManager.makeAllCardsStatic(true);
        // ...
    } catch (error) {
        // ...
        // gameState.isGameOver 保持不变或根据逻辑设置
    }
}

// ... (其他 gameLogic.js 的内容)
// 确保在所有可能改变 isGameOver 的地方都更新 gameState.isGameOver
// 例如在 startNewGame 中设置为 false，在 handleSubmit 成功后设置为 true
