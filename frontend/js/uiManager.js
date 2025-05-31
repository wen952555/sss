// frontend/js/uiManager.js
import { DUN_IDS, HAND_TYPES, CARD_IMAGE_BASE_PATH, SUIT_DISPLAY_MAP, RANK_DISPLAY_MAP } from './constants.js';
import { createCardElement as createCardElementFromUtils, getCardsFromZone } from './cardUtils.js';
import { evaluateHand } from './handEvaluator.js';
import * as GameLogicRef from './gameLogic.js'; // 使用引用避免循环依赖问题
import { playSound } from './soundManager.js'; // 引入音效播放

export let domElements = {}; // 改为 export let 以便 gameLogic 可以访问
let onCardDropCallback = null;

export function initUIManager(elements, cardDropCallback) {
    domElements = elements;
    onCardDropCallback = cardDropCallback;
    attachDragDropListeners();
    // 初始化时，根据存储的设置更新UI（例如最高分）
    // 这部分也可以由main.js在加载设置后调用一个特定的UIManager更新函数
}

// --- 卡牌和墩位更新 ---
export function updatePlayerHandDisplay(handCardsData, animate = false) {
    if (!domElements.playerHandDiv) return;
    domElements.playerHandDiv.innerHTML = '';
    handCardsData.forEach((cardData, index) => {
        const cardEl = createCardElementFromUtils(cardData);
        if (animate) {
            cardEl.style.opacity = '0'; // 初始不可见，为动画准备
            cardEl.style.animationDelay = `${index * 0.05}s`; // 交错动画
            cardEl.classList.add('card-deal-animation');
        }
        domElements.playerHandDiv.appendChild(cardEl);
    });
    updateCardCount(handCardsData.length);
}

export function updateDunDisplay(dunElement, cardsData, isAI = false) {
    if (!dunElement) return;
    dunElement.innerHTML = '';
    cardsData.forEach(cardData => {
        const cardEl = createCardElementFromUtils(cardData);
        if (isAI) {
            // AI的牌默认不显示具体内容，直到结算 (或根据游戏设置)
            // 这里我们先都显示，但可以添加 'facedown' class
            // cardEl.classList.add('facedown'); 
            // cardEl.src = `${CARD_IMAGE_BASE_PATH}back.svg`; // 假设有牌背图片
        }
        dunElement.appendChild(cardEl);
    });
    if (!isAI) { // 只对玩家的墩实时评估显示牌型
        evaluateAndDisplayDunHandType(dunElement);
    }
}

export function updateAIDunDisplay(aiArrangement) {
    if (!aiArrangement) { // AI未能成功摆牌
        clearAIDunTypes();
        updateDunDisplay(domElements.aiFrontHandDiv, [], true);
        updateDunDisplay(domElements.aiMiddleHandDiv, [], true);
        updateDunDisplay(domElements.aiBackHandDiv, [], true);
        if(domElements.aiStatusSpan) domElements.aiStatusSpan.textContent = "(摆牌失败)";
        return;
    }
    updateDunDisplay(domElements.aiFrontHandDiv, aiArrangement.front, true);
    updateDunDisplay(domElements.aiMiddleHandDiv, aiArrangement.middle, true);
    updateDunDisplay(domElements.aiBackHandDiv, aiArrangement.back, true);
    if(domElements.aiStatusSpan) domElements.aiStatusSpan.textContent = "(已摆好)";

    // 结算时再显示AI牌型
    // updateAIDunHandTypeName(domElements.aiFrontHandDiv, evaluateHand(aiArrangement.front, DUN_IDS.FRONT));
    // updateAIDunHandTypeName(domElements.aiMiddleHandDiv, evaluateHand(aiArrangement.middle, DUN_IDS.MIDDLE));
    // updateAIDunHandTypeName(domElements.aiBackHandDiv, evaluateHand(aiArrangement.back, DUN_IDS.BACK));
}


