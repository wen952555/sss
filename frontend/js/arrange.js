// frontend/js/arrange.js
import { showGameMessage, configureButton } from './ui.js';
import { createCardImageElement } from './card.js';

// ... (其他变量和函数定义保持不变，直到 renderPile) ...
let fullHandData = [];
let piles = { head: [], middle: [], tail: [] };
const pileLimits = { head: 3, middle: 5, tail: 5 };
let gameState = 'INITIAL';

const middlePileAreaDOM = document.getElementById('middlePileArea');
const middlePileTitleDOM = document.getElementById('middlePileTitle');
const pileCardContainers = {
    head: document.getElementById('headPileCards'),
    middle: document.getElementById('middlePileCards'),
    tail: document.getElementById('tailPileCards')
};
const pileCountDisplays = {
    head: document.getElementById('headPileCount'),
    middle: document.getElementById('middlePileCount'),
    tail: document.getElementById('tailPileCount')
};

// ... (initializeArrangement, setMiddlePileRole 等函数定义不变) ...
export function initializeArrangement(handCards) {
    fullHandData = handCards.map((card, index) => ({
        ...card,
        id: `card-${index}-${Date.now()}`,
        element: null,
        selected: false,
        currentPile: 'middle'
    }));

    piles = { head: [], middle: [...fullHandData], tail: [] };
    gameState = 'ARRANGING_FROM_MIDDLE';

    setMiddlePileRole(true);
    renderAllPiles();
    updateAllPileCounts();
    checkAndHandleGameStateTransition();
    showGameMessage("请从下方“手牌区”选择牌，再点击头墩或尾墩放置。");
}

function setMiddlePileRole(isHandSource) {
    const middlePileCardsContainer = pileCardContainers.middle; // 获取中墩的卡牌容器
    if (isHandSource) {
        middlePileAreaDOM.classList.add('is-hand-source');
        middlePileAreaDOM.classList.remove('is-middle-pile');
        middlePileCardsContainer.classList.add('middle-hand-source-layout'); // 添加特殊布局类
        middlePileTitleDOM.textContent = '手牌区';
        middlePileTitleDOM.classList.add('is-hand-source-title');
        pileCountDisplays.middle.textContent = `${piles.middle.length}/${fullHandData.length}`;
    } else {
        middlePileAreaDOM.classList.remove('is-hand-source');
        middlePileAreaDOM.classList.add('is-middle-pile');
        middlePileCardsContainer.classList.remove('middle-hand-source-layout'); // 移除特殊布局类
        middlePileTitleDOM.textContent = '中墩';
        middlePileTitleDOM.classList.remove('is-hand-source-title');
        pileCountDisplays.middle.textContent = `${piles.middle.length}/${pileLimits.middle}`;
    }
}


