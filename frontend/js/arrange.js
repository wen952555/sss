// frontend/js/arrange.js
import { showGameMessage, configureButton } from './ui.js';
import { createCardImageElement } from './card.js';

let fullHandData = [];
let piles = { head: [], middle: [], tail: [] };
const pileLimits = { head: 3, middle: 5, tail: 5 };
let gameState = 'INITIAL';

const CARD_ASPECT_RATIO = 63 / 88; // 标准扑克牌宽高比
const NARROW_SCREEN_HAND_ROWS = 2; // 手机屏幕手牌区固定行数
const NARROW_SCREEN_BREAKPOINT_WIDTH = 700; // px, 切换手牌区布局的断点 (可调整)
const MIN_CARD_WIDTH = 40; // px
const MAX_CARD_WIDTH = 90; // px

// DOM Elements (no change from previous)
const middlePileAreaDOM = document.getElementById('middlePileArea');
const middlePileTitleDOM = document.getElementById('middlePileTitle');
const pileCardContainers = {
    head: document.getElementById('headPileCards'),
    middle: document.getElementById('middlePileCards'),
    tail: document.getElementById('tailPileCards')
};
const pileCountDisplays = { /* ... */ }; // unchanged

// --- Helper function to calculate card size ---
function calculateCardWidth(containerWidth, numCardsToFitInRow, gap) {
    if (numCardsToFitInRow <= 0) return MAX_CARD_WIDTH;
    const totalGapWidth = (numCardsToFitInRow - 1) * gap;
    let cardWidth = (containerWidth - totalGapWidth) / numCardsToFitInRow;
    return Math.max(MIN_CARD_WIDTH, Math.min(cardWidth, MAX_CARD_WIDTH));
}

export function initializeArrangement(handCards) {
    // ... (unchanged: fullHandData, piles, gameState init) ...
    fullHandData = handCards.map((card, index) => ({
        ...card, id: `card-${index}-${Date.now()}`, element: null, selected: false, currentPile: 'middle'
    }));
    piles = { head: [], middle: [...fullHandData], tail: [] };
    gameState = 'ARRANGING_FROM_MIDDLE';

    setMiddlePileRole(true); // Will trigger renderAllPiles via renderPile('middle')
    // renderAllPiles(); // setMiddlePileRole now handles rendering middle, others can be direct
    renderPile('head');
    renderPile('tail');
    updateAllPileCounts();
    checkAndHandleGameStateTransition();
    showGameMessage("请从下方“手牌区”选择牌，再点击头墩或尾墩放置。");
}

function setMiddlePileRole(isHandSource) {
    // ... (unchanged: class toggling, title, count display) ...
    const middlePileCardsContainer = pileCardContainers.middle;
    if (isHandSource) {
        middlePileAreaDOM.classList.add('is-hand-source');
        middlePileAreaDOM.classList.remove('is-middle-pile');
        middlePileTitleDOM.textContent = '手牌区';
        middlePileTitleDOM.classList.add('is-hand-source-title');
        pileCountDisplays.middle.textContent = `${piles.middle.length}/${fullHandData.length}`;
    } else {
        middlePileAreaDOM.classList.remove('is-hand-source');
        middlePileAreaDOM.classList.add('is-middle-pile');
        middlePileTitleDOM.textContent = '中墩';
        middlePileTitleDOM.classList.remove('is-hand-source-title');
        pileCountDisplays.middle.textContent = `${piles.middle.length}/${pileLimits.middle}`;
    }
    renderPile('middle'); // Crucial: re-render middle pile to apply new layout logic
}

