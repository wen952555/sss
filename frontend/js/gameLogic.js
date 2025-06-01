// frontend/js/gameLogic.js
import { updateStatusMessage } from './ui.js';
let draggedCard = null; let currentHandDataMap = new Map(); let originalHandDataMap = new Map();
export function initializeHandData(cardsArrayFromServer) {
    currentHandDataMap.clear(); originalHandDataMap.clear();
    cardsArrayFromServer.forEach((card, index) => {
        const cardWithId = { ...card, id: `card-${Date.now()}-${index}` };
        currentHandDataMap.set(cardWithId.id, cardWithId);
        originalHandDataMap.set(cardWithId.id, { ...cardWithId }); });
    return Array.from(currentHandDataMap.values());
}
export function getOriginalHandDataArray() { return Array.from(originalHandDataMap.values()); }
export function getCardDataById(cardId) { return currentHandDataMap.get(cardId); }
export function makeCardsDraggable(selector = '.card') {
    document.querySelectorAll(selector).forEach(card => {
        card.removeEventListener('dragstart', handleDragStart); card.removeEventListener('dragend', handleDragEnd);
        card.addEventListener('dragstart', handleDragStart); card.addEventListener('dragend', handleDragEnd); });
}
function handleDragStart(e) {
    draggedCard = e.target.closest('.card'); if (!draggedCard) return;
    setTimeout(() => { if(draggedCard) draggedCard.classList.add('dragging'); }, 0);
    e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', draggedCard.dataset.cardId);
}
function handleDragEnd() { if (draggedCard) draggedCard.classList.remove('dragging'); draggedCard = null; }
export function setupDropZones(zoneElementsArray, statusElement, onDropCallback) {
    zoneElementsArray.forEach(zone => {
        zone.removeEventListener('dragover', handleDragOver); zone.removeEventListener('dragleave', handleDragLeave); zone.removeEventListener('drop', handleDrop);
        zone.addEventListener('dragover', (event) => handleDragOver(event, statusElement));
        zone.addEventListener('dragleave', handleDragLeave);
        zone.addEventListener('drop', (event) => handleDrop(event, statusElement, onDropCallback)); });
}
function handleDragOver(e, statusElement) {
    e.preventDefault(); const zone = e.currentTarget; if (!draggedCard) return;
    const maxCards = parseInt(zone.dataset.maxCards) || Infinity;
    const isPlayerInitialHand = zone.id === 'player-hand';
    if (isPlayerInitialHand || zone.children.length < maxCards) { zone.classList.add('drag-over'); e.dataTransfer.dropEffect = 'move'; }
    else { e.dataTransfer.dropEffect = 'none'; }
}
function handleDragLeave(e) { e.currentTarget.classList.remove('drag-over'); }
function handleDrop(e, statusElement, onDropCallback) {
    e.preventDefault(); const targetZone = e.currentTarget; targetZone.classList.remove('drag-over'); if (!draggedCard) return;
    const cardId = e.dataTransfer.getData('text/plain');
    const cardElementToMove = document.querySelector(`.card[data-card-id="${cardId}"]`);
    if (!cardElementToMove) { console.error("Cannot find card element with ID:", cardId); return; }
    const maxCards = parseInt(targetZone.dataset.maxCards); const isInitialHandZone = targetZone.id === 'player-hand';
    if (isInitialHandZone || !maxCards || targetZone.children.length < maxCards) {
        if (cardElementToMove.parentElement !== targetZone) targetZone.appendChild(cardElementToMove);
        if (onDropCallback) onDropCallback();
    } else { updateStatusMessage(`该区域 (${targetZone.dataset.handName || '手牌区'}) 已满!`, 'error', statusElement); }
}
export function checkArrangementComplete(arrangedContainers, initialContainer, counts) {
    if (initialContainer.children.length > 0) return false;
    return arrangedContainers.front.children.length === counts.front &&
           arrangedContainers.middle.children.length === counts.middle &&
           arrangedContainers.back.children.length === counts.back;
}
export function getCardsFromContainerForApi(containerElement) {
    const cards = [];
    containerElement.querySelectorAll('.card').forEach(cardEl => {
        const cardData = getCardDataById(cardEl.dataset.cardId);
        if (cardData) cards.push({ value: cardData.value, suit: cardData.suit });
        else console.warn(`Card data not found for cardId: ${cardEl.dataset.cardId} in ${containerElement.id}`); });
    return cards;
}
