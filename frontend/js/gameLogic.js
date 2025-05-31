// frontend/js/gameLogic.js
import { DUN_IDS, HAND_TYPES } from './constants.js';
import { sortCards, getCardsFromZone } from './cardUtils.js';
import { evaluateHand, compareSingleHands } from './handEvaluator.js';
import { calculateRoundScore } from './scoreCalculator.js';
import * as UIManager from './uiManager.js';
import * as ApiService from './apiService.js';

let gameState = {
    isGameOver: false,
    playerHand: [],     // Array of cardData objects in player's hand
    frontDun: [],       // Array of cardData objects in front dun
    middleDun: [],
    backDun: [],
    totalScore: 0,
    currentDraggedCardData: null // Not really needed if using cardId
};

// 将 gameState 暴露给 UIManager，以便 UIManager 中的函数可以访问 isGameOver
UIManager.domElements.gameState = gameState;


// --- Game Initialization and Control ---
export async function startNewGame() {
    gameState.isGameOver = false;
    UIManager.updateMessage('正在发牌...', 'info');
    UIManager.toggleDealButton(false);
    UIManager.toggleSubmitButton(false);
    UIManager.clearAllDunTypeNames();
    UIManager.updateScoreDisplay(gameState.totalScore, null, []); // 清空上一局日志

    try {
        const newHand = await ApiService.fetchNewHandFromServer();
        gameState.playerHand = sortCards(newHand); // 发牌后默认排序
        gameState.frontDun = [];
        gameState.middleDun = [];
        gameState.backDun = [];
        
        UIManager.updatePlayerHandDisplay(gameState.playerHand);
        UIManager.updateDunDisplay(UIManager.domElements.frontHandDiv, gameState.frontDun);
        UIManager.updateDunDisplay(UIManager.domElements.middleHandDiv, gameState.middleDun);
        UIManager.updateDunDisplay(UIManager.domElements.backHandDiv, gameState.backDun);
        
        UIManager.updateMessage('发牌完成！请摆牌。', 'success');
    } catch (error) {
        UIManager.updateMessage(`发牌失败: ${error.message}`, 'error');
    } finally {
        UIManager.toggleDealButton(true);
        UIManager.makeAllCardsStatic(false); // 确保新局可拖动
    }
    checkArrangementCompletion(); // 初始检查 (可能手牌为空)
}

export function sortPlayerHand() {
    if (gameState.isGameOver) return;
    gameState.playerHand = sortCards(gameState.playerHand);
    UIManager.updatePlayerHandDisplay(gameState.playerHand);
}

// --- Card Movement Logic (Data Layer) ---
// Called by UIManager after a card is dropped
export function handleCardMovement(cardId, targetZoneId, sourceZoneId) {
    if (gameState.isGameOver) return;

    let cardToMove = null;
    let sourceArray = null;

    // 1. Find and remove card from source
    if (sourceZoneId === UIManager.domElements.playerHandDiv.id) {
        sourceArray = gameState.playerHand;
    } else if (sourceZoneId === DUN_IDS.FRONT) {
        sourceArray = gameState.frontDun;
    } else if (sourceZoneId === DUN_IDS.MIDDLE) {
        sourceArray = gameState.middleDun;
    } else if (sourceZoneId === DUN_IDS.BACK) {
        sourceArray = gameState.backDun;
    }

    if (sourceArray) {
        const cardIndex = sourceArray.findIndex(card => card.id === cardId);
        if (cardIndex > -1) {
            [cardToMove] = sourceArray.splice(cardIndex, 1);
        }
    }

    if (!cardToMove) {
        console.error("Error: Card to move not found in source array", cardId, sourceZoneId);
        // 刷新UI以匹配数据状态 (如果发生错误)
        redrawAllZones();
        return;
    }

    // 2. Add card to target
    let targetArray = null;
    if (targetZoneId === UIManager.domElements.playerHandDiv.id) {
        targetArray = gameState.playerHand;
        gameState.playerHand.push(cardToMove);
        gameState.playerHand = sortCards(gameState.playerHand); // 放回手牌区自动排序
        UIManager.updatePlayerHandDisplay(gameState.playerHand);
    } else {
        if (targetZoneId === DUN_IDS.FRONT) targetArray = gameState.frontDun;
        else if (targetZoneId === DUN_IDS.MIDDLE) targetArray = gameState.middleDun;
        else if (targetZoneId === DUN_IDS.BACK) targetArray = gameState.backDun;
        
        if (targetArray) {
            targetArray.push(cardToMove);
            // 更新对应的墩UI (UIManager已在drop时更新了DOM，这里主要更新数据后的牌型)
            UIManager.evaluateAndDisplayDunHandType(document.getElementById(targetZoneId));
        }
    }
    
    // 3. Update source zone UI (if it was a dun)
    if (sourceZoneId !== UIManager.domElements.playerHandDiv.id) {
         UIManager.evaluateAndDisplayDunHandType(document.getElementById(sourceZoneId));
    }
    
    UIManager.updateCardCount(gameState.playerHand.length);
    checkArrangementCompletion();
}

function redrawAllZones() {
    UIManager.updatePlayerHandDisplay(gameState.playerHand);
    UIManager.updateDunDisplay(UIManager.domElements.frontHandDiv, gameState.frontDun);
    UIManager.updateDunDisplay(UIManager.domElements.middleHandDiv, gameState.middleDun);
    UIManager.updateDunDisplay(UIManager.domElements.backHandDiv, gameState.backDun);
    checkArrangementCompletion();
}

