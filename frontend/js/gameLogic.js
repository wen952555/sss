// frontend/js/gameLogic.js
import { updateStatusMessage } from './ui.js';

let draggedCard = null;
let currentHandDataMap = new Map(); // 使用Map存储卡片数据，键为card.id
let originalHandDataMap = new Map(); // 用于重置

export function initializeHandData(cardsArrayFromServer) {
    currentHandDataMap.clear();
    originalHandDataMap.clear();
    cardsArrayFromServer.forEach((card, index) => {
        const cardWithId = { ...card, id: `card-${Date.now()}-${index}` }; // 生成唯一ID
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
        // 移除旧的监听器以防重复添加 (如果makeCardsDraggable被多次调用)
        // card.removeEventListener('dragstart', handleDragStart);
        // card.removeEventListener('dragend', handleDragEnd);

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
    e.dataTransfer.setData('text/plain', draggedCard.dataset.cardId); // 传递卡片ID
}

function handleDragEnd() {
    if (draggedCard) {
        draggedCard.classList.remove('dragging');
    }
    draggedCard = null;
}


export function setupDropZones(zoneElementsArray, statusElement, onDropCallback) {
    zoneElementsArray.forEach(zone => {
        // zone.removeEventListener('dragover', handleDragOver);
        // zone.removeEventListener('dragleave', handleDragLeave);
        // zone.removeEventListener('drop', handleDrop);

        zone.addEventListener('dragover', handleDragOver.bind(null, statusElement));
        zone.addEventListener('dragleave', handleDragLeave);
        zone.addEventListener('drop', (e) => handleDrop(e, statusElement, onDropCallback));
    });
}

function handleDragOver(statusElement, e) {
    e.preventDefault();
    const zone = e.currentTarget; // The element the event listener is attached to
    if (!draggedCard) return;

    const maxCards = parseInt(zone.dataset.maxCards) || Infinity;
    const isPlayerInitialHand = zone.id === 'player-hand'; // ID of the initial hand container

    if (isPlayerInitialHand || zone.children.length < maxCards) {
        zone.classList.add('drag-over');
        e.dataTransfer.dropEffect = 'move';
    } else {
        e.dataTransfer.dropEffect = 'none';
        // updateStatusMessage(`该区域 (${zone.dataset.handName || '手牌区'}) 已满!`, 'error', statusElement); // 可选：实时提示
    }
}

function handleDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
}

function handleDrop(e, statusElement, onDropCallback) {
    e.preventDefault();
    const targetZone = e.currentTarget; // The element the event listener is attached to
    targetZone.classList.remove('drag-over');

    if (!draggedCard) return;

    const cardId = e.dataTransfer.getData('text/plain');
    // 实际的DOM元素可能在dragstart时已经被修改或引用丢失，所以最好通过ID重新获取
    const cardElementToMove = document.querySelector(`.card[data-card-id="${cardId}"]`);

    if (!cardElementToMove) {
        console.error("Cannot find card element with ID:", cardId);
        return;
    }

    const maxCards = parseInt(targetZone.dataset.maxCards);
    const isInitialHandZone = targetZone.id === 'player-hand';

    if (isInitialHandZone || !maxCards || targetZone.children.length < maxCards) {
        // 检查卡片是否已在目标区域 (避免重复添加或不必要的移动)
        if (cardElementToMove.parentElement !== targetZone) {
            targetZone.appendChild(cardElementToMove);
        }
        if (onDropCallback) onDropCallback();
    } else {
        updateStatusMessage(`该区域 (${targetZone.dataset.handName || '手牌区'}) 已满!`, 'error', statusElement);
    }
    // draggedCard = null; // handleDragEnd 会处理
}


export function checkArrangementComplete(arrangedContainers, initialContainer, counts) {
    // counts = { front: 3, middle: 5, back: 5 }
    if (initialContainer.children.length > 0) return false;

    return arrangedContainers.front.children.length === counts.front &&
           arrangedContainers.middle.children.length === counts.middle &&
           arrangedContainers.back.children.length === counts.back;
}

// 辅助函数，从DOM容器中获取牌的数据 (例如用于发送到后端)
export function getCardsFromContainer(containerElement) {
    const cards = [];
    containerElement.querySelectorAll('.card').forEach(cardEl => {
        const cardData = getCardDataById(cardEl.dataset.cardId);
        if (cardData) {
            cards.push({ // 只发送后端需要的数据
                value: cardData.value,
                suit: cardData.suit,
                rank: cardData.rank // 或者其他后端需要的信息
            });
        }
    });
    return cards;
}