function renderPile(pileName) {
    const container = pileCardContainers[pileName];
    container.innerHTML = ''; // Clear previous cards

    if (pileName === 'middle' && gameState === 'ARRANGING_FROM_MIDDLE' && piles.middle.length > 0) {
        // Special rendering for middle pile as hand source (two rows)
        const cardsInMiddle = piles.middle; // These are the cards to display
        const row1Limit = 6;
        
        const row1Container = document.createElement('div');
        row1Container.className = 'card-row';
        const row2Container = document.createElement('div');
        row2Container.className = 'card-row';

        cardsInMiddle.forEach((cardData, index) => {
            const cardElement = createCardImageElement(cardData);
            cardData.element = cardElement;
            cardElement.dataset.cardId = cardData.id;
            cardElement.classList.add('selectable-card');
            if (cardData.selected) {
                cardElement.classList.add('selected');
            }
            cardElement.addEventListener('click', (e) => {
                e.stopPropagation();
                handleCardSelectionInSource(cardData.id);
            });

            if (index < row1Limit) {
                row1Container.appendChild(cardElement);
            } else {
                row2Container.appendChild(cardElement);
            }
        });
        container.appendChild(row1Container);
        if (row2Container.hasChildNodes()) { // Only append row2 if it has cards
            container.appendChild(row2Container);
        }

    } else { // Normal rendering for head, tail, or middle pile when it's a formal pile
        piles[pileName].forEach(cardData => {
            const cardElement = createCardImageElement(cardData);
            cardData.element = cardElement;
            cardElement.dataset.cardId = cardData.id;

            // For head, tail, or completed middle pile, add remove button
            // (but not for ARRANGEMENT_COMPLETE middle pile itself, handled by game logic)
            if (gameState !== 'ARRANGEMENT_COMPLETE' || pileName !== 'middle') {
                 cardElement.classList.add('pile-card'); // Target for remove button style
                const removeBtn = document.createElement('span');
                removeBtn.textContent = '×';
                removeBtn.classList.add('remove-card-btn');
                removeBtn.title = '从墩中移除';
                removeBtn.onclick = (e) => {
                    e.stopPropagation();
                    moveCardBackToSource(pileName, cardData.id);
                };
                cardElement.appendChild(removeBtn);
            }
             else if (pileName === 'middle' && gameState === 'ARRANGEMENT_COMPLETE'){
                // For a completed middle pile, no remove button, just display card
                 cardElement.classList.add('pile-card'); // Keep consistent styling
            }
            container.appendChild(cardElement);
        });
    }
}

// ... (renderAllPiles, updatePileCount, updateAllPileCounts, handleCardSelectionInSource, addSelectedCardToTargetPile, moveCardBackToSource, checkAndHandleGameStateTransition, resetArrangement, getArrangedPilesData, setupPileClickHandlers, clearBoardForNewGame 函数定义不变) ...
// (Make sure these functions are present and correct from the previous version)
function renderAllPiles() {
    for (const pileName in piles) {
        renderPile(pileName);
    }
}

function updatePileCount(pileName) {
    let currentCount = piles[pileName].length;
    let limit;
    if (pileName === 'middle' && gameState === 'ARRANGING_FROM_MIDDLE') {
        limit = fullHandData.length;
    } else {
        limit = pileLimits[pileName];
    }
    pileCountDisplays[pileName].textContent = `${currentCount}/${limit}`;
}

function updateAllPileCounts() {
    for (const pileName in piles) {
        updatePileCount(pileName);
    }
}

function handleCardSelectionInSource(cardId) {
    if (gameState !== 'ARRANGING_FROM_MIDDLE') return;

    const cardData = fullHandData.find(c => c.id === cardId && c.currentPile === 'middle');
    if (!cardData) return;

    fullHandData.forEach(c => {
        if (c.id !== cardId && c.selected && c.currentPile === 'middle') {
            c.selected = false;
            if(c.element) c.element.classList.remove('selected');
        }
    });

    cardData.selected = !cardData.selected;
    if (cardData.element) {
        cardData.element.classList.toggle('selected', cardData.selected);
    }
    if(cardData.selected) {
        showGameMessage(`已选择 ${cardData.element.alt}，请点击目标墩。`);
    } else {
        showGameMessage("已取消选择。");
    }
}

export function addSelectedCardToTargetPile(targetPileName) {
    if (targetPileName === 'middle' && gameState === 'ARRANGING_FROM_MIDDLE') {
        showGameMessage("手牌区不能作为目标。");
        return;
    }

    const selectedCard = fullHandData.find(c => c.selected && c.currentPile === 'middle');
    if (!selectedCard) {
        showGameMessage("请先从手牌区选择一张牌。");
        return;
    }

    if (piles[targetPileName].length >= pileLimits[targetPileName]) {
        showGameMessage(`${targetPileName.charAt(0).toUpperCase() + targetPileName.slice(1)}墩已满。`);
        return;
    }

    const indexInMiddle = piles.middle.findIndex(c => c.id === selectedCard.id);
    if (indexInMiddle > -1) {
        piles.middle.splice(indexInMiddle, 1);
    }

    selectedCard.currentPile = targetPileName;
    selectedCard.selected = false;
    piles[targetPileName].push(selectedCard);

    renderPile('middle');
    renderPile(targetPileName);
    updateAllPileCounts();
    checkAndHandleGameStateTransition();
    showGameMessage(`${selectedCard.element.alt} 已放入 ${targetPileName}墩。`);
}

