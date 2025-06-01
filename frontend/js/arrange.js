// frontend/js/arrange.js
import { showGameMessage, configureButton } from './ui.js';
import { createCardImageElement } from './card.js';
// 导入新的验证器模块
import { validateArrangement, verifyCardsAreFromHand, evaluateHand } from './rules_validator.js';

// ... (大部分变量和函数定义不变)
let fullHandData = []; // Stores {rank, suit, id, element, selected, currentPile}
let piles = { head: [], middle: [], tail: [] };
const pileLimits = { head: 3, middle: 5, tail: 5 };
let gameState = 'INITIAL';
// ... (DOM element references and constants)

// ... (initializeArrangeUIDependencies, calculateCardWidth, initializeArrangement, setMiddlePileRole) ...
// ... (renderPile, renderAllPiles, updatePileCount, updateAllPileCounts, handleCardSelectionInSource) ...

// 修改：在放置牌或移除牌后，进行一次即时验证（可选，但体验好）
function onPileChanged(changedPileName) {
    renderPile(changedPileName); // Re-render the changed pile
    if (changedPileName === 'middle' && gameState === 'ARRANGING_FROM_MIDDLE') {
        renderPile('middle'); // If source pile changed, re-render it too
    }
    updateAllPileCounts();
    const arrangementStatus = checkAndHandleGameStateTransition(); // Checks for 3-5-5 completion

    // Perform pre-validation if all piles have the correct number of cards
    if (arrangementStatus) { // True if 3-5-5 structure is met
        const headPileCards = piles.head.map(c => ({ rank: c.rank, suit: c.suit }));
        const middlePileCards = piles.middle.map(c => ({ rank: c.rank, suit: c.suit }));
        const tailPileCards = piles.tail.map(c => ({ rank: c.rank, suit: c.suit }));

        // Verify cards are from original hand (this check is more for submission really)
        // const originalHandSimple = fullHandData.map(c => ({rank: c.rank, suit: c.suit}));
        // if (!verifyCardsAreFromHand(originalHandSimple, headPileCards, middlePileCards, tailPileCards)) {
        //     showGameMessage("错误：提交的牌与手牌不符！", "error");
        //     configureButton('submitArrangementBtn', { enable: false }); // Disable submit
        //     return;
        // }

        const validationResult = validateArrangement(headPileCards, middlePileCards, tailPileCards);
        if (!validationResult.isValid) {
            showGameMessage(`预检: ${validationResult.message}`, "warning");
            // Don't disable submit yet, let user fix it. Backend will do final check.
        } else {
            // Display current pile types as a preview
            let previewMsg = "当前牌型: ";
            if (validationResult.details) {
                previewMsg += `头(${validationResult.details.head.name}) `;
                previewMsg += `中(${validationResult.details.middle.name}) `;
                previewMsg += `尾(${validationResult.details.tail.name})`;
            }
            showGameMessage(previewMsg, "info");
        }
    } else if (gameState === 'ARRANGING_FROM_MIDDLE' || gameState === 'ARRANGEMENT_COMPLETE') {
        // If not 3-5-5 yet, but user is arranging, clear previous validation messages or show arranging message.
        // showGameMessage("理牌中...", "info"); // Avoid too many messages, let user focus.
    }
}


export function addSelectedCardToTargetPile(targetPileName) {
    // ... (existing logic to find selectedCard and check pile limits) ...
    if (targetPileName === 'middle' && gameState === 'ARRANGING_FROM_MIDDLE') { showGameMessage("手牌区不能作为目标。"); return; }
    const selectedCard = fullHandData.find(c => c.selected && c.currentPile === 'middle');
    if (!selectedCard) { showGameMessage("请先从手牌区选择一张牌。"); return; }
    if (piles[targetPileName].length >= pileLimits[targetPileName]) { showGameMessage(`${targetPileName.charAt(0).toUpperCase() + targetPileName.slice(1)}墩已满。`); return; }

    const indexInMiddle = piles.middle.findIndex(c => c.id === selectedCard.id);
    if (indexInMiddle > -1) piles.middle.splice(indexInMiddle, 1);

    selectedCard.currentPile = targetPileName; selectedCard.selected = false;
    piles[targetPileName].push(selectedCard); // piles[targetPileName] stores full cardData objects

    // Call the new onPileChanged instead of direct rendering/updating
    onPileChanged(targetPileName);
    if (targetPileName !== 'middle') onPileChanged('middle'); // Also update source if card removed

    showGameMessage(`${selectedCard.element?.alt || '卡牌'} 已放入 ${targetPileName}墩。`);
}

