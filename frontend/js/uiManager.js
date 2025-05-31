// frontend/js/uiManager.js
import { DUN_IDS, HAND_TYPES } from './constants.js';
import { createCardElement, getCardsFromZone } from './cardUtils.js';
import { evaluateHand } from './handEvaluator.js'; // 用于拖拽时实时显示牌型

let domElements = {}; // 存储DOM元素的引用
let currentDraggedCardElement = null; // 当前拖动的卡牌DOM元素
let onCardDropCallback = null; // 卡牌放置后的回调，由gameLogic设置

export function initUIManager(elements, cardDropCallback) {
    domElements = elements;
    onCardDropCallback = cardDropCallback;
    attachDragDropListeners();
}

export function updatePlayerHandDisplay(handCardsData) {
    domElements.playerHandDiv.innerHTML = '';
    handCardsData.forEach(cardData => {
        const cardEl = createCardElement(cardData, true, domElements.gameState.isGameOver);
        domElements.playerHandDiv.appendChild(cardEl);
    });
    updateCardCount(handCardsData.length);
}

export function updateCardCount(count) {
    if (domElements.cardCountSpan) domElements.cardCountSpan.textContent = count;
}

export function updateMessage(text, type = 'info') { // type: 'info', 'success', 'error'
    if (domElements.messageArea) {
        domElements.messageArea.textContent = text;
        domElements.messageArea.className = type; // e.g., 'success', 'error'
    }
}