function moveCardBackToSource(sourcePileName, cardId) {
    if (gameState === 'ARRANGEMENT_COMPLETE' && sourcePileName === 'middle') {
        showGameMessage("牌型已确认，请重置以修改中墩。");
        return;
    }
     if (sourcePileName === 'middle' && gameState === 'ARRANGING_FROM_MIDDLE') return;


    const cardIndexInPile = piles[sourcePileName].findIndex(c => c.id === cardId);
    if (cardIndexInPile === -1) return;

    const cardData = piles[sourcePileName].splice(cardIndexInPile, 1)[0];
    const cardAltText = cardData.element ? cardData.element.alt : `${cardData.suit} ${cardData.rank}`;

    cardData.currentPile = 'middle';
    cardData.selected = false;
    piles.middle.push(cardData);

    if (gameState === 'ARRANGEMENT_COMPLETE') {
        gameState = 'ARRANGING_FROM_MIDDLE';
        setMiddlePileRole(true);
    }

    renderPile(sourcePileName);
    renderPile('middle');
    updateAllPileCounts();
    checkAndHandleGameStateTransition();
    showGameMessage(`${cardAltText} 已从 ${sourcePileName}墩 移回手牌区。`);
}

function checkAndHandleGameStateTransition() {
    const headCount = piles.head.length;
    const tailCount = piles.tail.length;
    const middleCount = piles.middle.length;

    const totalInPiles = headCount + middleCount + tailCount;

    if (headCount === pileLimits.head &&
        tailCount === pileLimits.tail &&
        middleCount === pileLimits.middle &&
        totalInPiles === fullHandData.length) {

        if (gameState !== 'ARRANGEMENT_COMPLETE') {
            gameState = 'ARRANGEMENT_COMPLETE';
            setMiddlePileRole(false);
            renderPile('middle'); // Re-render middle to remove selectable/source specific styles
            showGameMessage("牌型初步完成！中墩已确认。请检查或提交。");
            configureButton('submitArrangementBtn', { show: true, enable: true });
        }
    } else {
        if (gameState === 'ARRANGEMENT_COMPLETE') {
            gameState = 'ARRANGING_FROM_MIDDLE';
            setMiddlePileRole(true);
            renderPile('middle'); // Re-render middle as hand source
        }
        configureButton('submitArrangementBtn', { show: false });
    }
    return gameState === 'ARRANGEMENT_COMPLETE';
}

export function resetArrangement() {
    if (fullHandData.length === 0) {
        showGameMessage("请先发牌。");
        return;
    }
    fullHandData.forEach(card => {
        card.currentPile = 'middle';
        card.selected = false;
    });
    piles = { head: [], middle: [...fullHandData], tail: [] };
    gameState = 'ARRANGING_FROM_MIDDLE';

    setMiddlePileRole(true);
    renderAllPiles();
    updateAllPileCounts();
    checkAndHandleGameStateTransition();
    showGameMessage("理牌已重置。");
}

export function getArrangedPilesData() {
    if (gameState !== 'ARRANGEMENT_COMPLETE') {
        showGameMessage("牌型未完成或不符合提交条件！");
        return null;
    }
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
    fullHandData = [];
    piles = { head: [], middle: [], tail: [] };
    gameState = 'INITIAL';

    setMiddlePileRole(true);
    middlePileTitleDOM.textContent = '手牌区';
    pileCardContainers.middle.innerHTML = ''; // Clear cards directly
    pileCountDisplays.middle.textContent = `0/0`;


    renderAllPiles(); // Will clear other piles
    updateAllPileCounts();
    configureButton('submitArrangementBtn', { show: false });
    configureButton('resetArrangementBtn', { show: false });
}
