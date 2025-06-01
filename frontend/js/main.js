// frontend/js/main.js (恢复 startNewGame 逻辑)
console.log("[Main.js] Loaded - New Layout Version (Restore SNG Logic)");

// (依赖 card_defs.js, ui.js, game_logic.js)

// --- 全局状态 ---
let humanPlayerHand = [];
let playerArrangement = { head: [], middle: [], tail: [] };
let aiPlayersHands = [[], [], []];
let aiPlayerArrangements = [null, null, null]; // Stores AI's {head, middle, tail, evals, isDaoshui}
let currentDraggedCardData = null;
let currentDragSourceArea = null;

// --- DOM Element References ---
let myHandDisplayEl, headDunEl, tailDunEl, centralAreaTitleEl;
let headDunTypeEl, tailDunTypeEl;
let submitArrangementBtn, newGameBtn;
let arrangementErrorEl, gameResultAreaEl, resultDetailsEl;
let aiPlayerInfoEls = [];

let startGameCallCount = 0;

function cacheDOMElements() {
    console.log("[Main.js] cacheDOMElements START");
    myHandDisplayEl = getElementByIdSafe('myHandDisplay'); // ui.js
    console.log("[Main.js] myHandDisplayEl:", myHandDisplayEl ? "Found" : "NOT FOUND");
    headDunEl = getElementByIdSafe('headDun');
    console.log("[Main.js] headDunEl:", headDunEl ? "Found" : "NOT FOUND");
    tailDunEl = getElementByIdSafe('tailDun');
    console.log("[Main.js] tailDunEl:", tailDunEl ? "Found" : "NOT FOUND");
    centralAreaTitleEl = getElementByIdSafe('centralAreaTitle');
    console.log("[Main.js] centralAreaTitleEl:", centralAreaTitleEl ? "Found" : "NOT FOUND");
    headDunTypeEl = getElementByIdSafe('headDunType');
    console.log("[Main.js] headDunTypeEl:", headDunTypeEl ? "Found" : "NOT FOUND");
    tailDunTypeEl = getElementByIdSafe('tailDunType');
    console.log("[Main.js] tailDunTypeEl:", tailDunTypeEl ? "Found" : "NOT FOUND");
    submitArrangementBtn = getElementByIdSafe('submitArrangementButton');
    console.log("[Main.js] submitArrangementBtn:", submitArrangementBtn ? "Found" : "NOT FOUND");
    newGameBtn = getElementByIdSafe('newGameButton');
    console.log("[Main.js] newGameBtn:", newGameBtn ? "Found" : "NOT FOUND");
    arrangementErrorEl = getElementByIdSafe('arrangementError');
    console.log("[Main.js] arrangementErrorEl:", arrangementErrorEl ? "Found" : "NOT FOUND");
    gameResultAreaEl = getElementByIdSafe('gameResultArea');
    console.log("[Main.js] gameResultAreaEl:", gameResultAreaEl ? "Found" : "NOT FOUND");
    resultDetailsEl = getElementByIdSafe('resultDetails');
    console.log("[Main.js] resultDetailsEl:", resultDetailsEl ? "Found" : "NOT FOUND");
    aiPlayerInfoEls = [];
    for (let i = 0; i < 3; i++) {
        const el = getElementByIdSafe(`aiPlayer${i}Info`);
        aiPlayerInfoEls[i] = el;
        console.log(`[Main.js] aiPlayerInfoEls[${i}]:`, el ? "Found" : "NOT FOUND");
    }
    console.log("[Main.js] cacheDOMElements END");
}


