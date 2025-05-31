// frontend/js/gameLogic.js
import { DUN_IDS, HAND_TYPES, AI_DIFFICULTY } from './constants.js';
import { sortCards, getCardsFromZone } from './cardUtils.js';
import { evaluateHand, compareSingleHands, checkOverallSpecialHand } from './handEvaluator.js';
import { calculateRoundScore } from './scoreCalculator.js';
import * as UIManager from './uiManager.js';
import * as ApiService from './apiService.js';
import * as AIPLAYER from './aiPlayer.js'; // 引入AI模块
import { playSound } from './soundManager.js';
import { saveHighScore, getHighScore, getAIDifficulty as getStoredAIDifficulty } from './settingsManager.js'; // 引入设置

let gameState = {
    isGameOver: true, // 初始为true，等待点击开始
    playerHand: [],
    frontDun: [],
    middleDun: [],
    backDun: [],
    aiHand: [], // AI的手牌
    aiArrangement: null, // AI的摆牌结果 {front, middle, back}
    totalScore: 0,
    currentHighScore: 0,
    currentAIDifficulty: AI_DIFFICULTY.MEDIUM,
};
// 将 gameState 的部分状态暴露给 UIManager (如果 UIManager 需要直接访问)
// UIManager.domElements.gameState = gameState; // 之前的做法，现在UIManager通过函数获取


// --- Game State Accessor ---
export function isGameCurrentlyOver() {
    return gameState.isGameOver;
}

// --- Game Initialization and Control ---
export async function startNewGame(selectedAIDifficulty) {
    gameState.isGameOver = false;
    gameState.currentAIDifficulty = selectedAIDifficulty || getStoredAIDifficulty(); // 使用选项或存储的难度
    UIManager.updateMessage('正在发牌...', 'info');
    UIManager.toggleDealButton(false); // 禁用按钮直到发牌完成
    UIManager.toggleSubmitButton(false);
    UIManager.clearAllDunTypeNames(true, true); // 清空玩家和AI的牌型显示
    UIManager.updateScoreDisplay(gameState.totalScore, null, []);
    if (UIManager.domElements.aiStatusSpan) UIManager.domElements.aiStatusSpan.textContent = "(思考中...)";


    try {
        const newHandData = await ApiService.fetchNewHandFromServer();
        // 将13张牌给玩家，再发13张给AI (理论上应该从一副牌里发)
        // 为简化，我们让后端连续发两次牌（或者一次发26张）
        // 这里我们假设后端一次发13张，我们调用两次
        gameState.playerHand = sortCards(newHandData);
        
        const aiRawHand = await ApiService.fetchNewHandFromServer(); // AI获取另一手牌
        gameState.aiHand = sortCards(aiRawHand);

        // AI进行摆牌
        gameState.aiArrangement = AIPLAYER.getAIMoves([...gameState.aiHand], gameState.currentAIDifficulty); // 传递副本
        
        UIManager.updatePlayerHandDisplay(gameState.playerHand, true); // true for animation
        gameState.frontDun = []; gameState.middleDun = []; gameState.backDun = []; // 清空玩家墩数据
        UIManager.updateDunDisplay(UIManager.domElements.frontHandDiv, gameState.frontDun);
        UIManager.updateDunDisplay(UIManager.domElements.middleHandDiv, gameState.middleDun);
        UIManager.updateDunDisplay(UIManager.domElements.backDun, gameState.backDun);
        
        UIManager.updateAIDunDisplay(gameState.aiArrangement); // 显示AI的牌（可能是牌背）

        UIManager.updateMessage('发牌完成！请摆牌。', 'success');
        playSound('deal');
    } catch (error) {
        UIManager.updateMessage(`发牌或AI摆牌失败: ${error.message}`, 'error');
        playSound('error');
        gameState.isGameOver = true; // 如果出错，结束游戏
    } finally {
        UIManager.toggleDealButton(true);
        UIManager.makeAllCardsStatic(false); // 确保新局可拖动
    }
    checkArrangementCompletion();
}

export function sortPlayerHand() {
    if (isGameCurrentlyOver()) return;
    playSound('click');
    gameState.playerHand = sortCards(gameState.playerHand);
    UIManager.updatePlayerHandDisplay(gameState.playerHand);
}

