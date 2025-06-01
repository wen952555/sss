// frontend/js/main.js
console.log("[Main.js] Loaded - New Layout Version (Final Check)");

// (依赖 card_defs.js, ui.js, game_logic.js)

let humanPlayerHand = [];
let playerArrangement = { head: [], middle: [], tail: [] };
let aiPlayersHands = [[], [], []];
let aiPlayerArrangements = [null, null, null];
let currentDraggedCardData = null;
let currentDragSourceArea = null;

let myHandDisplayEl, headDunEl, tailDunEl, centralAreaTitleEl;
let headDunTypeEl, tailDunTypeEl;
let submitArrangementBtn, newGameBtn;
let arrangementErrorEl, gameResultAreaEl, resultDetailsEl;
let aiPlayerInfoEls = [];

let startGameCallCount = 0;

function cacheDOMElements() {
    console.log("[Main.js] cacheDOMElements START");
    myHandDisplayEl = getElementByIdSafe('myHandDisplay');       // from ui.js
    headDunEl = getElementByIdSafe('headDun');
    tailDunEl = getElementByIdSafe('tailDun');
    centralAreaTitleEl = getElementByIdSafe('centralAreaTitle');
    headDunTypeEl = getElementByIdSafe('headDunType');
    tailDunTypeEl = getElementByIdSafe('tailDunType');
    submitArrangementBtn = getElementByIdSafe('submitArrangementButton');
    newGameBtn = getElementByIdSafe('newGameButton');
    arrangementErrorEl = getElementByIdSafe('arrangementError');
    gameResultAreaEl = getElementByIdSafe('gameResultArea');
    resultDetailsEl = getElementByIdSafe('resultDetails');
    aiPlayerInfoEls = [];
    for (let i = 0; i < 3; i++) {
        aiPlayerInfoEls[i] = getElementByIdSafe(`aiPlayer${i}Info`);
    }
    console.log("[Main.js] cacheDOMElements END. newGameBtn found:", !!newGameBtn);
}

function startNewGame(triggeredBy = "Unknown") {
    startGameCallCount++;
    console.log(`[Main.js] startNewGame CALLED (Count: ${startGameCallCount}, Trigger: ${triggeredBy}).`);

    if (!myHandDisplayEl) { // 确保DOM元素已获取
        console.warn("[Main.js] DOM elements not cached in startNewGame, attempting re-cache.");
        cacheDOMElements();
        if (!myHandDisplayEl) {
            console.error("[Main.js] CRITICAL - DOM elements still not cached. Aborting game.");
            if (arrangementErrorEl) displayMessage(arrangementErrorEl, '页面元素加载错误，请刷新', true);
            return;
        }
    }

    // 1. 清理UI和状态
    humanPlayerHand = [];
    playerArrangement = { head: [], middle: [], tail: [] }; // 重置摆牌
    aiPlayersHands = [[], [], []];
    aiPlayerArrangements = [null, null, null];

    clearElementContent('myHandDisplay');
    clearElementContent('headDun');
    clearElementContent('tailDun');
    if (typeof updateDunTypeHTML === 'function') { // 确保函数存在
        updateDunTypeHTML('head', 'DunType', null);
        updateDunTypeHTML('tail', 'DunType', null);
    }
    if (centralAreaTitleEl) {
        centralAreaTitleEl.innerHTML = '你的手牌 (拖拽摆牌):';
        centralAreaTitleEl.dataset.isMiddleDun = 'false';
        if (myHandDisplayEl) myHandDisplayEl.classList.remove('is-middle-dun-target');
    }
    if (arrangementErrorEl) displayMessage('arrangementError', '');
    if (gameResultAreaEl) gameResultAreaEl.style.display = 'none';
    if (submitArrangementBtn) {
        submitArrangementBtn.disabled = false; // 确保提交按钮可用
        submitArrangementBtn.textContent = "提交摆牌";
    }


    // 2. 创建牌堆并发牌
    if (typeof getShuffledDeck !== 'function' || typeof dealCardsToPlayers !== 'function') {
        console.error("[Main.js] getShuffledDeck or dealCardsToPlayers is not defined!");
        if (arrangementErrorEl) displayMessage(arrangementErrorEl, '游戏核心逻辑错误!', true);
        return;
    }
    const deck = getShuffledDeck();
    const allHands = dealCardsToPlayers(deck, 4);

    if (!allHands || allHands.length < 4 || !allHands[0] || allHands[0].length < 13) {
        if(arrangementErrorEl) displayMessage('arrangementError', '发牌失败!', true);
        console.error("[Main.js] Dealing cards failed or insufficient cards.");
        return;
    }
    humanPlayerHand = allHands[0];
    aiPlayersHands[0] = allHands[1];
    aiPlayersHands[1] = allHands[2];
    aiPlayersHands[2] = allHands[3];

    console.log("[Main.js] Human hand dealt:", humanPlayerHand.map(c => c.id));
    if (typeof renderCards === 'function') {
        renderCards('myHandDisplay', humanPlayerHand);
    } else { console.error("[Main.js] renderCards function not defined!"); }


    // 3. AI 自动摆牌
    if (typeof getSimpleAIArrangement !== 'function' || typeof evaluatePokerHand !== 'function' || typeof checkDaoshui !== 'function' || typeof updateAIStatusHTML !== 'function') {
         console.error("[Main.js] AI or hand evaluation/UI update functions missing!");
         return;
    }
    aiPlayersHands.forEach((hand, index) => {
        if (!Array.isArray(hand) || hand.length !== 13) {
            if (aiPlayerInfoEls[index]) updateAIStatusHTML(index, "手牌错误"); return;
        }
        const arrangement = getSimpleAIArrangement(hand); // from game_logic.js
        if (arrangement) {
            const headEval = evaluatePokerHand(arrangement.head);
            const middleEval = evaluatePokerHand(arrangement.middle);
            const tailEval = evaluatePokerHand(arrangement.tail);
            const isDaoshui = checkDaoshui(arrangement.head, arrangement.middle, arrangement.tail);
            aiPlayerArrangements[index] = { ...arrangement, headEval, middleEval, tailEval, isDaoshui };
            if (aiPlayerInfoEls[index]) updateAIStatusHTML(index, isDaoshui ? "已摆(倒水)" : "已摆");
        } else {
            if (aiPlayerInfoEls[index]) updateAIStatusHTML(index, "摆牌错误");
        }
    });
    console.log("[Main.js] New game fully initialized.");
}