// --- 游戏初始化和流程 ---
function startNewGame(triggeredBy = "Unknown") {
    startGameCallCount++;
    console.log(`[Main.js] startNewGame CALLED (Count: ${startGameCallCount}, Trigger: ${triggeredBy}).`);

    if (!myHandDisplayEl) {
        console.warn("[Main.js] startNewGame: DOM elements not cached yet, attempting to re-cache.");
        cacheDOMElements();
        if (!myHandDisplayEl) {
            console.error("[Main.js] startNewGame: CRITICAL - DOM elements STILL not cached. Aborting.");
            if(typeof displayMessage === 'function' && arrangementErrorEl) displayMessage(arrangementErrorEl, "错误：页面初始化失败，请刷新。", true);
            return;
        }
    }
    console.log("[Main.js] startNewGame: Proceeding with FULL game initialization logic...");

    // 1. 清理UI和状态 (确保函数和DOM元素可用)
    humanPlayerHand = [];
    playerArrangement = { head: [], middle: [], tail: [] };
    aiPlayersHands = [[], [], []]; // 重置AI手牌
    aiPlayerArrangements = [null, null, null]; // 重置AI摆牌

    if (typeof clearElementContent === 'function') {
        clearElementContent('myHandDisplay');
        clearElementContent('headDun');
        clearElementContent('tailDun');
    }
    if (typeof updateDunTypeHTML === 'function') {
        updateDunTypeHTML('head', 'DunType', null);
        updateDunTypeHTML('tail', 'DunType', null);
    }
    if (centralAreaTitleEl) {
        centralAreaTitleEl.innerHTML = '你的手牌 (拖拽摆牌):';
        centralAreaTitleEl.dataset.isMiddleDun = 'false';
        if (myHandDisplayEl) myHandDisplayEl.classList.remove('is-middle-dun-target');
    }
    if (arrangementErrorEl && typeof displayMessage === 'function') displayMessage('arrangementError', '');
    if (gameResultAreaEl) gameResultAreaEl.style.display = 'none';
    if (submitArrangementBtn) {
        submitArrangementBtn.disabled = false; // 重置提交按钮
        submitArrangementBtn.textContent = "提交摆牌"; // 确保文本正确
    }


    // 2. 创建牌堆并发牌 (game_logic.js)
    if (typeof createDeck !== 'function' || typeof shuffleDeck !== 'function' || typeof dealCardsToPlayers !== 'function') {
        console.error("[Main.js] Core game logic functions (createDeck, shuffleDeck, dealCardsToPlayers) are missing!");
        if (arrangementErrorEl) displayMessage('arrangementError', '游戏逻辑加载失败!', true);
        return;
    }
    const deck = getShuffledDeck();
    const allHands = dealCardsToPlayers(deck, 4); // 0: player, 1-3: AIs

    if (!allHands || allHands.length < 4 || !allHands[0] || allHands[0].length < 13) {
        if(arrangementErrorEl) displayMessage('arrangementError', '发牌失败，牌数不足！', true);
        console.error("[Main.js] Dealing cards failed or insufficient cards.");
        return;
    }
    humanPlayerHand = allHands[0];
    aiPlayersHands[0] = allHands[1];
    aiPlayersHands[1] = allHands[2];
    aiPlayersHands[2] = allHands[3];

    console.log("[Main.js] Human hand dealt (new game):", JSON.parse(JSON.stringify(humanPlayerHand.map(c=>c.id)))); // 日志手牌ID
    if (typeof renderCards === 'function') {
        renderCards('myHandDisplay', humanPlayerHand); // ui.js - 渲染手牌
    } else {
        console.error("[Main.js] renderCards function is not defined (expected in ui.js)!");
    }


    // 3. AI 自动摆牌 (game_logic.js)
    if (typeof getSimpleAIArrangement !== 'function' || typeof evaluatePokerHand !== 'function' || typeof checkDaoshui !== 'function') {
        console.error("[Main.js] AI or hand evaluation functions are missing from game_logic.js!");
        return;
    }
    aiPlayersHands.forEach((hand, index) => {
        if (!Array.isArray(hand) || hand.length !== 13) {
            console.error(`[Main.js] AI ${index+1} has invalid hand:`, hand);
            if(aiPlayerInfoEls[index] && typeof updateAIStatusHTML === 'function') updateAIStatusHTML(index, "手牌错误");
            return;
        }
        const arrangement = getSimpleAIArrangement(hand);
        if (arrangement) {
            const headEval = evaluatePokerHand(arrangement.head);
            const middleEval = evaluatePokerHand(arrangement.middle);
            const tailEval = evaluatePokerHand(arrangement.tail);
            const isDaoshui = checkDaoshui(arrangement.head, arrangement.middle, arrangement.tail); // 确保checkDaoshui的参数正确

            aiPlayerArrangements[index] = {
                head: arrangement.head, middle: arrangement.middle, tail: arrangement.tail,
                headEval, middleEval, tailEval, isDaoshui
            };
            if(aiPlayerInfoEls[index] && typeof updateAIStatusHTML === 'function') {
                updateAIStatusHTML(index, isDaoshui ? "已摆牌(倒水)" : "已摆牌");
            }
        } else {
            if(aiPlayerInfoEls[index] && typeof updateAIStatusHTML === 'function') {
                updateAIStatusHTML(index, "摆牌错误!");
            }
        }
    });
    console.log("[Main.js] New game fully initialized and AI has arranged cards.");
}