export function updateScoreDisplay(totalScore, roundScore = null, roundMessageLog = []) {
    if (domElements.scoreArea) {
        let scoreText = `总分: ${totalScore}`;
        if (roundScore !== null) {
           // scoreText += ` (本局: ${roundScore})`; // 暂时不显示，信息太多
        }
        domElements.scoreArea.textContent = scoreText;
    }
    if (domElements.roundLogArea && roundMessageLog.length > 0) { // 新增回合日志区域
        domElements.roundLogArea.innerHTML = '<h4>本局详情:</h4>' + roundMessageLog.map(log => `<p>${log}</p>`).join('');
        domElements.roundLogArea.style.display = 'block';
    } else if (domElements.roundLogArea) {
        domElements.roundLogArea.style.display = 'none';
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
}

export function updateDunDisplay(dunElement, cardsData) {
    dunElement.innerHTML = ''; // 清空
    cardsData.forEach(cardData => {
        const cardEl = createCardElement(cardData, true, domElements.gameState.isGameOver);
        dunElement.appendChild(cardEl);
    });
    // 拖拽后实时判断并显示牌型
    const handTypeInfo = evaluateAndDisplayDunHandType(dunElement);
    return handTypeInfo;
}

export function evaluateAndDisplayDunHandType(dunElement) {
    const cards = getCardsFromZone(dunElement);
    const dunId = dunElement.id;
    let handTypeResult = HAND_TYPES.INVALID; // 默认为无效，除非牌数正确

    const requiredCount = (dunId === DUN_IDS.FRONT) ? 3 : 5;
    if (cards.length === requiredCount) {
        handTypeResult = evaluateHand(cards, dunId);
    } else if (cards.length > 0) { // 牌数不足但有牌
        handTypeResult = { ...HAND_TYPES.INVALID, name: `牌数不足 (${cards.length}/${requiredCount})` };
    } else { // 空墩
         handTypeResult = null; // 不显示牌型
    }
    
    updateDunHandTypeName(dunElement, handTypeResult);
    return handTypeResult;
}

function updateDunHandTypeName(dunElement, handTypeInfo) {
    let typeDisplay = dunElement.previousElementSibling; // H3标签
    if (typeDisplay && typeDisplay.tagName === 'H3') {
        let baseText = "";
        if (dunElement.id === DUN_IDS.FRONT) baseText = "头墩 (3张)";
        else if (dunElement.id === DUN_IDS.MIDDLE) baseText = "中墩 (5张)";
        else if (dunElement.id === DUN_IDS.BACK) baseText = "尾墩 (5张)";

        if (handTypeInfo && handTypeInfo.name) {
            typeDisplay.textContent = `${baseText} - ${handTypeInfo.name}`;
        } else {
            typeDisplay.textContent = baseText;
        }
    }
}

export function makeAllCardsStatic(isStatic) {
    domElements.gameState.isGameOver = isStatic; // 更新游戏结束状态
    document.querySelectorAll('.card').forEach(cardEl => {
        const cardData = cardEl.cardData; // 假设cardData在创建时已附加
        const newCardEl = createCardElement(cardData, !isStatic, isStatic); // 重建元素以更新拖拽属性
        // 替换旧元素，同时保留事件监听（如果外部有附加的话，但这里是img内部的）
        // 简单做法是直接修改draggable属性
        cardEl.draggable = !isStatic;
        cardEl.style.cursor = isStatic ? 'default' : 'grab';
    });
}


// --- Drag and Drop Event Handlers ---
function attachDragDropListeners() {
    domElements.dropZones.forEach(zone => {
        zone.addEventListener('dragover', handleDragOver);
        zone.addEventListener('dragenter', handleDragEnter);
        zone.addEventListener('dragleave', handleDragLeave);
        zone.addEventListener('drop', handleDropOnDun);
    });
    domElements.playerHandDiv.addEventListener('dragover', handleDragOver);
    domElements.playerHandDiv.addEventListener('dragenter', handleDragEnter);
    domElements.playerHandDiv.addEventListener('dragleave', handleDragLeave);
    domElements.playerHandDiv.addEventListener('drop', handleDropOnPlayerHand);

    // 卡牌本身的拖拽事件在 createCardElement 中处理
    document.addEventListener('dragstart', (event) => {
        if (event.target.classList.contains('card')) {
            if (domElements.gameState.isGameOver) { event.preventDefault(); return; }
            currentDraggedCardElement = event.target;
            event.dataTransfer.setData('text/plain', currentDraggedCardElement.dataset.cardId);
            // 增加视觉效果
            setTimeout(() => currentDraggedCardElement.classList.add('dragging'), 0);
        }
    });

    document.addEventListener('dragend', (event) => {
        if (event.target.classList.contains('card')) {
            currentDraggedCardElement.classList.remove('dragging');
            currentDraggedCardElement = null;
        }
    });
}

function handleDragOver(event) {
    event.preventDefault();
    if (domElements.gameState.isGameOver || !currentDraggedCardElement) return;
    // (悬浮高亮逻辑移至dragenter)
}

function handleDragEnter(event) {
    event.preventDefault();
    if (domElements.gameState.isGameOver || !currentDraggedCardElement) return;
    const targetZone = event.currentTarget;
    const maxCards = parseInt(targetZone.dataset.maxCards) || Infinity;
    if (targetZone.children.length < maxCards) {
        targetZone.classList.add('over');
    }
}

function handleDragLeave(event) {
    if (domElements.gameState.isGameOver || !currentDraggedCardElement) return;
    event.currentTarget.classList.remove('over');
}

function handleDropOnDun(event) {
    event.preventDefault();
    if (domElements.gameState.isGameOver || !currentDraggedCardElement) return;
    const targetZone = event.currentTarget;
    targetZone.classList.remove('over');

    const maxCards = parseInt(targetZone.dataset.maxCards);
    if (targetZone.children.length < maxCards) {
        const cardData = currentDraggedCardElement.cardData;
        const sourceZoneId = currentDraggedCardElement.parentElement.id;
        
        targetZone.appendChild(currentDraggedCardElement); // 移动DOM元素
        currentDraggedCardElement = null; // 清理
        
        // 通知gameLogic处理数据层面的移动和后续逻辑
        if (onCardDropCallback) {
            onCardDropCallback(cardData.id, targetZone.id, sourceZoneId);
        }
    } else {
        updateMessage(`此墩已满 (${maxCards}张)!`, 'error');
    }
}

function handleDropOnPlayerHand(event) {
    event.preventDefault();
    if (domElements.gameState.isGameOver || !currentDraggedCardElement) return;
    const targetZone = event.currentTarget; // playerHandDiv
    targetZone.classList.remove('over');

    const cardData = currentDraggedCardElement.cardData;
    const sourceZoneId = currentDraggedCardElement.parentElement.id;

    // 只有从牌墩拖回手牌区才处理
    if (domElements.dropZones.some(dz => dz.id === sourceZoneId)) {
        targetZone.appendChild(currentDraggedCardElement);
        currentDraggedCardElement = null;

        if (onCardDropCallback) {
            onCardDropCallback(cardData.id, targetZone.id, sourceZoneId);
        }
    }
}

export function clearAllDunTypeNames() {
    domElements.dropZones.forEach(zone => updateDunHandTypeName(zone, null));
}
