// frontend/js/gameLogic.js
// Imports and gameState declaration as before

// isGameCurrentlyOver() as before

// startNewGame() and sortPlayerHand() as before

// handleCardMovement() and redrawAllZones() as before

// validateArrangementLogic() - 确保调用 checkOverallSpecialHand
function validateArrangementLogic() {
    const frontResult = evaluateHand(gameState.frontDun, DUN_IDS.FRONT);
    const middleResult = evaluateHand(gameState.middleDun, DUN_IDS.MIDDLE);
    const backResult = evaluateHand(gameState.backDun, DUN_IDS.BACK);

    if (frontResult.type === HAND_TYPES.INVALID || middleResult.type === HAND_TYPES.INVALID || backResult.type === HAND_TYPES.INVALID) {
         return { valid: false, message: "存在牌墩牌数不正确！" };
    }

    const allPlayerCardsForSpecial = [...gameState.frontDun, ...gameState.middleDun, ...gameState.backDun];
    const overallSpecial = checkOverallSpecialHand(allPlayerCardsForSpecial, frontResult, middleResult, backResult);
    if (overallSpecial && overallSpecial.isOverallSpecial) {
        return { 
            valid: true, // 特殊牌型通常视为合法摆放
            message: `特殊牌型: ${overallSpecial.name}!`, 
            results: {front: frontResult, middle: middleResult, back: backResult}, 
            overallSpecial: overallSpecial 
        };
    }

    if (compareSingleHands(frontResult, middleResult) > 0) {
        return { valid: false, message: "倒水：头墩大于中墩！", isDaoshui: true, results: {front: frontResult, middle: middleResult, back: backResult} };
    }
    if (compareSingleHands(middleResult, backResult) > 0) {
        return { valid: false, message: "倒水：中墩大于尾墩！", isDaoshui: true, results: {front: frontResult, middle: middleResult, back: backResult} };
    }

    return { valid: true, message: "牌墩符合规则。", results: {front: frontResult, middle: middleResult, back: backResult} };
}


// checkArrangementCompletion() as before, it uses validateArrangementLogic()

// handleSubmit() - 更新消息和分数显示
export async function handleSubmit() {
    UIManager.toggleSubmitButton(false, false);
    UIManager.updateMessage('正在提交至服务器...', 'info');

    const localValidation = validateArrangementLogic();
    // 即便本地判断是特殊牌型或倒水，也提交给后端做最终判断
    if (!localValidation.valid && !localValidation.isDaoshui && !localValidation.overallSpecial) {
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
        gameState.isGameOver = true;
        UIManager.makeAllCardsStatic(true);
        UIManager.toggleDealButton(true);

        // 使用后端返回的牌型名称更新UI
        const frontTypeForDisplay = serverResult.frontHandType ? { name: serverResult.frontHandType } : localValidation.results.front.type;
        const middleTypeForDisplay = serverResult.middleHandType ? { name: serverResult.middleHandType } : localValidation.results.middle.type;
        const backTypeForDisplay = serverResult.backHandType ? { name: serverResult.backHandType } : localValidation.results.back.type;
        
        UIManager.updateDunHandTypeNamePublic(UIManager.domElements.frontHandDiv, frontTypeForDisplay);
        UIManager.updateDunHandTypeNamePublic(UIManager.domElements.middleHandDiv, middleTypeForDisplay);
        UIManager.updateDunHandTypeNamePublic(UIManager.domElements.backHandDiv, backTypeForDisplay);

        // 使用本地的 calculateRoundScore 生成日志，但分数以服务器为准
        const allPlayerCardsForScore = [...gameState.frontDun, ...gameState.middleDun, ...gameState.backDun];
        // 传递 localValidation.results (包含前端评估的各墩牌型) 和 localValidation.overallSpecial
        const scoreDetails = calculateRoundScore(localValidation.results, allPlayerCardsForScore);

        if (serverResult.isOverallSpecial) { // 后端判定为整体特殊牌型
            gameState.totalScore += serverResult.score;
            UIManager.updateMessage(`特殊牌型: ${serverResult.overallSpecialType}! ${serverResult.message || ''}`, 'success');
            // scoreDetails.messageLog 应该已经包含了特殊牌型信息，如果本地也判断出来了
            // 如果本地没判断出，但后端判断出了，日志里可能没有，需要补充
            let logForDisplay = scoreDetails.messageLog;
            if (!logForDisplay.some(msg => msg.includes(serverResult.overallSpecialType))) {
                logForDisplay.unshift(`服务器判定特殊牌型: ${serverResult.overallSpecialType}!`);
            }
            UIManager.updateScoreDisplay(gameState.totalScore, serverResult.score, logForDisplay);
        } else if (serverResult.isValid) { // 普通合法牌型
            gameState.totalScore += serverResult.score;
            UIManager.updateMessage(`牌型已确认! ${serverResult.message || ''}`, 'success');
            UIManager.updateScoreDisplay(gameState.totalScore, serverResult.score, scoreDetails.messageLog);
        } else { // 后端判定无效 (如倒水)
            gameState.totalScore += serverResult.score; // 可能是罚分
            UIManager.updateMessage(`牌型无效: ${serverResult.message}`, 'error');
            let errorLog = [`服务器判定无效: ${serverResult.message}`];
            if (scoreDetails.isDaoshui) { // 如果本地也判断是倒水
                errorLog = scoreDetails.messageLog; // 使用本地倒水日志
            }
            UIManager.updateScoreDisplay(gameState.totalScore, serverResult.score, errorLog);
        }

    } catch (error) {
        UIManager.updateMessage(`提交失败: ${error.message}`, 'error');
        UIManager.toggleSubmitButton(true, true);
        // gameState.isGameOver = false; // 考虑是否回滚
        // UIManager.makeAllCardsStatic(false);
    }
}
// 其他 gameLogic.js 的函数 (startNewGame, sortPlayerHand, handleCardMovement, redrawAllZones, checkArrangementCompletion) 保持不变
// (确保所有导入和函数定义完整)
