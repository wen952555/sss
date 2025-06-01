// frontend/js/main.js
console.log("[Main.js] Loaded");

// (依赖 card_defs.js, ui.js, game_logic.js)

// --- 全局状态 ---
let humanPlayerHand = []; // Array of Card Objects
let aiPlayersHands = [[], [], []]; // Array of 3 AI hands
let humanPlayerArrangement = { head: [], middle: [], tail: [] }; // Card Objects in duns
let aiPlayerArrangements = [null, null, null]; // Stores AI's {head, middle, tail, evals, isDaoshui}

let currentDraggedCardData = null; // Data of the card being dragged
let currentDragSourceArea = null;  // 'hand', 'head', 'middle', or 'tail'

// --- DOM Element References (获取一次) ---
let myHandDisplayEl, headDunEl, middleDunEl, tailDunEl;
let headDunTypeEl, middleDunTypeEl, tailDunTypeEl;
let submitArrangementBtn, newGameBtn;
let arrangementErrorEl, gameResultAreaEl, resultDetailsEl;
let aiPlayerInfoEls = [];

function cacheDOMElements() {
    myHandDisplayEl = getElementByIdSafe('myHandDisplay');
    headDunEl = getElementByIdSafe('headDun');
    middleDunEl = getElementByIdSafe('middleDun');
    tailDunEl = getElementByIdSafe('tailDun');

    headDunTypeEl = getElementByIdSafe('headDunType');
    middleDunTypeEl = getElementByIdSafe('middleDunType');
    tailDunTypeEl = getElementByIdSafe('tailDunType');

    submitArrangementBtn = getElementByIdSafe('submitArrangementButton');
    newGameBtn = getElementByIdSafe('newGameButton');

    arrangementErrorEl = getElementByIdSafe('arrangementError');
    gameResultAreaEl = getElementByIdSafe('gameResultArea');
    resultDetailsEl = getElementByIdSafe('resultDetails');

    for (let i = 0; i < 3; i++) {
        aiPlayerInfoEls[i] = getElementByIdSafe(`aiPlayer${i}Info`);
    }
    console.log("[Main.js] DOM elements cached.");
}


// --- 游戏初始化和流程 ---
function startNewGame() {
    console.log("[Main.js] Starting new game...");
    if (!myHandDisplayEl) { // 确保DOM已缓存
        console.error("[Main.js] Cannot start game, DOM elements not cached yet.");
        return;
    }

    // 1. 清理UI
    humanPlayerHand = [];
    aiPlayersHands = [[], [], []];
    humanPlayerArrangement = { head: [], middle: [], tail: [] };
    aiPlayerArrangements = [null, null, null];

    clearElementContent('myHandDisplay');
    clearElementContent('headDun');
    clearElementContent('middleDun');
    clearElementContent('tailDun');
    updateDunTypeHTML('head', null);
    updateDunTypeHTML('middle', null);
    updateDunTypeHTML('tail', null);
    if (arrangementErrorEl) displayMessage('arrangementError', '');
    if (gameResultAreaEl) gameResultAreaEl.style.display = 'none';
    if (submitArrangementBtn) submitArrangementBtn.disabled = false;

    // 2. 创建牌堆并发牌
    const deck = getShuffledDeck(); // from game_logic.js
    const allHands = dealCardsToPlayers(deck, 4); // 0 for human, 1-3 for AIs

    if (allHands.length < 4 || allHands[0].length < 13) {
        displayMessage('arrangementError', '发牌失败，牌数不足！', true);
        console.error("[Main.js] Dealing cards failed.");
        return;
    }
    humanPlayerHand = allHands[0];
    aiPlayersHands[0] = allHands[1];
    aiPlayersHands[1] = allHands[2];
    aiPlayersHands[2] = allHands[3];

    console.log("[Main.js] Human hand dealt:", humanPlayerHand.map(c => c.id));
    renderCards('myHandDisplay', humanPlayerHand); // ui.js

    // 3. AI 自动摆牌
    aiPlayersHands.forEach((hand, index) => {
        const arrangement = getSimpleAIArrangement(hand); // game_logic.js
        if (arrangement) {
            const headEval = evaluatePokerHand(arrangement.head);
            const middleEval = evaluatePokerHand(arrangement.middle);
            const tailEval = evaluatePokerHand(arrangement.tail);
            const isDaoshui = checkDaoshui(arrangement.head, arrangement.middle, arrangement.tail);

            aiPlayerArrangements[index] = {
                ...arrangement, // head, middle, tail cards
                headEval, middleEval, tailEval, isDaoshui
            };
            updateAIStatusHTML(index, isDaoshui ? "已摆牌(倒水)" : "已摆牌");
        } else {
            updateAIStatusHTML(index, "摆牌错误");
        }
    });
    console.log("[Main.js] AI arrangements completed.");
}