export function revealAIDunTypes(aiResults) { // aiResults: {front: evalResult, middle: evalResult, back: evalResult}
    if (!aiResults) return;
    updateAIDunHandTypeName(domElements.aiFrontHandDiv, aiResults.front);
    updateAIDunHandTypeName(domElements.aiMiddleHandDiv, aiResults.middle);
    updateAIDunHandTypeName(domElements.aiBackHandDiv, aiResults.back);
}

export function clearAIDunTypes(){
    updateAIDunHandTypeName(domElements.aiFrontHandDiv, null);
    updateAIDunHandTypeName(domElements.aiMiddleHandDiv, null);
    updateAIDunHandTypeName(domElements.aiBackHandDiv, null);
}


// --- UI状态更新 ---
export function updateCardCount(count) {
    if (domElements.cardCountSpan) domElements.cardCountSpan.textContent = count;
}

export function updateMessage(text, type = 'info') {
    if (domElements.messageArea) {
        domElements.messageArea.textContent = text;
        domElements.messageArea.className = type;
        if (type === 'error') playSound('error');
    }
}

export function updateScoreDisplay(totalScore, roundScore = null, roundMessageLog = []) {
    if (domElements.scoreArea) {
        domElements.scoreArea.innerHTML = `总分: ${totalScore} | 最高分: <span id="highScore">${domElements.highScoreSpan?.textContent || 0}</span>`;
        // 更新内部的highScoreSpan，因为整个scoreArea被重写了
        const newHighScoreSpan = document.getElementById('highScore');
        if(newHighScoreSpan && domElements.highScoreSpan) newHighScoreSpan.textContent = domElements.highScoreSpan.textContent;
    }
    if (domElements.roundLogArea) {
        if (roundMessageLog.length > 0) {
            domElements.roundLogArea.innerHTML = '<h4>本局战报:</h4>' + roundMessageLog.map(log => {
                let className = '';
                if (log.toLowerCase().includes('胜') || log.toLowerCase().includes('赢') || log.includes('打枪')) className = 'log-win';
                else if (log.toLowerCase().includes('负') || log.toLowerCase().includes('输') || log.includes('倒水') || log.includes('被')) className = 'log-lose';
                return `<p class="${className}">${log}</p>`;
            }).join('');
            domElements.roundLogArea.style.display = 'block';
        } else {
            domElements.roundLogArea.innerHTML = '';
            domElements.roundLogArea.style.display = 'none';
        }
    }
}
export function updateHighScoreDisplay(highScore) {
    if (domElements.highScoreSpan) {
        domElements.highScoreSpan.textContent = highScore;
    }
    // 确保scoreArea中的最高分也同步，如果它已经被渲染
    const scoreAreaHighScoreSpan = document.querySelector('#scoreArea #highScore');
    if (scoreAreaHighScoreSpan) {
        scoreAreaHighScoreSpan.textContent = highScore;
    }
}


export function toggleSubmitButton(show, enabled = true) {
    if (domElements.submitArrangementButton) {
        domElements.submitArrangementButton.style.display = show ? 'block' : 'none';
        domElements.submitArrangementButton.disabled = !enabled;
    }
}

export function toggleDealButton(enabled) {
    if (domElements.dealButton) domElements.dealButton.disabled = !enabled;
    if (domElements.sortHandButton) domElements.sortHandButton.disabled = !enabled;
    // 游戏进行中，禁用设置和规则按钮
    if (domElements.settingsButton) domElements.settingsButton.disabled = !enabled;
    if (domElements.rulesButton) domElements.rulesButton.disabled = !enabled;
}

// 玩家墩的牌型评估和显示
export function evaluateAndDisplayDunHandType(dunElement) {
    // ... (与之前版本一致，使用 evaluateHand 和 updateDunHandTypeName)
    if(!dunElement) return HAND_TYPES.INVALID;
    const cards = getCardsFromZone(dunElement);
    const dunId = dunElement.id;
    let handTypeResult = HAND_TYPES.INVALID;
    const requiredCount = (dunId === DUN_IDS.FRONT) ? 3 : 5;
    if (cards.length === requiredCount) handTypeResult = evaluateHand(cards, dunId);
    else if (cards.length > 0) handTypeResult = { ...HAND_TYPES.INVALID, name: `牌数 (${cards.length}/${requiredCount})` };
    else handTypeResult = null;
    updatePlayerDunHandTypeName(dunElement, handTypeResult); // 使用特定函数更新玩家墩
    return handTypeResult;
}