// --- Arrangement Validation and Submission ---
function checkArrangementCompletion() {
    if (gameState.isGameOver) return;

    const frontCount = gameState.frontDun.length;
    const middleCount = gameState.middleDun.length;
    const backCount = gameState.backDun.length;
    const playerHandCount = gameState.playerHand.length;

    const allDunsFull = (frontCount === 3 && middleCount === 5 && backCount === 5);

    if (allDunsFull && playerHandCount === 0) { // 确保手牌也用完了
        UIManager.toggleSubmitButton(true);
        const validation = validateArrangementLogic(); // 内部逻辑校验
        if (validation.valid) {
            UIManager.updateMessage('牌已摆好，可确认！', 'success');
        } else {
            UIManager.updateMessage(validation.message, 'error');
        }
    } else {
        UIManager.toggleSubmitButton(false);
        if (playerHandCount > 0 && !gameState.isGameOver) {
            UIManager.updateMessage('请继续摆牌。', 'info');
        } else if (playerHandCount === 0 && !allDunsFull && !gameState.isGameOver) {
             UIManager.updateMessage('手牌已空，但墩未摆满！', 'error');
        }
    }
}

function validateArrangementLogic() {
    const frontResult = evaluateHand(gameState.frontDun, DUN_IDS.FRONT);
    const middleResult = evaluateHand(gameState.middleDun, DUN_IDS.MIDDLE);
    const backResult = evaluateHand(gameState.backDun, DUN_IDS.BACK);

    if (frontResult.type === HAND_TYPES.INVALID || middleResult.type === HAND_TYPES.INVALID || backResult.type === HAND_TYPES.INVALID) {
         return { valid: false, message: "存在牌墩牌数不正确！" };
    }

    if (compareSingleHands(frontResult, middleResult) > 0) {
        return { valid: false, message: "倒水：头墩大于中墩！", isDaoshui: true };
    }
    if (compareSingleHands(middleResult, backResult) > 0) {
        return { valid: false, message: "倒水：中墩大于尾墩！", isDaoshui: true };
    }

    return { valid: true, message: "牌墩符合规则。", results: {front: frontResult, middle: middleResult, back: backResult} };
}

export async function handleSubmit() {
    UIManager.toggleSubmitButton(false, false); // 禁用提交按钮
    UIManager.updateMessage('正在提交至服务器...', 'info');

    const localValidation = validateArrangementLogic();
    if (!localValidation.valid && !localValidation.isDaoshui) { // 非倒水的本地校验失败
        UIManager.updateMessage(`本地校验失败: ${localValidation.message}`, 'error');
        UIManager.toggleSubmitButton(true); // 重新启用
        return;
    }
    // 如果是倒水，也允许提交给后端，由后端最终判罚

    const arrangedHandData = {
        front: gameState.frontDun.map(c => c.id),
        middle: gameState.middleDun.map(c => c.id),
        back: gameState.backDun.map(c => c.id),
    };
    
    try {
        const serverResult = await ApiService.submitHandToServer(arrangedHandData);
        gameState.isGameOver = true;
        UIManager.makeAllCardsStatic(true);
        UIManager.toggleDealButton(true); // 允许开始下一局

        if (serverResult.isValid) {
            // 使用服务器返回的牌型名称更新UI (如果提供了)
            if(serverResult.frontHandType) UIManager.evaluateAndDisplayDunHandType(UIManager.domElements.frontHandDiv); // 触发重新渲染牌型
            if(serverResult.middleHandType) UIManager.evaluateAndDisplayDunHandType(UIManager.domElements.middleHandDiv);
            if(serverResult.backHandType) UIManager.evaluateAndDisplayDunHandType(UIManager.domElements.backHandDiv);
            
            // 模拟计算得分和日志 (实际应该依赖后端)
            // 但为了前端显示，我们可以用本地的 calculateRoundScore，用后端牌型或本地牌型
            const allPlayerCardsForScore = [...gameState.frontDun, ...gameState.middleDun, ...gameState.backDun];
            const scoreDetails = calculateRoundScore(localValidation.results, allPlayerCardsForScore);


            gameState.totalScore += serverResult.score; // 优先使用服务器分数
            UIManager.updateMessage(`牌型已确认! ${serverResult.message || ''}`, 'success');
            UIManager.updateScoreDisplay(gameState.totalScore, serverResult.score, scoreDetails.messageLog);
        } else {
            // 倒水或其他后端判定的无效情况
            gameState.totalScore += serverResult.score; // 可能是罚分
            UIManager.updateMessage(`牌型无效: ${serverResult.message}`, 'error');
             const allPlayerCardsForScore = [...gameState.frontDun, ...gameState.middleDun, ...gameState.backDun];
             const scoreDetails = calculateRoundScore(localValidation.results, allPlayerCardsForScore); // 仍显示日志
            UIManager.updateScoreDisplay(gameState.totalScore, serverResult.score, scoreDetails.isDaoshui ? [`倒水罚分: ${serverResult.score}`] : [`错误: ${serverResult.message}`]);
        }

    } catch (error) {
        UIManager.updateMessage(`提交失败: ${error.message}`, 'error');
        UIManager.toggleSubmitButton(true, true); // 发生错误，重新启用提交
    }
}
