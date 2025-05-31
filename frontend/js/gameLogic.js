// frontend/js/gameLogic.js
import { DUN_IDS, HAND_TYPES } from './constants.js';
import { sortCards, getCardsFromZone } from './cardUtils.js';
import { evaluateHand, compareSingleHands, checkOverallSpecialHand } from './handEvaluator.js'; // 确保导入 checkOverallSpecialHand
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
};

// **修改点：移除了 UIManager.domElements.gameState = gameState;**

// 新增一个导出函数，让其他模块可以安全地获取 isGameOver 状态
export function isGameCurrentlyOver() {
    return gameState.isGameOver;
}

// --- Game Initialization and Control ---
export async function startNewGame() {
    gameState.isGameOver = false; // 首先设置 gameState
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
        UIManager.updateDunDisplay(UIManager.domElements.frontHandDiv, gameState.frontDun); // UIManager需要domElements
        UIManager.updateDunDisplay(UIManager.domElements.middleHandDiv, gameState.middleDun);
        UIManager.updateDunDisplay(UIManager.domElements.backHandDiv, gameState.backDun);
        
        UIManager.updateMessage('发牌完成！请摆牌。', 'success');
    } catch (error) {
        UIManager.updateMessage(`发牌失败: ${error.message}`, 'error');
    } finally {
        UIManager.toggleDealButton(true);
        UIManager.makeAllCardsStatic(false); // gameLogic 通知 UIManager 更新卡牌状态
    }
    checkArrangementCompletion();
}

export function sortPlayerHand() {
    if (isGameCurrentlyOver()) return; // 使用导出函数检查状态
    gameState.playerHand = sortCards(gameState.playerHand);
    UIManager.updatePlayerHandDisplay(gameState.playerHand);
}

