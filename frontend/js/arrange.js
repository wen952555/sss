// frontend/js/arrange.js
import { showGameMessage, configureButton } from './ui.js';
import { createCardImageElement } from './card.js';

let fullHandData = [];
let piles = { head: [], middle: [], tail: [] };
const pileLimits = { head: 3, middle: 5, tail: 5 };
let gameState = 'INITIAL';

const CARD_ASPECT_RATIO = 63 / 88;
const NARROW_SCREEN_HAND_ROWS = 2;
const NARROW_SCREEN_BREAKPOINT_WIDTH = 700;
const MIN_CARD_WIDTH = 40;
const MAX_CARD_WIDTH = 90;

// Declare DOM element references at the top level, initialize them later
let middlePileAreaDOM, middlePileTitleDOM;
let pileCardContainers = { head: null, middle: null, tail: null };
let pileCountDisplays = { head: null, middle: null, tail: null };

// NEW: Function to initialize DOM element references
export function initializeArrangeUIDependencies() {
    middlePileAreaDOM = document.getElementById('middlePileArea');
    middlePileTitleDOM = document.getElementById('middlePileTitle');

    pileCardContainers.head = document.getElementById('headPileCards');
    pileCardContainers.middle = document.getElementById('middlePileCards');
    pileCardContainers.tail = document.getElementById('tailPileCards');

    pileCountDisplays.head = document.getElementById('headPileCount');
    pileCountDisplays.middle = document.getElementById('middlePileCount'); // Crucial
    pileCountDisplays.tail = document.getElementById('tailPileCount');

    // Log to confirm they are found (or not)
    if (!pileCountDisplays.middle) {
        console.error("ARRANGE.JS ERROR: 'middlePileCount' element NOT FOUND in DOM during initialization!");
    }
    if (!middlePileAreaDOM || !middlePileTitleDOM || !pileCardContainers.head || !pileCardContainers.middle || !pileCardContainers.tail || !pileCountDisplays.head || !pileCountDisplays.tail) {
        console.warn("ARRANGE.JS WARN: One or more UI dependencies were not found during initialization. Check HTML IDs.");
    }
}


function calculateCardWidth(containerWidth, numCardsToFitInRow, gap) {
    if (numCardsToFitInRow <= 0 || !containerWidth) return MAX_CARD_WIDTH; // Added !containerWidth check
    const totalGapWidth = Math.max(0, (numCardsToFitInRow - 1)) * gap; // Ensure gap isn't negative
    let cardWidth = (containerWidth - totalGapWidth) / numCardsToFitInRow;
    return Math.max(MIN_CARD_WIDTH, Math.min(cardWidth, MAX_CARD_WIDTH));
}

export function initializeArrangement(handCards) {
    fullHandData = handCards.map((card, index) => ({
        ...card, id: `card-${index}-${Date.now()}`, element: null, selected: false, currentPile: 'middle'
    }));
    piles = { head: [], middle: [...fullHandData], tail: [] };
    gameState = 'ARRANGING_FROM_MIDDLE';

    setMiddlePileRole(true);
    renderPile('head'); // Render these after middle pile is set up, if they depend on its size
    renderPile('tail');
    updateAllPileCounts();
    checkAndHandleGameStateTransition();
    showGameMessage("请从下方“手牌区”选择牌，再点击头墩或尾墩放置。");
}

function setMiddlePileRole(isHandSource) {
    if (!middlePileAreaDOM || !middlePileTitleDOM || !pileCountDisplays.middle) { // Guard clause
        console.error("setMiddlePileRole: Required DOM elements not initialized.");
        return;
    }

    const middleCardsContainer = pileCardContainers.middle;
    if (isHandSource) {
        middlePileAreaDOM.classList.add('is-hand-source');
        middlePileAreaDOM.classList.remove('is-middle-pile');
        if (middleCardsContainer) middleCardsContainer.classList.add('middle-hand-source-layout'); // Check if exists
        middlePileTitleDOM.textContent = '手牌区';
        middlePileTitleDOM.classList.add('is-hand-source-title');
        pileCountDisplays.middle.textContent = `${piles.middle.length}/${fullHandData.length}`;
    } else {
        middlePileAreaDOM.classList.remove('is-hand-source');
        middlePileAreaDOM.classList.add('is-middle-pile');
        if (middleCardsContainer) middleCardsContainer.classList.remove('middle-hand-source-layout'); // Check if exists
        middlePileTitleDOM.textContent = '中墩';
        middlePileTitleDOM.classList.remove('is-hand-source-title');
        pileCountDisplays.middle.textContent = `${piles.middle.length}/${pileLimits.middle}`;
    }
    renderPile('middle');
}

