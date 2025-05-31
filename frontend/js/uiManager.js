// frontend/js/uiManager.js
import { CARD_IMAGE_BASE_PATH, SUIT_DISPLAY_MAP, RANK_DISPLAY_MAP, DUN_IDS, HAND_TYPES } from './constants.js';
import { createCardElement as createCardElementFromUtils, getCardsFromZone } from './cardUtils.js'; // 使用 cardUtils 创建元素
import { evaluateHand } from './handEvaluator.js';
import * as GameLogic from './gameLogic.js'; // 导入 gameLogic 以获取状态

let domElements = {}; // 存储DOM元素的引用
let currentDraggedCardElement = null; // 当前拖动的卡牌DOM元素
let onCardDropCallback = null; // 卡牌放置后的回调，由gameLogic设置

export function initUIManager(elements, cardDropCallback) {
    domElements = elements; // **修改点：domElements 在这里被赋值**
    onCardDropCallback = cardDropCallback;
    attachDragDropListeners();
}

export function updatePlayerHandDisplay(handCardsData) {
    if (!domElements.playerHandDiv) return;
    domElements.playerHandDiv.innerHTML = '';
    handCardsData.forEach(cardData => {
        const cardEl = createCardElementFromUtils(cardData); // **修改点：使用 cardUtils 的函数**
        domElements.playerHandDiv.appendChild(cardEl);
    });
    updateCardCount(handCardsData.length);
}

export function updateCardCount(count) {
    if (domElements.cardCountSpan) domElements.cardCountSpan.textContent = count;
}

export function updateMessage(text, type = 'info') { 
    if (domElements.messageArea) {
        domElements.messageArea.textContent = text;
        domElements.messageArea.className = type;
    }
}