function renderPile(pileName) {
    const container = pileCardContainers[pileName];
    container.innerHTML = '';
    const cardsToRender = piles[pileName];
    if (!cardsToRender) return;

    const isHandSourceMiddle = pileName === 'middle' && gameState === 'ARRANGING_FROM_MIDDLE';
    const isCompletedMiddle = pileName === 'middle' && gameState === 'ARRANGEMENT_COMPLETE';
    const containerWidth = container.offsetWidth;
    const gap = parseFloat(getComputedStyle(container).gap) || 6; // Get gap from CSS or default

    if (isHandSourceMiddle && cardsToRender.length > 0) {
        const isNarrowScreen = window.innerWidth <= NARROW_SCREEN_BREAKPOINT_WIDTH;

        if (isNarrowScreen) {
            // Narrow screen: force NARROW_SCREEN_HAND_ROWS rows
            const cardsPerRowApprox = Math.ceil(cardsToRender.length / NARROW_SCREEN_HAND_ROWS);
            let currentCardIndex = 0;
            for (let i = 0; i < NARROW_SCREEN_HAND_ROWS && currentCardIndex < cardsToRender.length; i++) {
                const rowContainer = document.createElement('div');
                rowContainer.className = 'card-row';
                const numCardsThisRow = (i === 0 && cardsToRender.length === 13) ? 6 : // Special case 6-7 for 13 cards
                                      (i === NARROW_SCREEN_HAND_ROWS - 1) ? cardsToRender.length - currentCardIndex : cardsPerRowApprox;

                const cardWidth = calculateCardWidth(containerWidth, numCardsThisRow, gap);

                for (let j = 0; j < numCardsThisRow && currentCardIndex < cardsToRender.length; j++) {
                    const cardData = cardsToRender[currentCardIndex++];
                    const cardElement = createCardImageElement(cardData);
                    cardData.element = cardElement;
                    cardElement.style.width = `${cardWidth}px`;
                    // cardElement.style.height = `${cardWidth / CARD_ASPECT_RATIO}px`; // aspect-ratio CSS handles this
                    cardElement.dataset.cardId = cardData.id;
                    cardElement.classList.add('selectable-card');
                    if (cardData.selected) cardElement.classList.add('selected');
                    cardElement.addEventListener('click', (e) => { e.stopPropagation(); handleCardSelectionInSource(cardData.id); });
                    rowContainer.appendChild(cardElement);
                }
                container.appendChild(rowContainer);
            }
        } else {
            // Wide screen: single row with wrapping, calculate optimal card size
            // Try to fit all cards in one row if possible, otherwise let them wrap
            const idealCardsInRow = cardsToRender.length; // Or a max like 13
            const cardWidth = calculateCardWidth(containerWidth, idealCardsInRow, gap);

            cardsToRender.forEach(cardData => {
                const cardElement = createCardImageElement(cardData);
                cardData.element = cardElement;
                cardElement.style.width = `${cardWidth}px`;
                cardElement.dataset.cardId = cardData.id;
                cardElement.classList.add('selectable-card');
                if (cardData.selected) cardElement.classList.add('selected');
                cardElement.addEventListener('click', (e) => { e.stopPropagation(); handleCardSelectionInSource(cardData.id); });
                container.appendChild(cardElement);
            });
        }
    } else { // Head, Tail, or Completed Middle pile
        const numCardsToFit = pileName === 'middle' ? pileLimits.middle :
                              pileName === 'head' ? pileLimits.head : pileLimits.tail;
        const cardWidth = calculateCardWidth(containerWidth, numCardsToFit, gap);

        cardsToRender.forEach(cardData => {
            const cardElement = createCardImageElement(cardData);
            cardData.element = cardElement;
            cardElement.style.width = `${cardWidth}px`;
            cardElement.dataset.cardId = cardData.id;
            cardElement.classList.add('pile-card');

            if (!isCompletedMiddle) { // Add remove button for head, tail, or arranging middle (though middle won't be here)
                const removeBtn = document.createElement('span');
                removeBtn.textContent = '×';
                removeBtn.classList.add('remove-card-btn');
                removeBtn.title = '从墩中移除';
                removeBtn.onclick = (e) => { e.stopPropagation(); moveCardBackToSource(pileName, cardData.id); };
                cardElement.appendChild(removeBtn);
            }
            container.appendChild(cardElement);
        });
    }
}

let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        // Re-render all piles on resize as card sizes might change
        renderAllPiles();
    }, 200); // Debounce
});

// ... (Rest of the functions: renderAllPiles, updatePileCount, updateAllPileCounts,
//      handleCardSelectionInSource, addSelectedCardToTargetPile, moveCardBackToSource,
//      checkAndHandleGameStateTransition, resetArrangement, getArrangedPilesData,
//      setupPileClickHandlers, clearBoardForNewGame - ensure they are correctly defined
//      as in previous complete versions. Minor tweaks might be needed if card data or
//      state dependencies changed, but the core logic should hold.)