// 更新玩家墩牌型名称
function updatePlayerDunHandTypeName(dunElement, handTypeInfo) {
    const typeSpanId = `player${dunElement.id.charAt(0).toUpperCase() + dunElement.id.slice(1)}Type`; // e.g. playerFrontHandType
    const typeSpan = domElements[typeSpanId + 'Span'] || document.getElementById(typeSpanId); // domElements中应该有这些span的引用
    if (typeSpan) {
        typeSpan.textContent = (handTypeInfo && handTypeInfo.name) ? `- ${handTypeInfo.name}` : "";
        typeSpan.className = `hand-type-player ${ (handTypeInfo && handTypeInfo.type && handTypeInfo.type.isSpecial) ? 'special-type' : '' }`;
    }
}

// 更新AI墩牌型名称
function updateAIDunHandTypeName(dunElement, handTypeInfo) {
    const typeSpanId = `ai${dunElement.id.charAt(2).toUpperCase() + dunElement.id.slice(3)}Type`; // e.g. aiFrontHandType (aiFrontHand -> FrontHand)
    const typeSpan = domElements[typeSpanId + 'Span'] || document.getElementById(typeSpanId);
    if (typeSpan) {
        typeSpan.textContent = (handTypeInfo && handTypeInfo.name) ? `- ${handTypeInfo.name}` : "";
         typeSpan.className = `hand-type-ai ${ (handTypeInfo && handTypeInfo.type && handTypeInfo.type.isSpecial) ? 'special-type' : '' }`;
    }
}

// 被 gameLogic.js 调用的公共版本，用于在结算后更新玩家墩（如果需要）
export function updatePlayerDunHandTypeNamePublic(dunElement, handTypeInfo) {
    updatePlayerDunHandTypeName(dunElement, handTypeInfo);
}
// 被 gameLogic.js 调用的公共版本，用于结算后显示AI牌型
export function updateAIDunHandTypeNamePublic(dunElement, handTypeInfo) {
    updateAIDunHandTypeName(dunElement, handTypeInfo);
}


export function makeAllCardsStatic(isStatic) {
    document.querySelectorAll('.card').forEach(cardEl => {
        cardEl.draggable = !isStatic;
        cardEl.style.cursor = isStatic ? 'default' : 'grab';
    });
}

export function clearAllDunTypeNames(isPlayer = true, isAI = true) {
    if (isPlayer && domElements.dropZones) {
        domElements.dropZones.forEach(zone => updatePlayerDunHandTypeName(zone, null));
    }
    if (isAI && domElements.aiFrontHandDiv) { // 检查AI的DOM元素是否存在
        updateAIDunHandTypeName(domElements.aiFrontHandDiv, null);
        updateAIDunHandTypeName(domElements.aiMiddleHandDiv, null);
        updateAIDunHandTypeName(domElements.aiBackHandDiv, null);
        if(domElements.aiStatusSpan) domElements.aiStatusSpan.textContent = "";
    }
}

// --- Modals ---
export function openModal(modalElement) {
    if (modalElement) modalElement.style.display = 'flex';
    playSound('click');
}
export function closeModal(modalElement) {
    if (modalElement) modalElement.style.display = 'none';
}