// --- Card Movement Logic (Data Layer) ---
export function handleCardMovement(cardId, targetZoneId, sourceZoneId) {
    // ... (与之前版本一致，确保 UIManager.domElements.playerHandDiv.id 的访问正确)
    if (isGameCurrentlyOver()) return;
    let cardToMove = null; let sourceArray = null;
    const playerHandDivId = UIManager.domElements.playerHandDiv?.id; // 安全获取
    if (!playerHandDivId) { console.error("Player hand div ID not found in UIManager"); return; }

    if (sourceZoneId === playerHandDivId) sourceArray = gameState.playerHand;
    else if (sourceZoneId === DUN_IDS.FRONT) sourceArray = gameState.frontDun;
    else if (sourceZoneId === DUN_IDS.MIDDLE) sourceArray = gameState.middleDun;
    else if (sourceZoneId === DUN_IDS.BACK) sourceArray = gameState.backDun;

    if (sourceArray) { const idx = sourceArray.findIndex(c=>c.id===cardId); if(idx > -1) [cardToMove] = sourceArray.splice(idx, 1); }
    if (!cardToMove) { console.error("Card not found in source", cardId, sourceZoneId); redrawAllZones(); return; }

    let targetArray = null;
    if (targetZoneId === playerHandDivId) {
        targetArray = gameState.playerHand; gameState.playerHand.push(cardToMove); gameState.playerHand = sortCards(gameState.playerHand);
        UIManager.updatePlayerHandDisplay(gameState.playerHand);
    } else {
        if (targetZoneId === DUN_IDS.FRONT) targetArray = gameState.frontDun;
        else if (targetZoneId === DUN_IDS.MIDDLE) targetArray = gameState.middleDun;
        else if (targetZoneId === DUN_IDS.BACK) targetArray = gameState.backDun;
        if (targetArray) { targetArray.push(cardToMove); UIManager.evaluateAndDisplayDunHandType(document.getElementById(targetZoneId));}
    }
    if (sourceZoneId !== playerHandDivId && document.getElementById(sourceZoneId)) UIManager.evaluateAndDisplayDunHandType(document.getElementById(sourceZoneId));
    UIManager.updateCardCount(gameState.playerHand.length);
    checkArrangementCompletion();
}

function redrawAllZones() {
    // ... (与之前版本一致)
    UIManager.updatePlayerHandDisplay(gameState.playerHand);
    UIManager.updateDunDisplay(UIManager.domElements.frontHandDiv, gameState.frontDun);
    UIManager.updateDunDisplay(UIManager.domElements.middleHandDiv, gameState.middleDun);
    UIManager.updateDunDisplay(UIManager.domElements.backDun, gameState.backDun);
    checkArrangementCompletion();
}

// --- Arrangement Validation ---
function checkArrangementCompletion() {
    // ... (与之前版本一致，但现在AI也参与了，所以游戏结束条件要更明确)
    if (isGameCurrentlyOver()) return;
    const frontCount = gameState.frontDun.length; const middleCount = gameState.middleDun.length; const backCount = gameState.backDun.length;
    const playerHandCount = gameState.playerHand.length;
    const allDunsFull = (frontCount === 3 && middleCount === 5 && backCount === 5);

    if (allDunsFull && playerHandCount === 0) {
        UIManager.toggleSubmitButton(true);
        const validation = validateArrangementLogic();
        if (validation.valid) UIManager.updateMessage('牌已摆好，可确认！', 'success');
        else UIManager.updateMessage(validation.message, 'error');
    } else {
        UIManager.toggleSubmitButton(false);
        if (playerHandCount > 0 && !isGameCurrentlyOver()) UIManager.updateMessage('请继续摆牌。', 'info');
        else if (playerHandCount === 0 && !allDunsFull && !isGameCurrentlyOver()) UIManager.updateMessage('手牌已空，但墩未摆满！', 'error');
    }
}

function validateArrangementLogic() {
    // ... (与之前版本一致，确保调用 checkOverallSpecialHand)
    const frontResult = evaluateHand(gameState.frontDun, DUN_IDS.FRONT);
    const middleResult = evaluateHand(gameState.middleDun, DUN_IDS.MIDDLE);
    const backResult = evaluateHand(gameState.backDun, DUN_IDS.BACK);
    if (frontResult.type.id === HAND_TYPES.INVALID.id || middleResult.type.id === HAND_TYPES.INVALID.id || backResult.type.id === HAND_TYPES.INVALID.id)
         return { valid: false, message: "存在牌墩牌数不正确！" };
    const allPlayerCards = [...gameState.frontDun, ...gameState.middleDun, ...gameState.backDun];
    const overallSpecial = checkOverallSpecialHand(allPlayerCards, frontResult, middleResult, backResult);
    if (overallSpecial && overallSpecial.isOverallSpecial)
        return { valid: true, message: `特殊牌型: ${overallSpecial.name}!`, results: {front: frontResult, middle: middleResult, back: backResult}, overallSpecial: overallSpecial };
    if (compareSingleHands(frontResult, middleResult) > 0)
        return { valid: false, message: "倒水：头墩大于中墩！", isDaoshui: true, results: {front: frontResult, middle: middleResult, back: backResult} };
    if (compareSingleHands(middleResult, backResult) > 0)
        return { valid: false, message: "倒水：中墩大于尾墩！", isDaoshui: true, results: {front: frontResult, middle: middleResult, back: backResult} };
    return { valid: true, message: "牌墩符合规则。", results: {front: frontResult, middle: middleResult, back: backResult} };
}