// Ensure all other functions are present and correct from your previous complete `arrange.js`
function renderAllPiles() {
    for (const pileName in piles) {
        renderPile(pileName);
    }
}
function updatePileCount(pileName) {
    let currentCount = piles[pileName] ? piles[pileName].length : 0;
    let limit;
    if (pileName === 'middle' && gameState === 'ARRANGING_FROM_MIDDLE') {
        limit = fullHandData.length;
    } else {
        limit = pileLimits[pileName];
    }
    pileCountDisplays[pileName].textContent = `${currentCount}/${limit}`;
}
function updateAllPileCounts() { for (const pileName in piles) { updatePileCount(pileName); } }
function handleCardSelectionInSource(cardId) {
    if (gameState !== 'ARRANGING_FROM_MIDDLE') return;
    const cardData = fullHandData.find(c => c.id === cardId && c.currentPile === 'middle');
    if (!cardData) return;
    fullHandData.forEach(c => {
        if (c.id !== cardId && c.selected && c.currentPile === 'middle') {
            c.selected = false; if (c.element) c.element.classList.remove('selected');
        }
    });
    cardData.selected = !cardData.selected;
    if (cardData.element) cardData.element.classList.toggle('selected', cardData.selected);
    showGameMessage(cardData.selected ? `已选择 ${cardData.element.alt}，请点击目标墩。` : "已取消选择。");
}
export function addSelectedCardToTargetPile(targetPileName) {
    if (targetPileName === 'middle' && gameState === 'ARRANGING_FROM_MIDDLE') {
        showGameMessage("手牌区不能作为目标。"); return;
    }
    const selectedCard = fullHandData.find(c => c.selected && c.currentPile === 'middle');
    if (!selectedCard) { showGameMessage("请先从手牌区选择一张牌。"); return; }
    if (piles[targetPileName].length >= pileLimits[targetPileName]) {
        showGameMessage(`${targetPileName.charAt(0).toUpperCase() + targetPileName.slice(1)}墩已满。`); return;
    }
    const indexInMiddle = piles.middle.findIndex(c => c.id === selectedCard.id);
    if (indexInMiddle > -1) piles.middle.splice(indexInMiddle, 1);
    selectedCard.currentPile = targetPileName; selectedCard.selected = false;
    piles[targetPileName].push(selectedCard);
    renderPile('middle'); renderPile(targetPileName); updateAllPileCounts(); checkAndHandleGameStateTransition();
    showGameMessage(`${selectedCard.element.alt} 已放入 ${targetPileName}墩。`);
}
function moveCardBackToSource(sourcePileName, cardId) {
    if (gameState === 'ARRANGEMENT_COMPLETE' && sourcePileName === 'middle') {
        showGameMessage("牌型已确认，请重置以修改中墩。"); return;
    }
    if (sourcePileName === 'middle' && gameState === 'ARRANGING_FROM_MIDDLE') return;
    const cardIndexInPile = piles[sourcePileName].findIndex(c => c.id === cardId);
    if (cardIndexInPile === -1) return;
    const cardData = piles[sourcePileName].splice(cardIndexInPile, 1)[0];
    cardData.currentPile = 'middle'; cardData.selected = false;
    piles.middle.push(cardData);
    if (gameState === 'ARRANGEMENT_COMPLETE') { gameState = 'ARRANGING_FROM_MIDDLE'; setMiddlePileRole(true); }
    renderPile(sourcePileName); renderPile('middle'); updateAllPileCounts(); checkAndHandleGameStateTransition();
    showGameMessage(`${cardData.element ? cardData.element.alt : '卡牌'} 已从 ${sourcePileName}墩 移回手牌区。`);
}
function checkAndHandleGameStateTransition() {
    const headCount = piles.head.length; const tailCount = piles.tail.length; const middleCount = piles.middle.length;
    const totalInPiles = headCount + middleCount + tailCount;
    if (headCount === pileLimits.head && tailCount === pileLimits.tail && middleCount === pileLimits.middle && totalInPiles === fullHandData.length && fullHandData.length > 0) {
        if (gameState !== 'ARRANGEMENT_COMPLETE') {
            gameState = 'ARRANGEMENT_COMPLETE'; setMiddlePileRole(false);
            showGameMessage("牌型初步完成！中墩已确认。请检查或提交。");
            configureButton('submitArrangementBtn', { show: true, enable: true });
        }
    } else {
        if (gameState === 'ARRANGEMENT_COMPLETE') { gameState = 'ARRANGING_FROM_MIDDLE'; setMiddlePileRole(true); }
        if (fullHandData.length > 0 || gameState !== 'INITIAL') { configureButton('submitArrangementBtn', { show: false });}
    }
    return gameState === 'ARRANGEMENT_COMPLETE';
}
export function resetArrangement() {
    if (fullHandData.length === 0 && piles.middle.length === 0) { showGameMessage("请先发牌。"); return; }
    fullHandData.forEach(card => { card.currentPile = 'middle'; card.selected = false; });
    piles = { head: [], middle: [...fullHandData], tail: [] }; gameState = 'ARRANGING_FROM_MIDDLE';
    setMiddlePileRole(true); renderAllPiles(); updateAllPileCounts(); checkAndHandleGameStateTransition();
    showGameMessage("理牌已重置。");
}
export function getArrangedPilesData() {
    if (gameState !== 'ARRANGEMENT_COMPLETE') { showGameMessage("牌型未完成或不符合提交条件！"); return null; }
    return {
        head: piles.head.map(c => ({ rank: c.rank, suit: c.suit })),
        middle: piles.middle.map(c => ({ rank: c.rank, suit: c.suit })),
        tail: piles.tail.map(c => ({ rank: c.rank, suit: c.suit }))
    };
}
export function setupPileClickHandlers() {
    document.getElementById('headPileArea').addEventListener('click', () => addSelectedCardToTargetPile('head'));
    document.getElementById('tailPileArea').addEventListener('click', () => addSelectedCardToTargetPile('tail'));
}
export function clearBoardForNewGame() {
    fullHandData = []; piles = { head: [], middle: [], tail: [] }; gameState = 'INITIAL';
    Object.values(pileCardContainers).forEach(container => container.innerHTML = '');
    setMiddlePileRole(true); middlePileTitleDOM.textContent = '手牌区';
    pileCountDisplays.middle.textContent = `0/0`;
    updateAllPileCounts();
    configureButton('submitArrangementBtn', { show: false }); configureButton('resetArrangementBtn', { show: false });
}