// --- 拖拽逻辑 ---
function setupDragDrop() {
    const droppableAreas = document.querySelectorAll('.droppable-area');

    document.addEventListener('dragstart', (event) => {
        if (event.target.classList.contains('card')) {
            currentDraggedCardData = findCardByIdInPlay(event.target.dataset.cardId);
            currentDragSourceArea = event.target.parentElement.dataset.dunName;
            if (currentDraggedCardData) {
                event.dataTransfer.setData('text/plain', currentDraggedCardData.id);
                event.dataTransfer.effectAllowed = 'move';
                setTimeout(() => event.target.classList.add('dragging'), 0);
            } else {
                console.warn("[Main.js] DragStart: Could not find card data for ID:", event.target.dataset.cardId);
                event.preventDefault();
            }
        }
    });

    document.addEventListener('dragend', (event) => {
        if (event.target.classList.contains('card')) {
            event.target.classList.remove('dragging');
        }
        currentDraggedCardData = null;
        currentDragSourceArea = null;
        droppableAreas.forEach(area => area.classList.remove('drag-over'));
    });

    droppableAreas.forEach(area => {
        area.addEventListener('dragover', (event) => {
            event.preventDefault();
            const targetDunName = area.dataset.dunName;
            const maxCards = parseInt(area.dataset.maxCards) || (targetDunName === 'hand' ? 13 : 0);
            const currentCardsInTarget = (targetDunName === 'hand') ?
                humanPlayerHand.length :
                (humanPlayerArrangement[targetDunName] ? humanPlayerArrangement[targetDunName].length : 0);

            if (currentDraggedCardData && currentCardsInTarget < maxCards) {
                event.dataTransfer.dropEffect = 'move';
                area.classList.add('drag-over');
            } else {
                event.dataTransfer.dropEffect = 'none';
            }
        });
        area.addEventListener('dragenter', (event) => { event.preventDefault(); area.classList.add('drag-over');});
        area.addEventListener('dragleave', (event) => { area.classList.remove('drag-over'); });
        area.addEventListener('drop', (event) => {
            event.preventDefault();
            area.classList.remove('drag-over');
            const targetDunName = area.dataset.dunName;
            const cardId = event.dataTransfer.getData('text/plain');
            const droppedCard = findCardByIdInPlay(cardId); // Re-find to be sure

            if (droppedCard && currentDragSourceArea && currentDragSourceArea !== targetDunName) {
                moveCardBetweenAreas(droppedCard, currentDragSourceArea, targetDunName);
            }
        });
    });
    console.log("[Main.js] Drag and drop listeners set up.");
}

function findCardByIdInPlay(cardId) {
    let card = humanPlayerHand.find(c => c.id === cardId);
    if (card) return card;
    for (const dunKey in humanPlayerArrangement) {
        card = humanPlayerArrangement[dunKey].find(c => c.id === cardId);
        if (card) return card;
    }
    return null;
}

function moveCardBetweenAreas(card, fromArea, toArea) {
    // 1. Remove from source
    if (fromArea === 'hand') {
        humanPlayerHand = humanPlayerHand.filter(c => c.id !== card.id);
    } else if (humanPlayerArrangement[fromArea]) {
        humanPlayerArrangement[fromArea] = humanPlayerArrangement[fromArea].filter(c => c.id !== card.id);
    }

    // 2. Add to destination
    const maxCardsInToArea = parseInt(getElementByIdSafe(`${toArea}Dun`)?.dataset.maxCards || (toArea === 'hand' ? 13 : 0));
    if (toArea === 'hand') {
        if (humanPlayerHand.length < 13) humanPlayerHand.push(card); // Should always be space if coming from dun
    } else if (humanPlayerArrangement[toArea] && humanPlayerArrangement[toArea].length < maxCardsInToArea) {
        humanPlayerArrangement[toArea].push(card);
    } else { // Target dun is full, return to hand (should ideally be prevented by dragover)
        console.warn(`[Main.js] Target area ${toArea} is full. Returning card ${card.id} to hand.`);
        if (humanPlayerHand.length < 13) humanPlayerHand.push(card);
    }

    // 3. Re-render all player areas
    renderCards('myHandDisplay', humanPlayerHand);
    renderCards('headDun', humanPlayerArrangement.head);
    renderCards('middleDun', humanPlayerArrangement.middle);
    renderCards('tailDun', humanPlayerArrangement.tail);

    // 4. Update dun type displays
    updateDunTypeHTML('head', humanPlayerArrangement.head.length === 3 ? evaluatePokerHand(humanPlayerArrangement.head).name : null);
    updateDunTypeHTML('middle', humanPlayerArrangement.middle.length === 5 ? evaluatePokerHand(humanPlayerArrangement.middle).name : null);
    updateDunTypeHTML('tail', humanPlayerArrangement.tail.length === 5 ? evaluatePokerHand(humanPlayerArrangement.tail).name : null);
    // console.log("[Main.js] Card moved and UI updated:", humanPlayerArrangement);
}