// --- Submit and Game End ---
export async function handleSubmit() {
    UIManager.toggleSubmitButton(false, false);
    UIManager.updateMessage('正在结算...', 'info');
    playSound('click');

    const localPlayerValidation = validateArrangementLogic();

    // 即使本地校验是倒水或特殊牌型，我们仍将“正常”牌墩数据发给后端
    // 后端也可以做自己的完整校验和特殊牌型判断
    // 但对于AI对战，主要结算在前端
    const arrangedPlayerData = {
        front: gameState.frontDun.map(c => c.id),
        middle: gameState.middleDun.map(c => c.id),
        back: gameState.backDun.map(c => c.id),
    };

    gameState.isGameOver = true;
    UIManager.makeAllCardsStatic(true);
    UIManager.toggleDealButton(true); // 允许开始下一局

    // 评估AI的牌墩 (如果之前未评估或需要重新评估)
    let aiResults = null;
    if (gameState.aiArrangement) {
        aiResults = {
            front: evaluateHand(gameState.aiArrangement.front, DUN_IDS.FRONT),
            middle: evaluateHand(gameState.aiArrangement.middle, DUN_IDS.MIDDLE),
            back: evaluateHand(gameState.aiArrangement.back, DUN_IDS.BACK)
        };
        UIManager.revealAIDunTypes(aiResults); // 让UI显示AI的牌型
    } else {
        // AI未能成功摆牌，算作AI极大劣势
        UIManager.updateMessage("AI未能成功摆牌，玩家获胜！", "success");
        playSound('win');
        gameState.totalScore += 13; // 假设AI摆牌失败给玩家加较多分数
        if (saveHighScore(gameState.totalScore)) {
            UIManager.updateHighScoreDisplay(gameState.totalScore);
        }
        UIManager.updateScoreDisplay(gameState.totalScore, 13, ["AI摆牌失败，您获得13分（示例）"]);
        return;
    }
    
    // 玩家倒水处理
    if (localPlayerValidation.isDaoshui) {
        UIManager.updateMessage(`倒水！${localPlayerValidation.message}`, 'error');
        playSound('lose');
        const daoshuiPenalty = HAND_TYPES.DAO_SHUI.score;
        gameState.totalScore += daoshuiPenalty;
        if (saveHighScore(gameState.totalScore)) { // 倒水也可能影响最高分（如果总分变低）
            UIManager.updateHighScoreDisplay(getHighScore());
        }
        UIManager.updateScoreDisplay(gameState.totalScore, daoshuiPenalty, [`玩家倒水，罚 ${Math.abs(daoshuiPenalty)} 分`]);
        return;
    }

    // 玩家特殊牌型处理
    if (localPlayerValidation.overallSpecial) {
        UIManager.updateMessage(`恭喜！特殊牌型: ${localPlayerValidation.overallSpecial.name}!`, 'success');
        playSound('win'); // 特殊牌型通常是赢
        const specialScore = localPlayerValidation.overallSpecial.score;
        gameState.totalScore += specialScore;
        if (saveHighScore(gameState.totalScore)) {
            UIManager.updateHighScoreDisplay(gameState.totalScore);
        }
        UIManager.updateScoreDisplay(gameState.totalScore, specialScore, [`特殊牌型 ${localPlayerValidation.overallSpecial.name}，获得 ${specialScore} 分`]);
        return; // 特殊牌型直接结算，不与AI比牌 (简化规则)
    }

    // 正常比牌结算 (玩家和AI都没有直接导致游戏结束的特殊牌型或倒水)
    const playerResults = localPlayerValidation.results;
    const allPlayerCardsForScore = [...gameState.frontDun, ...gameState.middleDun, ...gameState.backDun];
    
    // **修改点：与AI进行比较计分**
    const roundOutcome = calculateRoundScoreAgainstAI(playerResults, aiResults, allPlayerCardsForScore);
    gameState.totalScore += roundOutcome.score;

    if (roundOutcome.score > 0) {
        UIManager.updateMessage(`恭喜，本局获胜! ${roundOutcome.isShooting ? '(打枪!)' : ''}`, 'success');
        playSound('win');
    } else if (roundOutcome.score < 0) {
        UIManager.updateMessage(`遗憾，本局失利。${roundOutcome.isShotByAI ? '(被AI打枪!)' : ''}`, 'error');
        playSound('lose');
    } else {
        UIManager.updateMessage('本局平手。', 'info');
        playSound('click'); // 或无声
    }
    
    if (saveHighScore(gameState.totalScore)) {
        UIManager.updateHighScoreDisplay(gameState.totalScore);
        UIManager.updateMessage(UIManager.domElements.messageArea.textContent + " 新高分!", 'success'); // 追加消息
    }
    UIManager.updateScoreDisplay(gameState.totalScore, roundOutcome.score, roundOutcome.messageLog);

    // 可以选择将玩家的牌型提交给后端进行一次校验或记录 (可选)
    // try {
    //     const serverValidation = await ApiService.submitHandToServer(arrangedPlayerData);
    //     console.log("Server validation (optional):", serverValidation);
    // } catch (apiError) {
    //     console.warn("Optional: Failed to send hand to server for validation/logging:", apiError);
    // }
}