export function updateScoreDisplay(totalScore, roundScore = null, roundMessageLog = []) {
    if (domElements.scoreArea) {
        let scoreText = `总分: ${totalScore}`;
        domElements.scoreArea.textContent = scoreText;
    }
    if (domElements.roundLogArea) {
        if (roundMessageLog.length > 0) {
            domElements.roundLogArea.innerHTML = '<h4>本局详情:</h4>' + roundMessageLog.map(log => `<p>${log}</p>`).join('');
            domElements.roundLogArea.style.display = 'block';
        } else {
            domElements.roundLogArea.innerHTML = ''; // 清空日志
            domElements.roundLogArea.style.display = 'none';
        }
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
    if (!dunElement) return;
    dunElement.innerHTML = '';
    cardsData.forEach(cardData => {
        const cardEl = createCardElementFromUtils(cardData); // **修改点：使用 cardUtils 的函数**
        dunElement.appendChild(cardEl);
    });
    const handTypeInfo = evaluateAndDisplayDunHandType(dunElement);
    return handTypeInfo;
}

export function evaluateAndDisplayDunHandType(dunElement) {
    if(!dunElement) return HAND_TYPES.INVALID;
    const cards = getCardsFromZone(dunElement);
    const dunId = dunElement.id;
    let handTypeResult = HAND_TYPES.INVALID;

    const requiredCount = (dunId === DUN_IDS.FRONT) ? 3 : 5;
    if (cards.length === requiredCount) {
        handTypeResult = evaluateHand(cards, dunId);
    } else if (cards.length > 0) {
        handTypeResult = { ...HAND_TYPES.INVALID, name: `牌数不足 (${cards.length}/${requiredCount})` };
    } else {
         handTypeResult = null; 
    }
    
    updateDunHandTypeName(dunElement, handTypeResult);
    return handTypeResult;
}

// 被 gameLogic.js 调用的公共版本
export function updateDunHandTypeNamePublic(dunElement, handTypeInfo) {
    updateDunHandTypeName(dunElement, handTypeInfo);
}


function updateDunHandTypeName(dunElement, handTypeInfo) {
    if (!dunElement) return;
    let typeDisplay = dunElement.previousElementSibling;
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
    // **修改点：此函数现在仅根据传入的 isStatic 参数操作，不再自己查询 gameLogic 状态**
    document.querySelectorAll('.card').forEach(cardEl => {
        cardEl.draggable = !isStatic;
        cardEl.style.cursor = isStatic ? 'default' : 'grab';
    });
}

function attachDragDropListeners() {
    if (!domElements.dropZones || !domElements.playerHandDiv) {
        console.error("Drop zones or playerHandDiv not initialized in UIManager domElements");
        return;
    }
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

    document.addEventListener('dragstart', (event) => {
        if (event.target.classList.contains('card')) {
            if (GameLogic.isGameCurrentlyOver()) { // **修改点：使用 gameLogic 的状态函数**
                event.preventDefault();
                return;
            }
            currentDraggedCardElement = event.target;
            if(event.dataTransfer) event.dataTransfer.setData('text/plain', currentDraggedCardElement.dataset.cardId);
            setTimeout(() => currentDraggedCardElement.classList.add('dragging'), 0);
        }
    });

    document.addEventListener('dragend', (event) => {
        if (currentDraggedCardElement && event.target === currentDraggedCardElement) { // 确保是之前拖动的元素
            currentDraggedCardElement.classList.remove('dragging');
            currentDraggedCardElement = null;
        }
    });
}

function handleDragOver(event) {
    event.preventDefault();
    if (GameLogic.isGameCurrentlyOver() || !currentDraggedCardElement) return; // **修改点**
}

function handleDragEnter(event) {
    event.preventDefault();
    if (GameLogic.isGameCurrentlyOver() || !currentDraggedCardElement) return; // **修改点**
    const targetZone = event.currentTarget;
    if (targetZone.dataset) { // 确保 targetZone 是期望的元素
        const maxCards = parseInt(targetZone.dataset.maxCards) || Infinity;
        if (targetZone.children.length < maxCards) {
            targetZone.classList.add('over');
        }
    }
}

function handleDragLeave(event) {
    if (GameLogic.isGameCurrentlyOver() || !currentDraggedCardElement) return; // **修改点**
    if (event.currentTarget.classList) event.currentTarget.classList.remove('over');
}

function handleDropOnDun(event) {
    event.preventDefault();
    if (GameLogic.isGameCurrentlyOver() || !currentDraggedCardElement) return; // **修改点**
    const targetZone = event.currentTarget;
    if (targetZone.classList) targetZone.classList.remove('over');

    const maxCards = parseInt(targetZone.dataset.maxCards);
    if (targetZone.children.length < maxCards) {
        const cardData = currentDraggedCardElement.cardData;
        const sourceZoneId = currentDraggedCardElement.parentElement.id;
        
        targetZone.appendChild(currentDraggedCardElement);
        // currentDraggedCardElement = null; // 由dragend处理

        if (onCardDropCallback) {
            onCardDropCallback(cardData.id, targetZone.id, sourceZoneId);
        }
    } else {
        updateMessage(`此墩已满 (${maxCards}张)!`, 'error');
    }
}

function handleDropOnPlayerHand(event) {
    event.preventDefault();
    if (GameLogic.isGameCurrentlyOver() || !currentDraggedCardElement) return; // **修改点**
    const targetZone = event.currentTarget;
    if (targetZone.classList) targetZone.classList.remove('over');

    const cardData = currentDraggedCardElement.cardData;
    const sourceZoneId = currentDraggedCardElement.parentElement.id;

    if (domElements.dropZones.some(dz => dz.id === sourceZoneId)) {
        targetZone.appendChild(currentDraggedCardElement);
        // currentDraggedCardElement = null; // 由dragend处理

        if (onCardDropCallback) {
            onCardDropCallback(cardData.id, targetZone.id, sourceZoneId);
        }
    }
}

export function clearAllDunTypeNames() {
    if (!domElements.dropZones) return;
    domElements.dropZones.forEach(zone => updateDunHandTypeName(zone, null));
}
