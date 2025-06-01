// frontend/js/arrange.js
import { showGameMessage, configureButton } from './ui.js';
import { createCardImageElement } from './card.js';

let fullHandData = []; // 存储13张牌的完整数据 {rank, suit, id, element, selected, currentPile}
let piles = {
    head: [],
    middle: [], // 初始时这里是手牌源
    tail: []
};
const pileLimits = { head: 3, middle: 5, tail: 5 };
let gameState = 'INITIAL'; // 'INITIAL', 'ARRANGING_FROM_MIDDLE', 'ARRANGEMENT_COMPLETE'

// DOM Elements
const middlePileAreaDOM = document.getElementById('middlePileArea');
const middlePileTitleDOM = document.getElementById('middlePileTitle');
const pileCardContainers = { // Renamed from pileElements for clarity
    head: document.getElementById('headPileCards'),
    middle: document.getElementById('middlePileCards'),
    tail: document.getElementById('tailPileCards')
};
const pileCountDisplays = { // Renamed from pileCountElements
    head: document.getElementById('headPileCount'),
    middle: document.getElementById('middlePileCount'),
    tail: document.getElementById('tailPileCount')
};

export function initializeArrangement(handCards) {
    fullHandData = handCards.map((card, index) => ({
        ...card,
        id: `card-${index}-${Date.now()}`,
        element: null,
        selected: false,
        currentPile: 'middle' // 所有牌初始都在中墩 (作为手牌区)
    }));

    piles = { head: [], middle: [...fullHandData], tail: [] };
    gameState = 'ARRANGING_FROM_MIDDLE';

    setMiddlePileRole(true); // 设置中墩为手牌源的样式和行为
    renderAllPiles();
    updateAllPileCounts();
    checkAndHandleGameStateTransition();
    showGameMessage("请从下方“手牌区”选择牌，再点击头墩或尾墩放置。");
}

function setMiddlePileRole(isHandSource) {
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
}

function renderPile(pileName) {
    const container = pileCardContainers[pileName];
    container.innerHTML = '';
    piles[pileName].forEach(cardData => {
        const cardElement = createCardImageElement(cardData);
        cardData.element = cardElement;
        cardElement.dataset.cardId = cardData.id;

        if (pileName === 'middle' && gameState === 'ARRANGING_FROM_MIDDLE') {
            cardElement.classList.add('selectable-card');
            if (cardData.selected) {
                cardElement.classList.add('selected');
            }
            cardElement.addEventListener('click', (e) => {
                e.stopPropagation();
                handleCardSelectionInSource(cardData.id);
            });
        } else { // 头墩、尾墩，或已完成排列的中墩
            cardElement.classList.add('pile-card');
            if (gameState !== 'ARRANGEMENT_COMPLETE' || pileName !== 'middle') { // 完成的中墩不能移除
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
        }
        container.appendChild(cardElement);
    });
}

function renderAllPiles() {
    for (const pileName in piles) {
        renderPile(pileName);
    }
}

function updatePileCount(pileName) {
    let currentCount = piles[pileName].length;
    let limit;
    if (pileName === 'middle' && gameState === 'ARRANGING_FROM_MIDDLE') {
        limit = fullHandData.length; // Total cards as limit for hand source
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
    piles.middle.push(cardData); // Add back to the "hand source"

    if (gameState === 'ARRANGEMENT_COMPLETE') { // If was complete, revert state
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
    const middleCount = piles.middle.length; // This is now the actual middle pile count

    // Transition condition: head=3, tail=5, AND all 13 cards are in these three piles
    // which means middle pile must have the remaining 13 - 3 - 5 = 5 cards.
    const totalInPiles = headCount + middleCount + tailCount;

    if (headCount === pileLimits.head &&
        tailCount === pileLimits.tail &&
        middleCount === pileLimits.middle && // Ensure middle also has 5
        totalInPiles === fullHandData.length) { // All 13 cards accounted for

        if (gameState !== 'ARRANGEMENT_COMPLETE') {
            gameState = 'ARRANGEMENT_COMPLETE';
            setMiddlePileRole(false); // Middle pile is now a formal pile
            renderPile('middle'); // Re-render middle pile without selectable cards/remove buttons
            showGameMessage("牌型初步完成！中墩已确认。请检查或提交。");
            configureButton('submitArrangementBtn', { show: true, enable: true });
        }
    } else {
        if (gameState === 'ARRANGEMENT_COMPLETE') { // Reverting from complete state
            gameState = 'ARRANGING_FROM_MIDDLE';
            setMiddlePileRole(true);
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
    // Middle pile is not a target when it's a hand source.
}

export function clearBoardForNewGame() {
    fullHandData = [];
    piles = { head: [], middle: [], tail: [] };
    gameState = 'INITIAL';

    setMiddlePileRole(true); // Default to hand source appearance
    middlePileTitleDOM.textContent = '手牌区';
    pileCountDisplays.middle.textContent = `0/0`; // Or hide it

    renderAllPiles();
    updateAllPileCounts();
    configureButton('submitArrangementBtn', { show: false });
    configureButton('resetArrangementBtn', { show: false });
}