// 新增：与AI比较计分的函数 (基于 scoreCalculator.js 的思路，但针对玩家vs AI)
function calculateRoundScoreAgainstAI(playerDunsEval, aiDunsEval, allPlayerCards) {
    let totalRoundScore = 0;
    let messageLog = [];
    let playerWinStreaks = 0;
    let aiWinStreaks = 0;

    const dunNames = { front: "头墩", middle: "中墩", back: "尾墩" };

    // 1. 检查玩家是否有整体特殊牌型 (理论上 handleSubmit 开始时已处理，这里可作防御)
    const playerOverallSpecial = checkOverallSpecialHand(allPlayerCards, playerDunsEval.front, playerDunsEval.middle, playerDunsEval.back);
    if (playerOverallSpecial && playerOverallSpecial.isOverallSpecial) {
        messageLog.push(`玩家特殊牌型: ${playerOverallSpecial.name}!`);
        totalRoundScore = playerOverallSpecial.score;
        messageLog.push(`特殊牌型得分: ${totalRoundScore}`);
        return { score: totalRoundScore, messageLog, isShooting: false, isShotByAI: false };
    }
    // (AI的整体特殊牌型也应该在AI摆牌时考虑，如果AI摆出，则AI直接赢)
    // 此处简化：假设AI摆的牌是普通牌型进行比较


    // 2. 逐墩比较
    const dunComparison = (pDun, aiDun, dunId, dunDisplayName) => {
        const pScore = pDun.type.score || 0; // 玩家该墩的基础牌型分
        const aiScore = aiDun.type.score || 0; // AI该墩的基础牌型分
        const comparisonResult = compareSingleHands(pDun, aiDun);
        let dunPoints = 0;

        if (comparisonResult > 0) { // 玩家胜该墩
            dunPoints = 1 + pScore; // 赢1道水 + 自己的牌型道水 (如果牌型分数代表道水)
            // 如果规则是赢了拿对方的牌型分，则 dunPoints = 1 + aiScore;
            messageLog.push(`${dunDisplayName} (${pDun.type.name} vs ${aiDun.type.name}): 玩家胜 +${dunPoints}`);
            playerWinStreaks++;
        } else if (comparisonResult < 0) { // AI胜该墩
            dunPoints = -(1 + aiScore); // 输1道水 + AI的牌型道水
            messageLog.push(`${dunDisplayName} (${pDun.type.name} vs ${aiDun.type.name}): AI胜 ${dunPoints}`);
            aiWinStreaks++;
        } else { // 平局
            messageLog.push(`${dunDisplayName} (${pDun.type.name} vs ${aiDun.type.name}): 平局`);
        }
        return dunPoints;
    };

    totalRoundScore += dunComparison(playerDunsEval.front, aiDunsEval.front, DUN_IDS.FRONT, dunNames.front);
    totalRoundScore += dunComparison(playerDunsEval.middle, aiDunsEval.middle, DUN_IDS.MIDDLE, dunNames.middle);
    totalRoundScore += dunComparison(playerDunsEval.back, aiDunsEval.back, DUN_IDS.BACK, dunNames.back);

    messageLog.push(`墩位比较基础得分: ${totalRoundScore}`);

    // 3. 打枪判断
    let isShooting = false;
    let isShotByAI = false;
    if (playerWinStreaks === 3) {
        isShooting = true;
        messageLog.push("玩家打枪AI! 总分翻倍!");
        totalRoundScore *= 2; // 假设翻倍
    } else if (aiWinStreaks === 3) {
        isShotByAI = true;
        messageLog.push("被AI打枪! 总分翻倍(负)!");
        totalRoundScore *= 2; // 假设翻倍
    }
    
    messageLog.push(`最终回合得分: ${totalRoundScore}`);
    return { score: totalRoundScore, messageLog, isShooting, isShotByAI };
}


// 初始化时加载最高分
export function initializeGameData() {
    gameState.currentHighScore = getHighScore();
    UIManager.updateHighScoreDisplay(gameState.currentHighScore);
    // 从settingsManager加载AI难度等并设置到gameState
    gameState.currentAIDifficulty = getStoredAIDifficulty();
    if(UIManager.domElements.aiDifficultySelect) UIManager.domElements.aiDifficultySelect.value = gameState.currentAIDifficulty;

}