function moveCardBackToSource(sourcePileName, cardId) {
    // ... (existing logic to find cardData and splice from sourcePile) ...
    if (gameState === 'ARRANGEMENT_COMPLETE' && sourcePileName === 'middle') { showGameMessage("牌型已确认，请重置以修改中墩。"); return; }
    if (sourcePileName === 'middle' && gameState === 'ARRANGING_FROM_MIDDLE') return;
    const cardIndexInPile = piles[sourcePileName].findIndex(c => c.id === cardId);
    if (cardIndexInPile === -1) return;
    const cardData = piles[sourcePileName].splice(cardIndexInPile, 1)[0];

    cardData.currentPile = 'middle'; cardData.selected = false;
    piles.middle.push(cardData);
    if (gameState === 'ARRANGEMENT_COMPLETE') { gameState = 'ARRANGING_FROM_MIDDLE'; setMiddlePileRole(true); }

    // Call the new onPileChanged
    onPileChanged(sourcePileName);
    onPileChanged('middle');

    showGameMessage(`${cardData.element?.alt || '卡牌'} 已从 ${sourcePileName}墩 移回手牌区。`);
}


// 修改 getArrangedPilesData 以包含预验证
export function getArrangedPilesData(isPreSubmitCheck = false) { // Add a flag
    const arrangementComplete = checkAndHandleGameStateTransition(); // This checks 3-5-5 counts
    if (!arrangementComplete) {
        if (!isPreSubmitCheck) showGameMessage("牌型未完成摆放 (数量不足)。");
        return null;
    }

    const headPileCards = piles.head.map(c => ({ rank: c.rank, suit: c.suit }));
    const middlePileCards = piles.middle.map(c => ({ rank: c.rank, suit: c.suit }));
    const tailPileCards = piles.tail.map(c => ({ rank: c.rank, suit: c.suit }));

    // Verify cards are from original hand (important check before sending to server)
    // Extract simple {rank, suit} from fullHandData for verification
    const originalHandForVerification = fullHandData.map(c => ({ rank: c.rank, suit: c.suit }));
    if (!verifyCardsAreFromHand(originalHandForVerification, headPileCards, middlePileCards, tailPileCards)) {
        if (!isPreSubmitCheck) showGameMessage("错误：提交的牌与您的原始手牌不符！", "error");
        return null; // Critical error, don't proceed
    }

    const validationResult = validateArrangement(headPileCards, middlePileCards, tailPileCards);
    if (!validationResult.isValid) {
        if (!isPreSubmitCheck) showGameMessage(`错误: ${validationResult.message} (前端预检)`, "error");
        return null; // Don't allow submission of foul hands if pre-checked
    }
    
    if (isPreSubmitCheck) return validationResult; // For AI apply, just return validation

    return { // For actual submission to server
        head: headPileCards,
        middle: middlePileCards,
        tail: tailPileCards
    };
}

