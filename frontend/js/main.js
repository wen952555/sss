// frontend/js/main.js (适配新布局)
console.log("[Main.js] Loaded - New Layout Version");

// (依赖 card_defs.js, ui.js, game_logic.js)

// --- 全局状态 ---
let humanPlayerHand = []; // 存放所有未放入头墩或尾墩的牌
let playerArrangement = {
    head: [],
    middle: [], // 这个数组将在条件满足时由 humanPlayerHand 的内容填充
    tail: []
};
let aiPlayersHands = [[], [], []];
let aiPlayerArrangements = [null, null, null];

let currentDraggedCardData = null;
let currentDragSourceArea = null; // 'handOrMiddle', 'head', 'tail'

// --- DOM Element References ---
let myHandDisplayEl, headDunEl, tailDunEl, centralAreaTitleEl; // 没有 middleDunEl 了
let headDunTypeEl, tailDunTypeEl; // 没有 middleDunTypeEl，中墩牌型显示在 centralAreaTitleEl
let submitArrangementBtn, newGameBtn;
let arrangementErrorEl, gameResultAreaEl, resultDetailsEl;
let aiPlayerInfoEls = [];

function cacheDOMElements() {
    myHandDisplayEl = getElementByIdSafe('myHandDisplay');
    headDunEl = getElementByIdSafe('headDun');
    // middleDunEl = null; // 不再需要
    tailDunEl = getElementByIdSafe('tailDun');
    centralAreaTitleEl = getElementByIdSafe('centralAreaTitle');

    headDunTypeEl = getElementByIdSafe('headDunType');
    // middleDunTypeEl = null;
    tailDunTypeEl = getElementByIdSafe('tailDunType');

    submitArrangementBtn = getElementByIdSafe('submitArrangementButton');
    newGameBtn = getElementByIdSafe('newGameButton');
    arrangementErrorEl = getElementByIdSafe('arrangementError');
    gameResultAreaEl = getElementByIdSafe('gameResultArea');
    resultDetailsEl = getElementByIdSafe('resultDetails');
    for (let i = 0; i < 3; i++) aiPlayerInfoEls[i] = getElementByIdSafe(`aiPlayer${i}Info`);
    console.log("[Main.js] DOM elements cached for new layout.");
}


// --- 游戏初始化和流程 ---
function startNewGame() {
    console.log("[Main.js] Starting new game (new layout)...");
    if (!myHandDisplayEl) { cacheDOMElements(); } // 确保已缓存

    // 1. 清理UI和状态
    humanPlayerHand = [];
    playerArrangement = { head: [], middle: [], tail: [] };
    aiPlayerArrangements = [null, null, null];
    // ... (调用 clearElementContent, updateDunTypeHTML, displayMessage, hideGameResults)
    clearElementContent('myHandDisplay');
    clearElementContent('headDun');
    clearElementContent('tailDun');
    updateDunTypeHTML('head', 'DunType', null); // ui.js 函数签名改了
    updateDunTypeHTML('tail', 'DunType', null);
    if (centralAreaTitleEl) {
        centralAreaTitleEl.innerHTML = '你的手牌 (拖拽摆牌):';
        centralAreaTitleEl.dataset.isMiddleDun = 'false';
        if (myHandDisplayEl) myHandDisplayEl.classList.remove('is-middle-dun-target'); // 移除特殊样式
    }
    if (arrangementErrorEl) displayMessage('arrangementError', '');
    if (gameResultAreaEl) gameResultAreaEl.style.display = 'none';
    if (submitArrangementBtn) submitArrangementBtn.disabled = false; // 初始允许提交（但会被逻辑阻止）

    // 2. 发牌
    const deck = getShuffledDeck();
    const allHands = dealCardsToPlayers(deck, 4);
    if (allHands.length < 4 || allHands[0].length < 13) { /* ...错误处理... */ return; }
    humanPlayerHand = allHands[0]; // 所有13张牌初始都在这里
    aiPlayersHands = allHands.slice(1);

    console.log("[Main.js] Human hand dealt (all 13 cards):", humanPlayerHand.map(c=>c.id));
    renderCards('myHandDisplay', humanPlayerHand); // 渲染所有牌到手牌区

    // 3. AI 摆牌 (与之前逻辑类似)
    aiPlayersHands.forEach((hand, index) => { /* ... (调用 getSimpleAIArrangement, updateAIStatusHTML) ... */});
    console.log("[Main.js] New layout game initialized.");
}