// --- Card Movement Logic (Data Layer) ---
export function handleCardMovement(cardId, targetZoneId, sourceZoneId) {
    if (isGameCurrentlyOver()) return;

    let cardToMove = null;
    let sourceArray = null;
    let targetIsPlayerHand = targetZoneId === UIManager.domElements.playerHandDiv.id; // UIManager需要domElements

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
        redrawAllZones(); // 发生错误时同步UI
        return;
    }

    let targetArray = null;
    if (targetIsPlayerHand) {
        targetArray = gameState.playerHand;
        gameState.playerHand.push(cardToMove);
        gameState.playerHand = sortCards(gameState.playerHand);
        UIManager.updatePlayerHandDisplay(gameState.playerHand);
    } else {
        if (targetZoneId === DUN_IDS.FRONT) targetArray = gameState.frontDun;
        else if (targetZoneId === DUN_IDS.MIDDLE) targetArray = gameState.middleDun;
        else if (targetZoneId === DUN_IDS.BACK) targetArray = gameState.backDun;
        
        if (targetArray) {
            targetArray.push(cardToMove);
            UIManager.evaluateAndDisplayDunHandType(document.getElementById(targetZoneId));
        }
    }
    
    if (sourceZoneId !== UIManager.domElements.playerHandDiv.id && document.getElementById(sourceZoneId)) {
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

function checkArrangementCompletion() {
    if (isGameCurrentlyOver()) return;

    const frontCount = gameState.frontDun.length;
    const middleCount = gameState.middleDun.length;
    const backCount = gameState.backDun.length;
    const playerHandCount = gameState.playerHand.length;

    const allDunsFull = (frontCount === 3 && middleCount === 5 && backCount === 5);

    if (allDunsFull && playerHandCount === 0) {
        UIManager.toggleSubmitButton(true);
        const validation = validateArrangementLogic();
        if (validation.valid) {
            UIManager.updateMessage('牌已摆好，可确认！', 'success');
        } else {
            UIManager.updateMessage(validation.message, 'error');
        }
    } else {
        UIManager.toggleSubmitButton(false);
        if (playerHandCount > 0 && !isGameCurrentlyOver()) {
            UIManager.updateMessage('请继续摆牌。', 'info');
        } else if (playerHandCount === 0 && !allDunsFull && !isGameCurrentlyOver()) {
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

    // 检查整手牌特殊牌型
    const allPlayerCardsForSpecial = [...gameState.frontDun, ...gameState.middleDun, ...gameState.backDun];
    const overallSpecial = checkOverallSpecialHand(allPlayerCardsForSpecial, frontResult, middleResult, backResult);
    if (overallSpecial && overallSpecial.isOverallSpecial) {
        // 如果是整体特殊牌型，通常不进行倒水检查，直接认为是合法的特殊摆法
        return { valid: true, message: `特殊牌型: ${overallSpecial.name}!`, results: {front: frontResult, middle: middleResult, back: backResult}, overallSpecial: overallSpecial };
    }

    if (compareSingleHands(frontResult, middleResult) > 0) {
        return { valid: false, message: "倒水：头墩大于中墩！", isDaoshui: true, results: {front: frontResult, middle: middleResult, back: backResult} };
    }
    if (compareSingleHands(middleResult, backResult) > 0) {
        return { valid: false, message: "倒水：中墩大于尾墩！", isDaoshui: true, results: {front: frontResult, middle: middleResult, back: backResult} };
    }

    return { valid: true, message: "牌墩符合规则。", results: {front: frontResult, middle: middleResult, back: backResult} };
}

export async function handleSubmit() {
    UIManager.toggleSubmitButton(false, false);
    UIManager.updateMessage('正在提交至服务器...', 'info');

    const localValidation = validateArrangementLogic();
    // 即使本地校验是倒水，也提交给后端，让后端做最终裁决和计分
    // 但如果本地校验是其他无效（例如牌数不对），则不提交 (ApiService应该也会做校验)
    if (!localValidation.valid && !localValidation.isDaoshui && !(localValidation.overallSpecial && localValidation.overallSpecial.isOverallSpecial)) {
        UIManager.updateMessage(`本地校验失败: ${localValidation.message}`, 'error');
        UIManager.toggleSubmitButton(true, true);
        return;
    }

    const arrangedHandData = {
        front: gameState.frontDun.map(c => c.id),
        middle: gameState.middleDun.map(c => c.id),
        back: gameState.backDun.map(c => c.id),
    };
    
    try {
        const serverResult = await ApiService.submitHandToServer(arrangedHandData);
        gameState.isGameOver = true; // **修改点：在这里更新 isGameOver**
        UIManager.makeAllCardsStatic(true); // 通知 UIManager 更新卡牌状态
        UIManager.toggleDealButton(true);

        // 更新UI的牌型显示，优先使用服务器返回的牌型名称
        const frontTypeForDisplay = serverResult.frontHandType ? { name: serverResult.frontHandType } : localValidation.results.front.type;
        const middleTypeForDisplay = serverResult.middleHandType ? { name: serverResult.middleHandType } : localValidation.results.middle.type;
        const backTypeForDisplay = serverResult.backHandType ? { name: serverResult.backHandType } : localValidation.results.back.type;
        
        UIManager.updateDunHandTypeNamePublic(UIManager.domElements.frontHandDiv, frontTypeForDisplay);
        UIManager.updateDunHandTypeNamePublic(UIManager.domElements.middleHandDiv, middleTypeForDisplay);
        UIManager.updateDunHandTypeNamePublic(UIManager.domElements.backHandDiv, backTypeForDisplay);


        // 使用本地计算的 scoreDetails 来显示详细日志，但总分使用服务器的
        const allPlayerCardsForScore = [...gameState.frontDun, ...gameState.middleDun, ...gameState.backDun];
        // 即使服务器说isValid=false (例如倒水), localValidation.results 可能还是有牌型的
        const scoreDetails = calculateRoundScore(localValidation.results, allPlayerCardsForScore); 

        if (serverResult.isValid || serverResult.isOverallSpecial) {
            gameState.totalScore += serverResult.score;
            let successMessage = `牌型已确认! ${serverResult.message || ''}`;
            if (serverResult.isOverallSpecial && serverResult.overallSpecialType) {
                successMessage = `特殊牌型: ${serverResult.overallSpecialType}! ${serverResult.message || ''}`;
            }
            UIManager.updateMessage(successMessage, 'success');
            UIManager.updateScoreDisplay(gameState.totalScore, serverResult.score, scoreDetails.messageLog);
        } else {
            // 倒水或其他后端判定的无效情况
            gameState.totalScore += serverResult.score; // 可能是罚分
            UIManager.updateMessage(`牌型无效: ${serverResult.message}`, 'error');
            // 倒水时，scoreDetails.messageLog 应该会包含倒水信息
            UIManager.updateScoreDisplay(gameState.totalScore, serverResult.score, [`错误: ${serverResult.message}`, ...scoreDetails.messageLog]);
        }

    } catch (error) {
        UIManager.updateMessage(`提交失败: ${error.message}`, 'error');
        UIManager.toggleSubmitButton(true, true);
        // 出错时，确保 isGameOver 状态回滚或正确设置
        // gameState.isGameOver = false; // 或者根据业务逻辑决定
        // UIManager.makeAllCardsStatic(false);
    }
}
