// frontend/js/gameLogic.js
import { updateStatusMessage } from './ui.js';

let draggedCard = null;
let currentHandDataMap = new Map(); // 使用Map存储卡片数据，键为card.id
let originalHandDataMap = new Map(); // 用于重置

export function initializeHandData(cardsArrayFromServer) {
    currentHandDataMap.clear();
    originalHandDataMap.clear();
    cardsArrayFromServer.forEach((card, index) => {
        // 后端发的牌数据应该已经包含了 imageName, displayValue, displaySuit, rank
        // 我们只需要在前端为拖拽和识别添加一个唯一ID
        const cardWithId = { ...card, id: `card-${Date.now()}-${index}` };
        currentHandDataMap.set(cardWithId.id, cardWithId);
        originalHandDataMap.set(cardWithId.id, { ...cardWithId }); // 深拷贝副本
    });
    return Array.from(currentHandDataMap.values()); // 返回数组供UI渲染
}

export function getOriginalHandDataArray() {
    return Array.from(originalHandDataMap.values());
}

export function getCardDataById(cardId) {
    return currentHandDataMap.get(cardId);
}

export function makeCardsDraggable(selector = '.card') {
    const cards = document.querySelectorAll(selector);
    cards.forEach(card => {
        card.removeEventListener('dragstart', handleDragStart); // 移除旧监听器避免重复
        card.removeEventListener('dragend', handleDragEnd);     // 移除旧监听器避免重复
        card.addEventListener('dragstart', handleDragStart);
        card.addEventListener('dragend', handleDragEnd);
    });
}

function handleDragStart(e) {
    draggedCard = e.target.closest('.card');
    if (!draggedCard) return;
    setTimeout(() => {
        if(draggedCard) draggedCard.classList.add('dragging');
    }, 0);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', draggedCard.dataset.cardId);
}

function handleDragEnd() {
    if (draggedCard) {
        draggedCard.classList.remove('dragging');
    }
    draggedCard = null;
}


export function setupDropZones(zoneElementsArray, statusElement, onDropCallback) {
    zoneElementsArray.forEach(zone => {
        zone.removeEventListener('dragover', handleDragOver); // 移除旧监听器
        zone.removeEventListener('dragleave', handleDragLeave); // 移除旧监听器
        zone.removeEventListener('drop', handleDrop); // 移除旧监听器

        // 使用 bind 来传递额外的参数到事件处理器，或者在处理器内部获取
        zone.addEventListener('dragover', (event) => handleDragOver(event, statusElement));
        zone.addEventListener('dragleave', handleDragLeave);
        zone.addEventListener('drop', (event) => handleDrop(event, statusElement, onDropCallback));
    });
}

function handleDragOver(e, statusElement) { // statusElement 作为参数传入
    e.preventDefault();
    const zone = e.currentTarget;
    if (!draggedCard) return;

    const maxCards = parseInt(zone.dataset.maxCards) || Infinity;
    const isPlayerInitialHand = zone.id === 'player-hand';

    if (isPlayerInitialHand || zone.children.length < maxCards) {
        zone.classList.add('drag-over');
        e.dataTransfer.dropEffect = 'move';
    } else {
        e.dataTransfer.dropEffect = 'none';
    }
}

function handleDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
}

function handleDrop(e, statusElement, onDropCallback) { // statusElement 和 onDropCallback 作为参数传入
    e.preventDefault();
    const targetZone = e.currentTarget;
    targetZone.classList.remove('drag-over');

    if (!draggedCard) return;

    const cardId = e.dataTransfer.getData('text/plain');
    const cardElementToMove = document.querySelector(`.card[data-card-id="${cardId}"]`);

    if (!cardElementToMove) {
        console.error("Cannot find card element with ID:", cardId);
        return;
    }

    const maxCards = parseInt(targetZone.dataset.maxCards);
    const isInitialHandZone = targetZone.id === 'player-hand';

    if (isInitialHandZone || !maxCards || targetZone.children.length < maxCards) {
        if (cardElementToMove.parentElement !== targetZone) {
            targetZone.appendChild(cardElementToMove);
        }
        if (onDropCallback) onDropCallback();
    } else {
        updateStatusMessage(`该区域 (${targetZone.dataset.handName || '手牌区'}) 已满!`, 'error', statusElement);
    }
}


export function checkArrangementComplete(arrangedContainers, initialContainer, counts) {
    if (initialContainer.children.length > 0) return false;

    return arrangedContainers.front.children.length === counts.front &&
           arrangedContainers.middle.children.length === counts.middle &&
           arrangedContainers.back.children.length === counts.back;
}

/**
 * 从指定的DOM容器中提取卡片数据。
 * 后端只需要value和suit来进行评估。
 * @param {HTMLElement} containerElement - 包含卡片的DOM元素。
 * @returns {Array<Object>} 一个包含卡片对象的数组, e.g., [{value: 'ace', suit: 'spades'}, ...]
 */
export function getCardsFromContainerForApi(containerElement) {
    const cards = [];
    containerElement.querySelectorAll('.card').forEach(cardEl => {
        const cardId = cardEl.dataset.cardId;
        const cardData = getCardDataById(cardId); // 从我们存储的Map中获取完整数据
        if (cardData) {
            cards.push({
                value: cardData.value, // 后端 Card 类构造函数需要 value
                suit: cardData.suit    // 和 suit
            });
        } else {
            console.warn(`Card data not found for cardId: ${cardId} in container ${containerElement.id}`);
        }
    });
    return cards;
}