// --- 拖拽逻辑 (需要调整 data-dun-name 和目标判断) ---
function setupDragDrop() {
    const droppableAreas = document.querySelectorAll('.droppable-area'); // myHandDisplay, headDun, tailDun

    document.addEventListener('dragstart', (event) => {
        if (event.target.classList.contains('card')) {
            currentDraggedCardData = findCardByIdInPlay(event.target.dataset.cardId);
            currentDragSourceArea = event.target.parentElement.dataset.dunName; // 'handOrMiddle', 'head', 'tail'
            if (currentDraggedCardData) { /* ... (设置 dataTransfer) ... */ }
            else { event.preventDefault(); }
        }
    });
    document.addEventListener('dragend', (event) => { /* ... (清理状态) ... */ });

    droppableAreas.forEach(area => {
        area.addEventListener('dragover', (event) => {
            event.preventDefault();
            const targetDunName = area.dataset.dunName; // 'handOrMiddle', 'head', 'tail'
            let maxCards = 0;
            let currentCardsInTarget = 0;

            if (targetDunName === 'head') {
                maxCards = 3;
                currentCardsInTarget = playerArrangement.head.length;
            } else if (targetDunName === 'tail') {
                maxCards = 5;
                currentCardsInTarget = playerArrangement.tail.length;
            } else { // 'handOrMiddle'
                // 如果头尾墩已满，手牌区逻辑上是中墩，最大5张
                if (playerArrangement.head.length === 3 && playerArrangement.tail.length === 5) {
                    maxCards = 5;
                } else {
                    maxCards = 13; // 否则是手牌区，可以容纳所有未摆放的牌
                }
                currentCardsInTarget = humanPlayerHand.length;
            }

            if (currentDraggedCardData && currentCardsInTarget < maxCards) {
                event.dataTransfer.dropEffect = 'move';
                area.classList.add('drag-over');
            } else {
                event.dataTransfer.dropEffect = 'none';
            }
        });
        area.addEventListener('dragenter', (event) => { /* ... */ });
        area.addEventListener('dragleave', (event) => { /* ... */ });
        area.addEventListener('drop', (event) => {
            event.preventDefault();
            area.classList.remove('drag-over');
            const targetDunName = area.dataset.dunName;
            const cardId = event.dataTransfer.getData('text/plain');
            const droppedCard = findCardByIdInPlay(cardId);

            if (droppedCard && currentDragSourceArea && currentDragSourceArea !== targetDunName) {
                moveCardBetweenAreas(droppedCard, currentDragSourceArea, targetDunName);
            }
        });
    });
    console.log("[Main.js] Drag and drop listeners set up for new layout.");
}

function findCardByIdInPlay(cardId) { // 现在只在 humanPlayerHand, head, tail 中找
    let card = humanPlayerHand.find(c => c.id === cardId);
    if (card) return card;
    card = playerArrangement.head.find(c => c.id === cardId);
    if (card) return card;
    card = playerArrangement.tail.find(c => c.id === cardId);
    if (card) return card;
    return null;
}

function moveCardBetweenAreas(card, fromArea, toArea) {
    console.log(`[Main.js] Moving card ${card.id} from ${fromArea} to ${toArea}`);
    // 1. 从源移除
    if (fromArea === 'head') playerArrangement.head = playerArrangement.head.filter(c => c.id !== card.id);
    else if (fromArea === 'tail') playerArrangement.tail = playerArrangement.tail.filter(c => c.id !== card.id);
    else if (fromArea === 'handOrMiddle') humanPlayerHand = humanPlayerHand.filter(c => c.id !== card.id);

    // 2. 添加到目标
    if (toArea === 'head' && playerArrangement.head.length < 3) playerArrangement.head.push(card);
    else if (toArea === 'tail' && playerArrangement.tail.length < 5) playerArrangement.tail.push(card);
    else if (toArea === 'handOrMiddle' && humanPlayerHand.length < 13) humanPlayerHand.push(card); // 实际最大牌数是13减去已在头尾的
    else { // 目标满了或无效，放回手牌区 (humanPlayerHand)
        console.warn(`[Main.js] Target area ${toArea} full or invalid for card ${card.id}. Returning to hand.`);
        // 确保它不在任何墩里，只在 humanPlayerHand
        if (humanPlayerHand.findIndex(c => c.id === card.id) === -1) { // 避免重复添加
             if (humanPlayerHand.length < 13) humanPlayerHand.push(card);
        }
    }

    // 3. 检查手牌区是否变成中墩
    checkAndTransitionToMiddleDun();

    // 4. 重新渲染
    renderAllAreas();
    console.log("[Main.js] Card moved. Head:", playerArrangement.head.length, "Tail:", playerArrangement.tail.length, "Hand/Middle:", humanPlayerHand.length);
}