// --- 提交和结算 ---
function handleSubmitArrangement() {
    console.log("[Main.js] handleSubmitArrangement called.");
    const totalArranged = humanPlayerArrangement.head.length + humanPlayerArrangement.middle.length + humanPlayerArrangement.tail.length;
    if (humanPlayerHand.length !== 0 || totalArranged !== 13 ||
        humanPlayerArrangement.head.length !== 3 ||
        humanPlayerArrangement.middle.length !== 5 ||
        humanPlayerArrangement.tail.length !== 5) {
        displayMessage('arrangementError', '请将所有13张手牌正确摆放到三墩 (3-5-5)。', true);
        return;
    }
    displayMessage('arrangementError', ''); // Clear error
    if (submitArrangementBtn) submitArrangementBtn.disabled = true;

    // Evaluate player's duns
    const playerSubmittedArrangement = {
        head: humanPlayerArrangement.head,
        middle: humanPlayerArrangement.middle,
        tail: humanPlayerArrangement.tail,
        headEval: evaluatePokerHand(humanPlayerArrangement.head),
        middleEval: evaluatePokerHand(humanPlayerArrangement.middle),
        tailEval: evaluatePokerHand(humanPlayerArrangement.tail),
    };
    playerSubmittedArrangement.isDaoshui = checkDaoshui(playerSubmittedArrangement.head, playerSubmittedArrangement.middle, playerSubmittedArrangement.tail);


    let fullResultsText = `<b>你的牌局:</b>\n`;
    fullResultsText += `头墩: ${playerSubmittedArrangement.head.map(c=>c.displayRank+c.displaySuit).join(' ')} (${playerSubmittedArrangement.headEval.name})\n`;
    fullResultsText += `中墩: ${playerSubmittedArrangement.middle.map(c=>c.displayRank+c.displaySuit).join(' ')} (${playerSubmittedArrangement.middleEval.name})\n`;
    fullResultsText += `尾墩: ${playerSubmittedArrangement.tail.map(c=>c.displayRank+c.displaySuit).join(' ')} (${playerSubmittedArrangement.tailEval.name})\n`;
    if (playerSubmittedArrangement.isDaoshui) {
        fullResultsText += "<strong style='color:red;'>你倒水了!</strong>\n\n";
    } else {
        fullResultsText += "摆牌有效。\n\n";
    }

    // Compare with each AI
    let totalPlayerScoreChange = 0;
    aiPlayerArrangements.forEach((aiArr, index) => {
        if (aiArr) {
            fullResultsText += `<b>--- 对战 AI ${index + 1} ---</b>\n`;
            fullResultsText += `AI头墩: ${aiArr.head.map(c=>c.displayRank+c.displaySuit).join(' ')} (${aiArr.headEval.name})\n`;
            fullResultsText += `AI中墩: ${aiArr.middle.map(c=>c.displayRank+c.displaySuit).join(' ')} (${aiArr.middleEval.name})\n`;
            fullResultsText += `AI尾墩: ${aiArr.tail.map(c=>c.displayRank+c.displaySuit).join(' ')} (${aiArr.tailEval.name})\n`;
            if (aiArr.isDaoshui) fullResultsText += "<span style='color:orange;'>AI倒水!</span>\n";

            const comparison = calculateScoreAgainstAI(playerSubmittedArrangement, aiArr);
            totalPlayerScoreChange += comparison.playerScoreChange;
            fullResultsText += comparison.details.join("\n") + "\n";
            fullResultsText += `<i>你从 AI ${index + 1} 赢得/输掉: ${comparison.playerScoreChange > 0 ? '+' : ''}${comparison.playerScoreChange} 道</i>\n\n`;
        }
    });

    fullResultsText += `<b>本局总道数变化: ${totalPlayerScoreChange > 0 ? '+' : ''}${totalPlayerScoreChange}</b>`;

    // Display results (ui.js)
    if (resultDetailsEl) resultDetailsEl.innerHTML = fullResultsText.replace(/\n/g, '<br>');
    if (gameResultAreaEl) gameResultAreaEl.style.display = 'block';

    console.log("[Main.js] Game submitted and results displayed.");
}


// --- 初始化 ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("[Main.js] DOMContentLoaded. Initializing...");
    cacheDOMElements(); // 获取所有需要的DOM元素

    if (submitArrangementBtn) {
        submitArrangementBtn.addEventListener('click', handleSubmitArrangement);
    } else { console.warn("[Main.js] Submit button not found."); }

    if (newGameBtn) {
        newGameBtn.addEventListener('click', startNewGame);
    } else { console.warn("[Main.js] New Game button not found."); }

    setupDragDrop();
    startNewGame(); // 页面加载后自动开始第一局
});