function renderPile(pileName) {
    const container = pileCardContainers[pileName];
    if (!container) { // Guard clause
        console.warn(`renderPile: Container for pile "${pileName}" not found.`);
        return;
    }
    container.innerHTML = '';
    const cardsToRender = piles[pileName];
    if (!cardsToRender) return;

    const isHandSourceMiddle = pileName === 'middle' && gameState === 'ARRANGING_FROM_MIDDLE';
    const isCompletedMiddle = pileName === 'middle' && gameState === 'ARRANGEMENT_COMPLETE';
    const containerWidth = container.offsetWidth; // Ensure container is visible and has width
    const gapStyle = getComputedStyle(container).gap;
    const gap = gapStyle && gapStyle !== 'normal' ? parseFloat(gapStyle) : 6;


    if (isHandSourceMiddle && cardsToRender.length > 0) {
        const isNarrowScreen = window.innerWidth <= NARROW_SCREEN_BREAKPOINT_WIDTH;
        if (isNarrowScreen) {
            const cardsPerRowApprox = Math.ceil(cardsToRender.length / NARROW_SCREEN_HAND_ROWS);
            let currentCardIndex = 0;
            for (let i = 0; i < NARROW_SCREEN_HAND_ROWS && currentCardIndex < cardsToRender.length; i++) {
                const rowContainer = document.createElement('div');
                rowContainer.className = 'card-row';
                const numCardsThisRow = (i === 0 && cardsToRender.length === 13 && NARROW_SCREEN_HAND_ROWS === 2) ? 6 :
                                      (i === NARROW_SCREEN_HAND_ROWS - 1) ? cardsToRender.length - currentCardIndex : cardsPerRowApprox;
                const cardWidth = calculateCardWidth(containerWidth, numCardsThisRow, gap);
                for (let j = 0; j < numCardsThisRow && currentCardIndex < cardsToRender.length; j++) {
                    const cardData = cardsToRender[currentCardIndex++];
                    const cardElement = createCardImageElement(cardData);
                    cardData.element = cardElement;
                    cardElement.style.width = `${cardWidth}px`;
                    cardElement.dataset.cardId = cardData.id;
                    cardElement.classList.add('selectable-card');
                    if (cardData.selected) cardElement.classList.add('selected');
                    cardElement.addEventListener('click', (e) => { e.stopPropagation(); handleCardSelectionInSource(cardData.id); });
                    rowContainer.appendChild(cardElement);
                }
                container.appendChild(rowContainer);
            }
        } else { // Wide screen
            const idealCardsInRow = Math.min(cardsToRender.length, 13); // Try to fit up to 13, or all if less
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
        const cardWidth = calculateCardWidth(containerWidth, cardsToRender.length > 0 ? Math.min(numCardsToFit, cardsToRender.length) : numCardsToFit, gap);

        cardsToRender.forEach(cardData => {
            const cardElement = createCardImageElement(cardData);
            cardData.element = cardElement;
            cardElement.style.width = `${cardWidth}px`;
            cardElement.dataset.cardId = cardData.id;
            cardElement.classList.add('pile-card');
            if (!isCompletedMiddle) {
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
        renderAllPiles();
    }, 200);
});

function renderAllPiles() {
    for (const pileName in piles) {
        renderPile(pileName);
    }
}

function updatePileCount(pileName) {
    if (!pileCountDisplays[pileName]) return; // Guard clause
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
    showGameMessage(cardData.selected ? `已选择 ${cardData.element?.alt || '卡牌'}，请点击目标墩。` : "已取消选择。");
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
    showGameMessage(`${selectedCard.element?.alt || '卡牌'} 已放入 ${targetPileName}墩。`);
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
    showGameMessage(`${cardData.element?.alt || '卡牌'} 已从 ${sourcePileName}墩 移回手牌区。`);
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
    if (fullHandData.length === 0 && (!piles.middle || piles.middle.length === 0)) { showGameMessage("请先发牌。"); return; }
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
    const headPileDOM = document.getElementById('headPileArea');
    const tailPileDOM = document.getElementById('tailPileArea');
    if (headPileDOM) headPileDOM.addEventListener('click', () => addSelectedCardToTargetPile('head'));
    if (tailPileDOM) tailPileDOM.addEventListener('click', () => addSelectedCardToTargetPile('tail'));
}

export function clearBoardForNewGame() {
    fullHandData = []; piles = { head: [], middle: [], tail: [] }; gameState = 'INITIAL';
    Object.values(pileCardContainers).forEach(container => {
        if (container) container.innerHTML = '';
    });

    // Ensure setMiddlePileRole is called when its dependencies are available
    if (middlePileAreaDOM && middlePileTitleDOM && pileCountDisplays.middle) {
         setMiddlePileRole(true); // Set to hand source appearance, but it will be empty
         middlePileTitleDOM.textContent = '手牌区';
         pileCountDisplays.middle.textContent = `0/0`;
    } else {
        console.warn("clearBoardForNewGame: Cannot call setMiddlePileRole, DOM elements missing.");
    }

    updateAllPileCounts(); // Will update counts for empty head/tail as well
    configureButton('submitArrangementBtn', { show: false });
    configureButton('resetArrangementBtn', { show: false });
}