function checkAndTransitionToMiddleDun() {
    const headFull = playerArrangement.head.length === 3;
    const tailFull = playerArrangement.tail.length === 5;

    if (headFull && tailFull) {
        // 条件满足，手牌区现在是中墩
        if (centralAreaTitleEl) {
            centralAreaTitleEl.dataset.isMiddleDun = 'true'; // 标记状态
            // 牌型显示由 renderAllAreas -> updateUIDunTypes 处理
        }
        if (myHandDisplayEl) myHandDisplayEl.classList.add('is-middle-dun-target'); // 添加CSS类改变外观
        // 此时 humanPlayerHand 中的牌就是中墩的牌
        playerArrangement.middle = [...humanPlayerHand]; // 将手牌区的内容视为中墩
        if (playerArrangement.middle.length > 5) {
            // 这不应该发生，如果发生了，说明拖拽逻辑或牌数限制有问题
            console.error("[Main.js] Middle dun (from hand) has more than 5 cards!", playerArrangement.middle);
            // 可以采取纠正措施，例如只取前5张，其余放回一个虚拟“未分配区”或给出错误
            playerArrangement.middle = playerArrangement.middle.slice(0,5);
            // humanPlayerHand 需要更新为多余的牌，但这会使逻辑复杂化。
            // 最好是在拖拽到 myHandDisplay 时，如果它已是中墩，则限制不超过5张。
            // 当前的 dragover 逻辑需要调整以适应 handOrMiddle 的双重角色。
        }

    } else {
        // 条件不满足，手牌区仍然是手牌区
        if (centralAreaTitleEl) {
            centralAreaTitleEl.dataset.isMiddleDun = 'false';
            centralAreaTitleEl.innerHTML = `你的手牌 (${humanPlayerHand.length}张) (拖拽摆牌):`;
        }
        if (myHandDisplayEl) myHandDisplayEl.classList.remove('is-middle-dun-target');
        playerArrangement.middle = []; // 中墩清空
    }
}


function renderAllAreas() {
    renderCards('myHandDisplay', humanPlayerHand);
    renderCards('headDun', playerArrangement.head);
    renderCards('tailDun', playerArrangement.tail);
    updateUIDunTypes();
}

function updateUIDunTypes() {
    updateDunTypeHTML('head', 'DunType', playerArrangement.head.length === 3 ? evaluatePokerHand(playerArrangement.head) : null);
    updateDunTypeHTML('tail', 'DunType', playerArrangement.tail.length === 5 ? evaluatePokerHand(playerArrangement.tail) : null);

    // 中墩牌型显示
    if (centralAreaTitleEl && centralAreaTitleEl.dataset.isMiddleDun === 'true') {
        const middleDunCards = humanPlayerHand; // 此时 humanPlayerHand 代表中墩
        updateDunTypeHTML('middle', 'DunType', middleDunCards.length === 5 ? evaluatePokerHand(middleDunCards) : null);
        // 同时更新标题文本
        centralAreaTitleEl.innerHTML = `中墩 (${middleDunCards.length}/5张) <span class="dun-type" id="middleActualDunType">${(middleDunCards.length === 5 && evaluatePokerHand(middleDunCards)) ? '('+evaluatePokerHand(middleDunCards).name+')' : '(-)'}</span>`;

    } else if (centralAreaTitleEl) {
        centralAreaTitleEl.innerHTML = `你的手牌 (${humanPlayerHand.length}张) (拖拽摆牌):`;
    }
}


// --- 提交和结算 (需要大改以适应新的中墩逻辑) ---
function handleSubmitArrangement() {
    console.log("[Main.js] handleSubmitArrangement called (new layout).");
    checkAndTransitionToMiddleDun(); // 确保中墩状态正确

    const headCards = playerArrangement.head;
    const middleCards = playerArrangement.middle; // 现在从这里取中墩
    const tailCards = playerArrangement.tail;

    if (headCards.length !== 3 || middleCards.length !== 5 || tailCards.length !== 5) {
        displayMessage('arrangementError', '请将13张牌完整摆放到头(3)、中(5)、尾(5)墩。', true);
        return;
    }
    displayMessage('arrangementError', '');
    if (submitArrangementBtn) submitArrangementBtn.disabled = true;

    const playerSubmittedArrangement = {
        head: headCards, middle: middleCards, tail: tailCards,
        headEval: evaluatePokerHand(headCards),
        middleEval: evaluatePokerHand(middleCards),
        tailEval: evaluatePokerHand(tailCards),
    };
    playerSubmittedArrangement.isDaoshui = checkDaoshui(headCards, middleCards, tailCards); // game_logic.js

    // ... (后续与AI比较和显示结果的逻辑，与之前版本类似，但要确保使用的是正确的墩牌) ...
    // 例如: const comparison = calculateScoreAgainstAI(playerSubmittedArrangement, aiArr);
    let fullResultsText = `...`; // 构建结果文本
    // ... (与之前 handleSubmitArrangement 中的结果构建和显示逻辑类似) ...
    if (resultDetailsEl) resultDetailsEl.innerHTML = fullResultsText.replace(/\n/g, '<br>');
    if (gameResultAreaEl) gameResultAreaEl.style.display = 'block';
}


// --- 初始化 ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("[Main.js] DOMContentLoaded. Initializing new layout...");
    cacheDOMElements();
    if (submitArrangementBtn) submitArrangementBtn.addEventListener('click', handleSubmitArrangement);
    if (newGameBtn) newGameBtn.addEventListener('click', startNewGame);
    setupDragDrop();
    startNewGame();
});