// --- Drag and Drop Event Handlers (与之前版本类似，但使用 GameLogicRef 检查游戏状态) ---
function attachDragDropListeners() {
    // ... (确保domElements已初始化)
    if (!domElements.dropZones || !domElements.playerHandDiv) return;

    domElements.dropZones.forEach(zone => { /* ...listeners... */ 
        zone.addEventListener('dragover', handleDragOver);
        zone.addEventListener('dragenter', handleDragEnter);
        zone.addEventListener('dragleave', handleDragLeave);
        zone.addEventListener('drop', handleDropOnDun);
    });
    domElements.playerHandDiv.addEventListener('dragover', handleDragOver);
    domElements.playerHandDiv.addEventListener('dragenter', handleDragEnter);
    domElements.playerHandDiv.addEventListener('dragleave', handleDragLeave);
    domElements.playerHandDiv.addEventListener('drop', handleDropOnPlayerHand);

    document.addEventListener('dragstart', (event) => {
        if (event.target.classList.contains('card')) {
            if (GameLogicRef.isGameCurrentlyOver()) { // **使用 GameLogicRef**
                event.preventDefault(); return;
            }
            currentDraggedCardElement = event.target;
            playSound('click'); // 拖拽开始音效
            if(event.dataTransfer) event.dataTransfer.setData('text/plain', currentDraggedCardElement.dataset.cardId);
            setTimeout(() => currentDraggedCardElement.classList.add('dragging'), 0);
        }
    });
    document.addEventListener('dragend', (event) => {
        if (currentDraggedCardElement && event.target === currentDraggedCardElement) {
            currentDraggedCardElement.classList.remove('dragging');
            currentDraggedCardElement = null;
        }
    });
}

function handleDragOver(event) {
    event.preventDefault();
    if (GameLogicRef.isGameCurrentlyOver() || !currentDraggedCardElement) return;
}
function handleDragEnter(event) {
    event.preventDefault();
    if (GameLogicRef.isGameCurrentlyOver() || !currentDraggedCardElement) return;
    const targetZone = event.currentTarget;
    if (targetZone.classList.contains('player-dun') || targetZone.id === 'playerHand') { // 只对玩家可放置区域生效
        const maxCards = parseInt(targetZone.dataset.maxCards) || Infinity;
        if (targetZone.children.length < maxCards) {
            targetZone.classList.add('over');
        }
    }
}
function handleDragLeave(event) {
    if (GameLogicRef.isGameCurrentlyOver() || !currentDraggedCardElement) return;
    if (event.currentTarget.classList) event.currentTarget.classList.remove('over');
}
function handleDropOnDun(event) { // Drop to a Player Dun
    event.preventDefault();
    if (GameLogicRef.isGameCurrentlyOver() || !currentDraggedCardElement) return;
    const targetZone = event.currentTarget;
    if (!targetZone.classList.contains('player-dun')) return; // 不能放到AI墩

    if (targetZone.classList) targetZone.classList.remove('over');
    const maxCards = parseInt(targetZone.dataset.maxCards);

    if (targetZone.children.length < maxCards) {
        const cardData = currentDraggedCardElement.cardData;
        const sourceZoneId = currentDraggedCardElement.parentElement.id;
        targetZone.appendChild(currentDraggedCardElement);
        playSound('click'); // 放置音效
        if (onCardDropCallback) {
            onCardDropCallback(cardData.id, targetZone.id, sourceZoneId);
        }
    } else {
        updateMessage(`此墩已满 (${maxCards}张)!`, 'error');
        playSound('error');
    }
}
function handleDropOnPlayerHand(event) {
    event.preventDefault();
    if (GameLogicRef.isGameCurrentlyOver() || !currentDraggedCardElement) return;
    const targetZone = event.currentTarget; // playerHandDiv
    if (targetZone.classList) targetZone.classList.remove('over');

    const cardData = currentDraggedCardElement.cardData;
    const sourceZoneId = currentDraggedCardElement.parentElement.id;

    if (domElements.dropZones.some(dz => dz.id === sourceZoneId)) { // 确保是从玩家的墩拖回
        targetZone.appendChild(currentDraggedCardElement);
        playSound('click');
        if (onCardDropCallback) {
            onCardDropCallback(cardData.id, targetZone.id, sourceZoneId);
        }
    }
}