// 修改 applyAISuggestion 以使用前端验证
export function applyAISuggestion(arrangementData) {
    // ... (之前的逻辑来匹配AI牌张到fullHandData，并填充piles.head, piles.middle, piles.tail)
    // (Ensure this part correctly updates `piles` with full cardData objects from `fullHandData`)
    if (!arrangementData || !arrangementData.head || !arrangementData.middle || !arrangementData.tail) {
        showGameMessage("AI建议数据无效。", "error"); return;
    }
    if (arrangementData.head.length !== pileLimits.head ||
        arrangementData.middle.length !== pileLimits.middle ||
        arrangementData.tail.length !== pileLimits.tail) {
        showGameMessage("AI建议的牌墩数量错误。", "error"); return;
    }

    let availableCards = [...fullHandData];
    function findAndPopMatchingCard(aiCardSimple) {
        const index = availableCards.findIndex(origCard =>
            origCard.rank === aiCardSimple.rank && origCard.suit === aiCardSimple.suit);
        if (index > -1) { return availableCards.splice(index, 1)[0];}
        console.warn("AI Suggestion: Could not find original card for", aiCardSimple);
        return { ...aiCardSimple, id: `ai-fallback-${Math.random()}`, selected: false, element: null };
    }

    piles.head = arrangementData.head.map(aiCard => {
        const matchedCard = findAndPopMatchingCard(aiCard);
        matchedCard.currentPile = 'head'; return matchedCard;
    });
    piles.middle = arrangementData.middle.map(aiCard => {
        const matchedCard = findAndPopMatchingCard(aiCard);
        matchedCard.currentPile = 'middle'; return matchedCard;
    });
    piles.tail = arrangementData.tail.map(aiCard => {
        const matchedCard = findAndPopMatchingCard(aiCard);
        matchedCard.currentPile = 'tail'; return matchedCard;
    });
    if (availableCards.length !== 0) {
        showGameMessage("AI建议与手牌不完全匹配，请检查。", "error");
    }
    fullHandData.forEach(card => { /* update currentPile and selected from piles assignments */
        let foundInPile = false;
        for(const pileKey in piles){
            if(piles[pileKey].find(c => c.id === card.id)){
                card.currentPile = pileKey;
                foundInPile = true;
                break;
            }
        }
        if(!foundInPile) card.currentPile = null; // Should not happen ideally
        card.selected = false;
    });
    // --- End of card mapping logic ---

    gameState = 'ARRANGEMENT_COMPLETE';
    setMiddlePileRole(false);

    renderAllPiles();
    updateAllPileCounts();
    
    // Validate the AI's suggestion using frontend validator (as a sanity check)
    const validationResult = getArrangedPilesData(true); // Call with preSubmitCheck = true
    if (validationResult && validationResult.isValid) {
        const details = validationResult.details;
        showGameMessage(`AI建议: 头(${details.head.name}), 中(${details.middle.name}), 尾(${details.tail.name})`, "info");
    } else if (validationResult) { // Valid structure, but foul
        showGameMessage(`AI建议不合规: ${validationResult.message}。请手动调整或再次请求AI。`, "warning");
    } else { // Structure error from getArrangedPilesData (e.g. card mismatch)
         showGameMessage(`应用AI建议时发生错误。请重试。`, "error");
    }
    // Enable submit button regardless, backend will do final check
    checkAndHandleGameStateTransition();
}


// ... (其他函数如 resetArrangement, setupPileClickHandlers, clearBoardForNewGame, checkAndHandleGameStateTransition 保持不变)
// (但 checkAndHandleGameStateTransition 现在依赖于 getArrangedPilesData(true) 的结果来决定是否显示提交按钮)
function checkAndHandleGameStateTransition() {
    const headCount = piles.head.length; const tailCount = piles.tail.length; const middleCount = piles.middle.length;
    const totalInPiles = headCount + middleCount + tailCount;

    // Condition for enabling submit: all cards placed correctly by count
    const countsCorrect = headCount === pileLimits.head && tailCount === pileLimits.tail &&
                          middleCount === pileLimits.middle && totalInPiles === fullHandData.length &&
                          fullHandData.length > 0;

    if (countsCorrect) {
        // Even if counts are correct, we might be in ARRANGING_FROM_MIDDLE if user just completed it.
        // The actual transition to ARRANGEMENT_COMPLETE happens here implicitly if not already.
        if (gameState !== 'ARRANGEMENT_COMPLETE') {
             gameState = 'ARRANGEMENT_COMPLETE';
             setMiddlePileRole(false); // Ensure middle pile is not in hand source mode
             // Potentially show a message or rely on onPileChanged's message
        }
        // Pre-validate before enabling submit button (optional, but good UX)
        const validation = getArrangedPilesData(true);
        if (validation && validation.isValid) {
            configureButton('submitArrangementBtn', { show: true, enable: true });
        } else {
             configureButton('submitArrangementBtn', { show: true, enable: false }); // Show but disable if pre-check fails
             if (validation) { // If validation ran but failed
                 // showGameMessage(`提示: ${validation.message}`, "warning"); // Message already shown by onPileChanged
             } else if (fullHandData.length > 0){ // Counts correct but getArrangedPilesData returned null (e.g. card mismatch)
                 configureButton('submitArrangementBtn', { show: false }); // Hide if critical error
             }
        }
    } else { // Counts are not correct for a full arrangement
        if (gameState === 'ARRANGEMENT_COMPLETE') { // If we were complete, but user moved a card
            gameState = 'ARRANGING_FROM_MIDDLE';
            setMiddlePileRole(true); // Switch middle back to hand source if cards moved out
        }
        configureButton('submitArrangementBtn', { show: false });
    }
    return gameState === 'ARRANGEMENT_COMPLETE' && countsCorrect;
}


// (Ensure all other functions like initializeArrangeUIDependencies, calculateCardWidth, etc. are present)
// ... (Rest of the file from previous complete version) ...
