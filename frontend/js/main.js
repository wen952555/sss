// frontend/js/main.js (调试 startNewGame 调用和按钮点击)
console.log("[Main.js] Loaded - New Layout Version (SNG Call Debug)");

// ... (全局变量和 cacheDOMElements 函数与你上一版本能输出日志的保持一致) ...
// 确保 cacheDOMElements 内部会尝试获取所有我们关心的元素并打印日志
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

let startGameCallCount = 0; // 新增计数器

function cacheDOMElements() {
    console.log("[Main.js] cacheDOMElements START");
    myHandDisplayEl = getElementByIdSafe('myHandDisplay');
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


function startNewGame(triggeredBy = "Unknown") { // 添加参数以追踪调用来源
    startGameCallCount++;
    console.log(`[Main.js] startNewGame CALLED (Count: ${startGameCallCount}, Trigger: ${triggeredBy}).`);

    if (!myHandDisplayEl) { // 再次检查，如果 cacheDOMElements 之前失败
        console.warn("[Main.js] startNewGame: DOM elements not cached. Attempting re-cache.");
        cacheDOMElements();
        if (!myHandDisplayEl) {
            console.error("[Main.js] startNewGame: CRITICAL - DOM elements STILL not cached. Aborting.");
            if(typeof displayMessage === 'function' && arrangementErrorEl) displayMessage(arrangementErrorEl, "错误：页面初始化失败。", true);
            return;
        }
    }
    console.log("[Main.js] startNewGame: Skipping full game logic for this test (SNG Call Debug).");
    if(typeof displayMessage === 'function' && arrangementErrorEl) displayMessage(arrangementErrorEl, `startNewGame (Call #${startGameCallCount}) was triggered by ${triggeredBy}. Full logic skipped.`, false);
}

// --- 其他函数占位 (确保它们被定义) ---
function setupDragDrop() { console.log("[Main.js] setupDragDrop placeholder called."); }
function findCardByIdInPlay(cardId) { /* ... */ return null; }
function moveCardBetweenAreas(card, fromArea, toArea) { /* ... */ }
function checkAndTransitionToMiddleDun() { /* ... */ }
function renderAllAreas() { /* ... */ }
function updateUIDunTypes() { /* ... */ }
function handleSubmitArrangement() { console.log("[Main.js] handleSubmitArrangement placeholder called."); }


// --- 初始化 ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("[Main.js] DOMContentLoaded. (SNG Call Debug)");
    cacheDOMElements();

    if (submitArrangementBtn) {
        console.log("[Main.js] Adding click listener to submitArrangementBtn.");
        submitArrangementBtn.addEventListener('click', handleSubmitArrangement);
    } else {
        console.warn("[Main.js] Submit button (submitArrangementButton) NOT FOUND for event binding.");
    }

    if (newGameBtn) {
        console.log("[Main.js] Adding click listener to newGameBtn. Button element:", newGameBtn);
        newGameBtn.addEventListener('click', function(event) { // 使用匿名函数包装，方便加日志
            console.log("[Main.js] newGameButton CLICKED! Event:", event);
            startNewGame("Button Click"); // 明确调用来源
        });
    } else {
        console.warn("[Main.js] New Game button (newGameButton) NOT FOUND for event binding.");
    }

    if (typeof setupDragDrop === "function") {
        setupDragDrop();
    } else { console.error("[Main.js] setupDragDrop function is not defined!"); }

    // *** 暂时移除页面加载时自动调用 startNewGame ***
    // console.log("[Main.js] Skipping initial call to startNewGame for debugging button click.");
    // if (typeof startNewGame === "function") {
    //     // startNewGame("DOMContentLoaded Auto-Start"); // 如果要保留，也标记来源
    // } else { console.error("[Main.js] startNewGame function not defined!"); }

    console.log("[Main.js] DOMContentLoaded END (SNG Call Debug). Page should be idle, waiting for 'New Game' button click.");
});