// --- 拖拽逻辑 (使用之前能工作的版本) ---
function setupDragDrop() { console.log("[Main.js] setupDragDrop CALLED"); /* ... 你的完整拖拽逻辑 ... */ }
function findCardByIdInPlay(cardId) { /* ... */ return null; }
function moveCardBetweenAreas(card, fromArea, toArea) { /* ... */ }
function checkAndTransitionToMiddleDun() { /* ... */ }
function renderAllAreas() { /* ... */ }
function updateUIDunTypes() { /* ... */ }

// --- 提交和结算 (使用之前能工作的版本) ---
function handleSubmitArrangement() {
    console.log("[Main.js] handleSubmitArrangement CALLED.");
    // ... (你的完整提交和结算逻辑，确保它调用了 game_logic.js 中的 evaluatePokerHand, checkDaoshui, calculateScoreAgainstAI)
    // ... (并使用 ui.js 中的 displayMessage, displayGameResults)
    if (typeof checkAndTransitionToMiddleDun === 'function') checkAndTransitionToMiddleDun(); // 确保中墩状态
    // ... (验证牌数) ...
    if(submitArrangementBtn) submitArrangementBtn.disabled = true;
    // ... (构建 playerSubmittedArrangement) ...
    // ... (与AI比较，构建 fullResultsText) ...
    if (typeof displayGameResults === 'function') displayGameResults("结果占位符，请替换为真实结果");
}


// --- 初始化 ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("[Main.js] DOMContentLoaded. Final Check Version.");
    cacheDOMElements();

    if (submitArrangementBtn) {
        console.log("[Main.js] Binding click to submitArrangementBtn.");
        submitArrangementBtn.addEventListener('click', handleSubmitArrangement);
    } else { console.warn("[Main.js] Submit button NOT FOUND for binding."); }

    if (newGameBtn) {
        console.log("[Main.js] Binding click to newGameBtn.");
        newGameBtn.addEventListener('click', function(event) {
            console.log("[Main.js] newGameButton CLICKED!");
            if (typeof startNewGame === "function") {
                startNewGame("Button Click");
            } else { console.error("[Main.js] startNewGame not defined on button click!"); }
        });
    } else { console.warn("[Main.js] New Game button NOT FOUND for binding."); }

    if (typeof setupDragDrop === "function") setupDragDrop();
    else console.error("[Main.js] setupDragDrop not defined!");

    if (typeof startNewGame === "function") {
        console.log("[Main.js] Auto-starting first game...");
        startNewGame("DOMContentLoaded Auto-Start");
    } else { console.error("[Main.js] startNewGame not defined! Cannot auto-start."); }

    console.log("[Main.js] DOMContentLoaded END. Final Check Version.");
});