// ... (拖拽逻辑 findCardByIdInPlay, moveCardBetweenAreas, checkAndTransitionToMiddleDun - 请使用之前能工作的版本) ...
// ... (渲染逻辑 renderAllAreas, updateUIDunTypes - 请使用之前能工作的版本) ...
// ... (提交逻辑 handleSubmitArrangement - 请使用之前能工作的版本) ...
// *** 确保这些函数都已从之前的回复中完整复制过来，并且内部对DOM元素的操作也进行存在性检查 ***
function setupDragDrop() { console.log("[Main.js] setupDragDrop CALLED"); /* ... */ }
function findCardByIdInPlay(cardId) { /* ... */ return null; /* 占位 */}
function moveCardBetweenAreas(card, fromArea, toArea) { /* ... */ }
function checkAndTransitionToMiddleDun() { /* ... */ }
function renderAllAreas() { /* ... */ }
function updateUIDunTypes() { /* ... */ }
function handleSubmitArrangement() { console.log("[Main.js] handleSubmitArrangement CALLED"); /* ... */ }


// --- 初始化 ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("[Main.js] DOMContentLoaded. (Restore SNG Logic)");
    cacheDOMElements();

    if (submitArrangementBtn) {
        console.log("[Main.js] Adding click listener to submitArrangementBtn.");
        submitArrangementBtn.addEventListener('click', handleSubmitArrangement);
    } else {
        console.warn("[Main.js] Submit button (submitArrangementButton) NOT FOUND for event binding.");
    }

    if (newGameBtn) {
        console.log("[Main.js] Adding click listener to newGameBtn. Button element:", newGameBtn);
        newGameBtn.addEventListener('click', function(event) {
            console.log("[Main.js] newGameButton CLICKED! Event:", event);
            if (typeof startNewGame === "function") {
                startNewGame("Button Click");
            } else {
                console.error("[Main.js] startNewGame function not defined on button click!");
            }
        });
    } else {
        console.warn("[Main.js] New Game button (newGameButton) NOT FOUND for event binding.");
    }

    if (typeof setupDragDrop === "function") {
        setupDragDrop();
    } else { console.error("[Main.js] setupDragDrop function is not defined!"); }

    // *** 现在，页面加载完成后会自动调用 startNewGame ***
    if (typeof startNewGame === "function") {
        console.log("[Main.js] Calling startNewGame on DOMContentLoaded...");
        startNewGame("DOMContentLoaded Auto-Start");
    } else { console.error("[Main.js] startNewGame function not defined! Cannot start initial game."); }

    console.log("[Main.js] DOMContentLoaded END (Restore SNG Logic).");
});
